import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type Context from "sap/ui/model/odata/v4/Context";
import type { Cotizacion, Grupo, GrupoEstado, Item, ItemCar, Material } from "./odata/Entidades";

const NS = "com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001";

/** Linea del carrito tal como la necesita el servicio. Las lineas de regalo ZNA0 NO se envian: SAP las genera solo. */
export interface LineaParaGuardar {
	material: string;
	cantidad: number;
	um: string;
	centro: string;
	almacen: string;
	precio: number;
	/** Solo vehiculos: se guarda como caracteristica ZVARIANTE de la posicion (asignarVin la usa para proponer el VIN). */
	variante?: string;
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
	/** Forma de pago elegida (p. ej. C000 contado, C030 credito). Vacia = SAP usa la del maestro del cliente. */
	zterm?: string;
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

async function crearHijaCtx(modelo: ODataModel, ruta: string, padre: Context, datos: Record<string, unknown>): Promise<Context> {
	const contexto = modelo.bindList(ruta, padre).create(datos, true);
	await contexto.created();
	return contexto;
}

/** Grupo.Estado de un grupo cuya oferta (o pedido) se esta creando en segundo plano. */
const ESTADO_EN_PROCESO = "Q";
/** Grupo.Estado de un grupo cuyo pedido se esta creando en segundo plano. */
const ESTADO_PEDIDO_EN_PROCESO = "P";

/** Caracteristica donde asignarVin busca la variante del vehiculo (ItemCar.Atnam). */
export const ATNAM_VARIANTE = "ZVARIANTE";

/**
 * Guarda el carrito en SAP, en el mismo orden que la prueba verificada (VSP/prueba-cotizacion-completa.ps1):
 * 1) cabecera en borrador, 2) un grupo por oferta, 3) las lineas de cada grupo, 4) Activate, 5) generarOfertas,
 * 6) lee de vuelta los numeros reales (Grupo.VbelnOferta).
 * Si algo falla antes de activar, descarta el borrador para no dejar basura.
 * SIN PROBAR contra SAP desde el front: la verificacion es con ?odata=1 y autorizacion del usuario.
 */
export interface EsperaOfertas {
	/** Cada cuanto se vuelve a leer el estado de los grupos en proceso (ms). */
	intervaloMs?: number;
	/** Tiempo maximo de espera (ms). */
	maximoMs?: number;
	/** Pausa entre lecturas; se puede reemplazar en las pruebas. */
	pausa?: (ms: number) => Promise<void>;
}

/** La oferta se esta creando en segundo plano y no termino en el tiempo de espera: no es un fallo, hay que revisarla despues. */
export class OfertaEnProcesoError extends Error {}

const pausaReal = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

export async function guardarCotizacion(modelo: ODataModel, datos: OfertaParaGuardar, espera: EsperaOfertas = {}): Promise<ResultadoGuardado> {
	const raiz = modelo.bindList("/Cotizacion");
	const cabecera = raiz.create(
		{ Kunnr: datos.kunnr, Waers: datos.moneda, Comentario: datos.comentario, ...(datos.zterm ? { Zterm: datos.zterm } : {}) },
		true
	);
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
				const item = await crearHijaCtx(modelo, "_Item", cabecera, {
					GrupoNo: grupo.GrupoNo,
					Matnr: l.material,
					Cantidad: decimal(l.cantidad),
					Meins: l.um,
					Werks: l.centro,
					Lgort: l.almacen,
					PrecioLista: decimal(l.precio),
					Waers: datos.moneda
				});
				if (l.variante) {
					// CotizId y Posnr los toma el servicio del item padre: no se mandan.
					await crearHija<ItemCar>(modelo, "_Car", item, { Atnam: ATNAM_VARIANTE, Atwrt: l.variante });
				}
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
	const leer = async () =>
		(await modelo
			.bindContext(activa, undefined, { $select: "CotizId,Comentario", $expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,Estado", $orderby: "GrupoNo" } }, $$ownRequest: true })
			.requestObject()) as Cotizacion & { _Grupo?: Pick<Grupo, "GrupoNo" | "VbelnOferta" | "Estado">[] };
	let leido = await leer();
	// Los grupos con vehiculo se crean en segundo plano en SAP (Estado Q = oferta en proceso): se espera a que terminen.
	const intervalo = espera.intervaloMs ?? 2500;
	const maximo = espera.maximoMs ?? 60000;
	const pausa = espera.pausa ?? pausaReal;
	for (let transcurrido = 0; (leido._Grupo ?? []).some((g) => g.Estado === ESTADO_EN_PROCESO) && transcurrido < maximo; transcurrido += intervalo) {
		await pausa(intervalo);
		leido = await leer();
	}
	if ((leido._Grupo ?? []).some((g) => g.Estado === ESTADO_EN_PROCESO)) {
		throw new OfertaEnProcesoError("La oferta del vehiculo sigue en proceso en SAP. Revisala en unos minutos desde la lista de ofertas.");
	}
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
export async function crearPedidoGrupo(modelo: ODataModel, cotizId: string, grupoNo: string, espera: EsperaOfertas = {}): Promise<PedidoGenerado> {
	const ruta = `/Grupo(CotizId=${cotizId},GrupoNo='${grupoNo.replace(/'/g, "''")}',IsActiveEntity=true)`;
	const operacion = modelo.bindContext(`${ruta}/${NS}.crearPedido(...)`);
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
	let grupo = operacion.getBoundContext().getObject() as Grupo;
	// Un pedido de vehiculo se crea en segundo plano en SAP (Estado P = pedido en proceso): se espera a que aparezca su numero.
	if (grupo?.Estado === ESTADO_PEDIDO_EN_PROCESO && !grupo.VbelnPedido) {
		const intervalo = espera.intervaloMs ?? 2500;
		const maximo = espera.maximoMs ?? 60000;
		const pausa = espera.pausa ?? pausaReal;
		for (let transcurrido = 0; transcurrido < maximo; transcurrido += intervalo) {
			await pausa(intervalo);
			grupo = (await modelo.bindContext(ruta, undefined, { $select: "GrupoNo,Estado,VbelnPedido,Liberacion", $$ownRequest: true }).requestObject()) as Grupo;
			if (grupo.VbelnPedido || grupo.Estado !== ESTADO_PEDIDO_EN_PROCESO) {
				break;
			}
		}
		if (!grupo.VbelnPedido && grupo.Estado === ESTADO_PEDIDO_EN_PROCESO) {
			throw new OfertaEnProcesoError("El pedido del vehiculo sigue en proceso en SAP. Revisalo en unos minutos desde la lista de ofertas.");
		}
	}
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

/** VIN asignado a una posicion de vehiculo (Item.Vhcle y los datos del vehiculo que expone el servicio). */
export interface VinAsignado {
	posnr: string;
	material: string;
	vhcle: string;
	vin: string;
	color: string;
	variante: string;
}

const claveItem = (cotizId: string, posnr: string): string => `/Item(CotizId=${cotizId},Posnr='${posnr.replace(/'/g, "''")}',IsActiveEntity=true)`;

function vinDeItem(i: Partial<Item> & { Vhvin?: string; ColorTxt?: string; Color?: string; Variante?: string }): VinAsignado {
	return {
		posnr: String(i.Posnr ?? ""),
		material: String(i.Matnr ?? ""),
		vhcle: String(i.Vhcle ?? ""),
		vin: String(i.Vhvin ?? ""),
		color: String(i.ColorTxt || i.Color || ""),
		variante: String(i.Variante ?? "")
	};
}

/**
 * Items del grupo que son vehiculos de SAP (material de tipo ZVEH) con su VIN actual (vacio si aun no se asigno). El Item del servicio no
 * trae el tipo de material: se lee de Material con la organizacion y el canal del grupo.
 */
export async function leerVinsGrupo(modelo: ODataModel, cotizId: string, grupoNo: string): Promise<VinAsignado[]> {
	const cotizacion = `/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`;
	const filtro = `GrupoNo eq '${grupoNo.replace(/'/g, "''")}'`;
	const items = (
		await modelo
			.bindList(`${cotizacion}/_Item`, undefined, undefined, undefined, {
				$filter: filtro,
				$select: "Posnr,Matnr,Vhcle,Vhvin,Color,ColorTxt,Variante",
				$orderby: "Posnr"
			})
			.requestContexts(0, 200)
	).map((c) => c.getObject() as Item);
	if (items.length === 0) {
		return [];
	}
	const area = (await modelo.bindList(`${cotizacion}/_Grupo`, undefined, undefined, undefined, { $filter: filtro, $select: "Vkorg,Vtweg" }).requestContexts(0, 1))[0]?.getObject() as
		| Pick<Grupo, "Vkorg" | "Vtweg">
		| undefined;
	if (!area) {
		return [];
	}
	const comillas = (t: string): string => t.replace(/'/g, "''");
	const matnrs = [...new Set(items.map((i) => String(i.Matnr)))];
	const materiales = (
		await modelo
			.bindList("/Material", undefined, undefined, undefined, {
				$filter: `Vkorg eq '${comillas(area.Vkorg)}' and Vtweg eq '${comillas(area.Vtweg)}' and (${matnrs.map((m) => `Matnr eq '${comillas(m)}'`).join(" or ")})`,
				$select: "Matnr,Mtart"
			})
			.requestContexts(0, 200)
	).map((c) => c.getObject() as Pick<Material, "Matnr" | "Mtart">);
	const vehiculos = new Set(materiales.filter((m) => m.Mtart === "ZVEH").map((m) => m.Matnr));
	return items.filter((i) => vehiculos.has(String(i.Matnr))).map(vinDeItem);
}

/**
 * asignarVin sobre un Item de una cotizacion ACTIVA con pedido creado. Sin vhcle el sistema propone el VIN mas antiguo del mismo
 * modelo, centro y variante; con vhcle se valida el elegido. Siempre se manda el cuerpo, aunque vaya vacio.
 * Un rechazo de SAP llega como error HTTP con el mensaje de negocio. SIN PROBAR contra SAP desde el front.
 */
export async function asignarVinItem(modelo: ODataModel, cotizId: string, posnr: string, vhcle?: string): Promise<VinAsignado> {
	const operacion = modelo.bindContext(`${claveItem(cotizId, posnr)}/${NS}.asignarVin(...)`);
	operacion.setParameter("Vhcle", vhcle ?? "");
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
	return vinDeItem(operacion.getBoundContext().getObject() as Item);
}

/** liberarVin: libera el VIN (el bloqueo pasa a L) para poder asignar otro. Usar siempre antes de borrar una linea con VIN. */
export async function liberarVinItem(modelo: ODataModel, cotizId: string, posnr: string): Promise<void> {
	const operacion = modelo.bindContext(`${claveItem(cotizId, posnr)}/${NS}.liberarVin(...)`);
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
}

export interface VigenciaGrupo {
	grupoNo: string;
	vbelnOferta: string;
	/** aaaa-mm-dd */
	vigenciaHasta: string;
}

export interface ResultadoRenovar {
	grupos: VigenciaGrupo[];
	/** Motivo cuando SAP no pudo cambiar la oferta en el guardado (prefijo "[Renovar grupo NN]"); vacio si todo salio bien. */
	error: string;
}

/**
 * renovar sobre una cotizacion ACTIVA: extiende la validez de cada oferta sin pedido (hoy + dias de vigencia de SAP). Los grupos con
 * pedido se omiten. Si el BAPI falla en el guardado SAP deja el motivo en Cotizacion.Comentario con el prefijo "[Renovar grupo NN]",
 * por eso se vuelve a leer. Lanza el error si ningun grupo se puede renovar. SIN PROBAR contra SAP desde el front.
 */
export async function renovarCotizacion(modelo: ODataModel, cotizId: string): Promise<ResultadoRenovar> {
	const activa = `/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`;
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await modelo.bindContext(`${activa}/${NS}.renovar(...)`).execute("$auto", true);
	const leido = (await modelo
		.bindContext(activa, undefined, { $select: "CotizId,Comentario", $expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,VigenciaHasta", $orderby: "GrupoNo" } }, $$ownRequest: true })
		.requestObject()) as Cotizacion & { _Grupo?: Pick<Grupo, "GrupoNo" | "VbelnOferta" | "VigenciaHasta">[] };
	const comentario = leido.Comentario ?? "";
	return {
		grupos: (leido._Grupo ?? []).map((g) => ({ grupoNo: g.GrupoNo, vbelnOferta: g.VbelnOferta, vigenciaHasta: g.VigenciaHasta ?? "" })),
		error: /\[Renovar grupo/.test(comentario) ? comentario : ""
	};
}
