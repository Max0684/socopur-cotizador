import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type Context from "sap/ui/model/odata/v4/Context";
import type { Cotizacion, Grupo, GrupoEstado, Item, ItemCar, Material } from "./odata/Entidades";
import { entidadTieneCampo } from "./CamposServicio";

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

/**
 * Entrega de la cabecera. Con envio (01) viajan el destinatario WE (cliente + numero de direccion) y, si hay, el transportista ZT.
 * AddrnumberWe "$" = direccion de un solo uso: su texto va en una fila Direc con rol WE. El transportista que solo es proveedor (SP) no se
 * envia: el servicio aun no publica ese campo.
 */
export interface EntregaParaGuardar {
	/** 01 envio, 02 recojo. */
	tipo: "01" | "02";
	kunnrWe?: string;
	addrnumberWe?: string;
	/** Solo con addrnumberWe "$": nombre y calle de la direccion de un solo uso. */
	direccionUnica?: { nombre: string; calle: string };
	kunnrZt?: string;
	addrnumberZt?: string;
}

export interface OfertaParaGuardar {
	kunnr: string;
	moneda: string;
	/** Forma de pago elegida (p. ej. C000 contado, C030 credito). Vacia = SAP usa la del maestro del cliente. */
	zterm?: string;
	/** Vendedor responsable (PERNR): SAP lo guarda como interlocutor VE del documento. Solo se envia si el servicio publica el campo. */
	pernr?: string;
	/** Condicion de expedicion (VSBED: 01 envio, 02 recojo) elegida en la pantalla; con ella SAP determina el punto de expedicion. */
	vsbed?: string;
	entrega?: EntregaParaGuardar;
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

/** AddrnumberWe de una direccion de un solo uso: el servicio la toma de la fila Direc con rol WE. */
export const ENVIO_UNICO = "$";

/** Campos de entrega de la cabecera. Recojo no lleva destinatario ni transportista. */
export function camposEntrega(e: EntregaParaGuardar | undefined): Record<string, string> {
	if (!e) {
		return {};
	}
	const campos: Record<string, string> = { TipoEntrega: e.tipo };
	if (e.tipo === "01" && e.kunnrWe && e.addrnumberWe) {
		campos.KunnrWe = e.kunnrWe;
		campos.AddrnumberWe = e.addrnumberWe;
	}
	if (e.tipo === "01" && e.kunnrZt) {
		campos.KunnrZt = e.kunnrZt;
		campos.AddrnumberZt = e.addrnumberZt ?? "";
	}
	return campos;
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

/**
 * Posicion del ultimo marcador "[<prefijo> <grupo>]" que SAP deja en el Comentario de la cotizacion, o -1 si no esta. El numero de grupo se compara
 * sin ceros a la izquierda: el servicio entrega GrupoNo "1" y los jobs escriben "[Anular grupo 01]" (visto en la prueba real del 13/10/2026).
 */
export function posicionMarcador(comentario: string, prefijo: string, grupoNo: string): number {
	const numero = grupoNo.replace(/^0+(?=\d)/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const patron = new RegExp(`\\[${prefijo} 0*${numero}\\]`, "g");
	let ultimo = -1;
	for (let r = patron.exec(comentario); r; r = patron.exec(comentario)) {
		ultimo = r.index;
	}
	return ultimo;
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
	// Un campo desconocido en el create hace que SAP rechace toda la oferta: el PERNR viaja solo si el $metadata ya lo trae.
	const conPernr = !!datos.pernr && (await entidadTieneCampo(modelo, "Cotizacion", "Pernr"));
	const conVsbed = !!datos.vsbed && (await entidadTieneCampo(modelo, "Cotizacion", "Vsbed"));
	// Un campo desconocido en el create haria rechazar toda la oferta: la entrega viaja solo si el $metadata ya trae los campos WE/ZT.
	const entrega = datos.entrega && (await entidadTieneCampo(modelo, "Cotizacion", "AddrnumberWe")) ? datos.entrega : undefined;
	const cabecera = raiz.create(
		{
			Kunnr: datos.kunnr,
			Waers: datos.moneda,
			Comentario: datos.comentario,
			...(datos.zterm ? { Zterm: datos.zterm } : {}),
			...(conPernr ? { Pernr: datos.pernr } : {}),
			...(conVsbed ? { Vsbed: datos.vsbed } : {}),
			...camposEntrega(entrega)
		},
		true
	);
	await cabecera.created();
	const cotizId = (cabecera.getObject() as Cotizacion).CotizId;
	let activada = false;
	try {
		if (entrega?.addrnumberWe === ENVIO_UNICO && entrega.direccionUnica) {
			// SAP copia estos datos al interlocutor WE del pedido (la fila Direc con rol WE).
			await crearHija(modelo, "_Direc", cabecera, {
				PartnRole: "WE",
				Name1: entrega.direccionUnica.nombre.slice(0, 40),
				Street: entrega.direccionUnica.calle.slice(0, 60),
				Country: "PE"
			});
		}
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
		throw new OfertaEnProcesoError("La oferta sigue en proceso en SAP. Revisala en unos minutos desde la lista de ofertas.");
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
	const leerComentario = async (): Promise<string> =>
		(
			(await modelo
				.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, { $select: "Comentario", $$ownRequest: true })
				.requestObject()) as Pick<Cotizacion, "Comentario">
		).Comentario ?? "";
	// El Estado del grupo queda en "P" tanto si el pedido se crea como si SAP lo rechaza: el fallo solo se ve en el Comentario de la cotizacion.
	const comentarioAntes = await leerComentario().catch(() => "");
	const operacion = modelo.bindContext(`${ruta}/${NS}.crearPedido(...)`);
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
	let grupo = operacion.getBoundContext().getObject() as Grupo;
	// Un pedido de vehiculo se crea en segundo plano en SAP (Estado P = pedido en proceso): se espera a que aparezca su numero.
	if (grupo?.Estado === ESTADO_PEDIDO_EN_PROCESO && !grupo.VbelnPedido) {
		const intervalo = espera.intervaloMs ?? 2500;
		const maximo = espera.maximoMs ?? 60000;
		const pausa = espera.pausa ?? pausaReal;
		for (let transcurrido = 0, vuelta = 0; transcurrido < maximo; transcurrido += intervalo, vuelta++) {
			await pausa(intervalo);
			grupo = (await modelo.bindContext(ruta, undefined, { $select: "GrupoNo,Estado,VbelnPedido,Liberacion", $$ownRequest: true }).requestObject()) as Grupo;
			if (grupo.VbelnPedido || grupo.Estado !== ESTADO_PEDIDO_EN_PROCESO) {
				break;
			}
			// Sin numero de pedido todavia: si SAP dejo un motivo de rechazo del pedido de ESTE grupo, no se espera mas. Si el comentario es
			// el mismo de antes (un intento anterior del mismo grupo) se confirma tras dos vueltas, para no tomar un error viejo por nuevo.
			const comentario = await leerComentario().catch(() => "");
			const desde = posicionMarcador(comentario, "Pedido grupo", grupoNo);
			if (desde >= 0 && (comentario !== comentarioAntes || vuelta >= 2)) {
				throw new Error(comentario.slice(desde));
			}
		}
		if (!grupo.VbelnPedido && grupo.Estado === ESTADO_PEDIDO_EN_PROCESO) {
			throw new OfertaEnProcesoError("El pedido sigue en proceso en SAP. Revisalo en unos minutos desde la lista de ofertas.");
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
 * bloqueo de facturacion (FAKSK) y Liberado ("X" si el credito no esta en B y no hay bloqueo de entrega ni de facturacion; desde el 09/10/2026 la vista tambien mira FAKSK).
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

/** Estados del grupo que deja la anulacion: Y = por anular (job en curso), X = anulado, R = revisar (el job se detuvo). */
export type EstadoAnulacion = "Y" | "X" | "R";

export interface ResultadoAnulacion {
	estado: EstadoAnulacion;
	/** Motivo del fallo que el job deja en el Comentario de la cotizacion ("[Anular grupo NN] ..."); vacio si no hay. */
	mensaje: string;
}

/**
 * Anula el pedido de un grupo y rechaza su oferta (accion anularGrupo). SAP lo hace en segundo plano: la accion deja el grupo en Y
 * y el job lo pasa a X (listo) o R (revisar). Se sondea el Estado hasta que cambie o se agote la espera.
 * SIN PROBAR contra SAP desde el front.
 */
export async function anularGrupo(modelo: ODataModel, cotizId: string, grupoNo: string, motivo: string, espera: EsperaOfertas = {}): Promise<ResultadoAnulacion> {
	const ruta = `/Grupo(CotizId=${cotizId},GrupoNo='${grupoNo.replace(/'/g, "''")}',IsActiveEntity=true)`;
	const operacion = modelo.bindContext(`${ruta}/${NS}.anularGrupo(...)`);
	operacion.setParameter("Motivo", motivo.slice(0, 200));
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
	const intervalo = espera.intervaloMs ?? 3000;
	// El job puede esperar ~1 min en la cola del planificador y despues revertir VELO (hasta 30 s) y rechazar pedido y oferta.
	const maximo = espera.maximoMs ?? 180000;
	const pausa = espera.pausa ?? pausaReal;
	let estado = (operacion.getBoundContext().getObject() as Grupo | undefined)?.Estado ?? "Y";
	for (let transcurrido = 0; estado === "Y" && transcurrido < maximo; transcurrido += intervalo) {
		await pausa(intervalo);
		estado = ((await modelo.bindContext(ruta, undefined, { $select: "GrupoNo,Estado", $$ownRequest: true }).requestObject()) as Grupo).Estado;
	}
	let mensaje = "";
	if (estado === "R") {
		try {
			const c = (await modelo.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, { $select: "Comentario", $$ownRequest: true }).requestObject()) as Pick<Cotizacion, "Comentario">;
			const texto = c.Comentario ?? "";
			const desde = posicionMarcador(texto, "Anular grupo", grupoNo);
			mensaje = desde >= 0 ? texto.slice(desde).trim() : "";
		} catch {
			mensaje = "";
		}
	}
	return { estado: estado === "X" ? "X" : estado === "R" ? "R" : "Y", mensaje };
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
	/** Solo en leerVinsGrupo: centro, organizacion y canal del grupo, y cantidad (para buscar los VIN libres del vehiculo). */
	werks?: string;
	vkorg?: string;
	vtweg?: string;
	cantidad?: number;
	/** Estado del vinculo con VELO (Item.VinculoEstado): P, V, E o vacio; undefined si el servicio aun no lo publica. */
	vinculo?: string;
}

/** VIN libre que SAP ofrece para un vehiculo (entidad Vehiculo). */
export interface VinLibre {
	vhcle: string;
	vin: string;
	color: string;
	condicion: string;
	anio: string;
	variante: string;
	almacen: string;
	/** aaaa-mm-dd; fecha de ingreso (creacion del lote). Vacia si el servicio aun no la expone. */
	ingreso: string;
}

const comillasOdata = (t: string): string => t.replace(/'/g, "''");

/**
 * VIN libres de un material en un centro, del mas antiguo al mas nuevo (misma regla que asignarVin: fecha de ingreso y luego Vhcle).
 * IngresoFecha se pide aparte: si el servicio aun no lo expone se reintenta sin ella y el orden queda por Vhcle.
 */
export async function leerVinsLibres(modelo: ODataModel, f: { vkorg: string; vtweg: string; matnr: string; werks: string; variante?: string }): Promise<VinLibre[]> {
	const filtro = [`Vkorg eq '${comillasOdata(f.vkorg)}'`, `Vtweg eq '${comillasOdata(f.vtweg)}'`, `Matnr eq '${comillasOdata(f.matnr)}'`, `Werks eq '${comillasOdata(f.werks)}'`, ...(f.variante ? [`Variante eq '${comillasOdata(f.variante)}'`] : [])].join(" and ");
	const base = "Vhcle,Vhvin,ColorTxt,Color,Condicion,AnoModelo,Variante,Lgort";
	const leer = async (seleccion: string) =>
		(await modelo.bindList("/Vehiculo", undefined, undefined, undefined, { $filter: filtro, $select: seleccion, $orderby: "Vhcle" }).requestContexts(0, 500)).map(
			(c) => c.getObject() as Record<string, unknown>
		);
	let filas: Record<string, unknown>[];
	try {
		filas = await leer(`${base},IngresoFecha`);
	} catch {
		filas = await leer(base);
	}
	return filas
		.map((o) => ({
			vhcle: String(o.Vhcle ?? ""),
			vin: String(o.Vhvin ?? ""),
			color: String(o.ColorTxt || o.Color || ""),
			condicion: String(o.Condicion ?? ""),
			anio: String(o.AnoModelo ?? ""),
			variante: String(o.Variante ?? ""),
			almacen: String(o.Lgort ?? ""),
			ingreso: String(o.IngresoFecha ?? "").slice(0, 10)
		}))
		.sort((a, b) => (a.ingreso || "9999").localeCompare(b.ingreso || "9999") || a.vhcle.localeCompare(b.vhcle));
}

const claveItem = (cotizId: string, posnr: string): string => `/Item(CotizId=${cotizId},Posnr='${posnr.replace(/'/g, "''")}',IsActiveEntity=true)`;

function vinDeItem(i: Partial<Item> & { Vhvin?: string; ColorTxt?: string; Color?: string; Variante?: string }): VinAsignado {
	return {
		...(i.VinculoEstado === undefined ? {} : { vinculo: String(i.VinculoEstado).trim() }),
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
	// VinculoEstado se pide solo si el $metadata ya lo publica: un campo desconocido en $select haria fallar toda la lectura.
	const conVinculo = await entidadTieneCampo(modelo, "Item", "VinculoEstado");
	const items = (
		await modelo
			.bindList(`${cotizacion}/_Item`, undefined, undefined, undefined, {
				$filter: filtro,
				$select: `Posnr,Matnr,Cantidad,Werks,Vhcle,Vhvin,Color,ColorTxt,Variante${conVinculo ? ",VinculoEstado" : ""}`,
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
	return items.filter((i) => vehiculos.has(String(i.Matnr))).map((i) => ({ ...vinDeItem(i), werks: String(i.Werks ?? ""), vkorg: area.Vkorg, vtweg: area.Vtweg, cantidad: Number(i.Cantidad ?? 1) }));
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

/** Estado final del vinculo de un VIN con VELO: V vinculado, E error, P todavia en proceso. */
export type EstadoVinculo = "V" | "E" | "P";

/**
 * Espera a que el proceso de fondo termine de vincular cada VIN del grupo con VELO (acciones ZLOR + ZTIR). `leer` devuelve los VIN del grupo con
 * su Item.VinculoEstado. Un VIN con vinculo vacio se trata como pendiente: entre asignarVin y su guardado hay una ventana en que aun no esta
 * registrado. Si se acaba el tiempo, los que sigan en proceso quedan como "P" (no es un error: el proceso puede estar terminando).
 * Devuelve el estado por posicion (solo las que tienen VIN).
 */
export async function esperarVinculos(leer: () => Promise<VinAsignado[]>, espera: EsperaOfertas = {}): Promise<Map<string, EstadoVinculo>> {
	const intervalo = espera.intervaloMs ?? 3000;
	// El proceso de fondo puede esperar ~1 min en la cola del planificador antes de arrancar (visto en la prueba real: 53 s).
	const maximo = espera.maximoMs ?? 120000;
	const pausa = espera.pausa ?? pausaReal;
	const resultado = new Map<string, EstadoVinculo>();
	for (let transcurrido = 0; ; transcurrido += intervalo) {
		resultado.clear();
		for (const i of (await leer()).filter((x) => x.vhcle)) {
			resultado.set(i.posnr, i.vinculo === "V" ? "V" : i.vinculo === "E" ? "E" : "P");
		}
		if (resultado.size === 0 || [...resultado.values()].every((e) => e !== "P") || transcurrido >= maximo) {
			return resultado;
		}
		await pausa(intervalo);
	}
}

/** Motivo del fallo de vinculo o de Z1 que el proceso de fondo deja en el Comentario de la cotizacion; vacio si no hay. */
export async function leerMotivoVinculo(modelo: ODataModel, cotizId: string): Promise<string> {
	try {
		const c = (await modelo.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, { $select: "Comentario", $$ownRequest: true }).requestObject()) as Pick<Cotizacion, "Comentario">;
		const texto = c.Comentario ?? "";
		const desde = texto.indexOf("[Vinculo VIN");
		return desde >= 0 ? texto.slice(desde).trim() : "";
	} catch {
		return "";
	}
}
