import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Context from "sap/ui/model/odata/v4/Context";
import type { Cotizacion, Grupo, GrupoEstado, Item } from "./odata/Entidades";

const NS = "com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001";

/** Linea del carrito tal como la necesita el servicio. Las lineas de regalo ZNA0 NO se envian: SAP las genera solo. */
export interface LineaParaGuardar {
	material: string;
	cantidad: number;
	um: string;
	centro: string;
	almacen: string;
	precio: number;
}

/** Un grupo del carrito = una oferta SAP (organizacion de ventas + sector). */
export interface GrupoParaGuardar {
	vkorg: string;
	vtweg: string;
	spart: string;
	vkbur: string;
	claseOferta: string;
	clasePedido: string;
	modalidad: string;
	lineas: LineaParaGuardar[];
}

export interface OfertaParaGuardar {
	kunnr: string;
	moneda: string;
	comentario: string;
	grupos: GrupoParaGuardar[];
}

export interface OfertaGenerada {
	grupoNo: string;
	vbelnOferta: string;
}

export interface ResultadoGuardado {
	cotizId: string;
	ofertas: OfertaGenerada[];
}

/** El servicio recibe los decimales como texto (cabecera IEEE754Compatible del modelo V4). */
function decimal(valor: number): string {
	return String(valor);
}

/** Crea una entidad hija (relativa a la cotizacion en borrador) y devuelve lo que SAP calculo al crearla. */
async function crearHija<T>(modelo: ODataModel, ruta: string, padre: Context, datos: Record<string, unknown>): Promise<T> {
	const lista = modelo.bindList(ruta, padre);
	const contexto = lista.create(datos, true);
	await contexto.created();
	return contexto.getObject() as T;
}

/**
 * Guarda el carrito en SAP, en el mismo orden que la prueba verificada (VSP/prueba-cotizacion-completa.ps1):
 * 1) cabecera en borrador, 2) un grupo por oferta, 3) las lineas de cada grupo, 4) Activate, 5) generarOfertas,
 * 6) lee de vuelta los numeros reales (Grupo.VbelnOferta).
 * Si algo falla antes de activar, descarta el borrador para no dejar basura.
 * SIN PROBAR contra SAP desde el front: la verificacion es con ?odata=1 y autorizacion del usuario.
 */
export async function guardarCotizacion(modelo: ODataModel, datos: OfertaParaGuardar): Promise<ResultadoGuardado> {
	const raiz = modelo.bindList("/Cotizacion");
	const cabecera = raiz.create({ Kunnr: datos.kunnr, Waers: datos.moneda, Comentario: datos.comentario }, true);
	await cabecera.created();
	const cotizId = (cabecera.getObject() as Cotizacion).CotizId;
	let activada = false;
	try {
		for (const g of datos.grupos) {
			const grupo = await crearHija<Grupo>(modelo, "_Grupo", cabecera, {
				Vkorg: g.vkorg,
				Vtweg: g.vtweg,
				Spart: g.spart,
				Vkbur: g.vkbur,
				AuartOferta: g.claseOferta,
				AuartPedido: g.clasePedido,
				Modalidad: g.modalidad
			});
			for (const l of g.lineas) {
				await crearHija<Item>(modelo, "_Item", cabecera, {
					GrupoNo: grupo.GrupoNo,
					Matnr: l.material,
					Cantidad: decimal(l.cantidad),
					Meins: l.um,
					Werks: l.centro,
					Lgort: l.almacen,
					PrecioLista: decimal(l.precio),
					Waers: datos.moneda
				});
			}
		}
		// If-Match: * (ignorar ETag), igual que la prueba verificada.
		// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
		await modelo.bindContext(`${NS}.Activate(...)`, cabecera).execute("$auto", true);
		activada = true;
	} catch (error) {
		if (!activada) {
			await descartarBorrador(modelo, cabecera);
		}
		throw error;
	}

	const activa = `/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`;
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await modelo.bindContext(`${activa}/${NS}.generarOfertas(...)`).execute("$auto", true);
	const leido = (await modelo
		.bindContext(activa, undefined, { $select: "CotizId,Comentario", $expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,Estado", $orderby: "GrupoNo" } } })
		.requestObject()) as Cotizacion & { _Grupo?: Pick<Grupo, "GrupoNo" | "VbelnOferta" | "Estado">[] };
	const ofertas = (leido._Grupo ?? []).map((g) => ({ grupoNo: g.GrupoNo, vbelnOferta: g.VbelnOferta }));
	// generarOfertas no falla cuando SAP rechaza la oferta: deja el motivo en Comentario y el grupo sin numero.
	if (ofertas.length === 0 || ofertas.some((o) => !o.vbelnOferta)) {
		throw new Error(leido.Comentario || "SAP no genero la oferta");
	}
	return { cotizId, ofertas };
}

export interface PedidoGenerado {
	vbelnPedido: string;
	estado: string;
	liberacion: string;
}

/**
 * Crea el pedido de un grupo (accion crearPedido sobre el grupo ACTIVO que ya tiene oferta), como la prueba
 * verificada VSP/crear-pedido-prueba.ps1. Devuelve el numero real del pedido (Grupo.VbelnPedido).
 * Igual que generarOfertas, un rechazo de SAP no da error HTTP: el grupo vuelve sin pedido y el motivo queda
 * en el Comentario de la cotizacion. Solo repuestos: los vehiculos necesitan asignarVin, que aun no esta conectado.
 * SIN PROBAR contra SAP desde el front.
 */
export async function crearPedidoGrupo(modelo: ODataModel, cotizId: string, grupoNo: string): Promise<PedidoGenerado> {
	const ruta = `/Grupo(CotizId=${cotizId},GrupoNo='${grupoNo.replace(/'/g, "''")}',IsActiveEntity=true)`;
	const operacion = modelo.bindContext(`${ruta}/${NS}.crearPedido(...)`);
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
	const grupo = operacion.getBoundContext().getObject() as Grupo;
	if (!grupo?.VbelnPedido) {
		const cabecera = (await modelo
			.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, { $select: "Comentario", $$ownRequest: true })
			.requestObject()) as Pick<Cotizacion, "Comentario">;
		throw new Error(cabecera.Comentario || "SAP no genero el pedido");
	}
	return { vbelnPedido: grupo.VbelnPedido, estado: grupo.Estado, liberacion: grupo.Liberacion };
}

/**
 * Estado real del pedido de un grupo (vista YC_COTIZ_GRUPOESTADO sobre VBAK): credito (CMGST), bloqueo de entrega (LIFSK),
 * bloqueo de facturacion (FAKSK) y Liberado ("X" si el credito no esta en B y no hay bloqueo de entrega).
 * Devuelve null si no se puede leer: el llamador debe mostrar "sin informacion" y no inventar un estado.
 */
export async function leerEstadoPedido(modelo: ODataModel, cotizId: string, grupoNo: string): Promise<GrupoEstado | null> {
	try {
		const ruta = `/GrupoEstado(CotizId=${cotizId},GrupoNo='${grupoNo.replace(/'/g, "''")}')`;
		return (await modelo.bindContext(ruta, undefined, { $$ownRequest: true }).requestObject()) as GrupoEstado;
	} catch {
		return null;
	}
}

/** Mejor esfuerzo: si el descarte falla se deja el error original, que es el que importa al usuario. */
async function descartarBorrador(modelo: ODataModel, cabecera: Context): Promise<void> {
	try {
		// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
		await modelo.bindContext(`${NS}.Discard(...)`, cabecera).execute("$auto", true);
	} catch {
		// el borrador queda en SAP; se limpia desde la aplicacion de borradores
	}
}
