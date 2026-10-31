import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { Cotizacion, Item } from "./odata/Entidades";
import type { CondicionServicio } from "./Condiciones";
import { entidadTieneCampo } from "./CamposServicio";
import { motivoOfertaFallida, precioFinalDePosicion } from "./Reglas";

/** Forma que usa hoy la lista de ofertas del prototipo (mock.json: /ofertas). */
export interface OfertaLista {
	numero: string;
	cliente: string;
	doc: string;
	fecha: string;
	total: string;
	/** Texto ya traducido; la vista y Main.controller recalculan vigente/vencida a partir de la fecha. */
	estado: string;
	estadoState: string;
	vence?: string;
	/** Clave real de la cotizacion en el servicio (UUID). */
	cotizId: string;
	/** La oferta esta anulada: el flujo de anulacion dejo su grupo en X o SAP la tiene rechazada (Abstk = C). */
	anulada: boolean;
	/** Sin numero de oferta porque SAP la rechazo (grupo en E): el motivo, o "" si no se guardo. Sin valor si no fallo. */
	motivoError?: string;
	/** Sin numero de oferta todavia: el proceso de fondo la esta creando (grupo en Q). */
	enProceso?: boolean;
}

type CotizacionConLineas = Cotizacion & { _Item?: Pick<Item, "Cantidad" | "PrecioLista">[]; _Grupo?: { GrupoNo: string; VbelnOferta: string; Estado: string }[] };

const formatoImporte = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** El servicio devuelve el numero de oferta sin ceros a la izquierda (0095004056 llega como 95004056); SAP lo guarda con 10 digitos. */
function numeroSap(numero: string | undefined): string {
	return /^\d{1,9}$/.test(numero ?? "") ? (numero as string).padStart(10, "0") : (numero ?? "");
}

/** Total de la oferta = suma de cantidad x precio de lista de sus lineas (las bonificaciones traen precio 0). */
function sumarTotal(lineas: CotizacionConLineas["_Item"]): number {
	return (lineas ?? []).reduce((suma, l) => suma + Number(l.Cantidad ?? 0) * Number(l.PrecioLista ?? 0), 0);
}

/** Numeros de oferta que SAP tiene rechazadas por completo (Oferta.Rechazada = X). Si el servicio aun no publica el campo o falla, queda vacio. */
async function ofertasRechazadasEnSap(modelo: ODataModel, numeros: string[]): Promise<Set<string>> {
	const rechazadas = new Set<string>();
	if (numeros.length === 0 || !(await entidadTieneCampo(modelo, "Oferta", "Rechazada"))) {
		return rechazadas;
	}
	const unicos = [...new Set(numeros)];
	try {
		// Por tandas: un filtro con 200 numeros haria la URL demasiado larga.
		for (let i = 0; i < unicos.length; i += 30) {
			const filtro = `Rechazada eq 'X' and (${unicos.slice(i, i + 30).map((n) => `Vbeln eq '${n.replace(/'/g, "''")}'`).join(" or ")})`;
			const filas = await modelo.bindList("/Oferta", undefined, undefined, undefined, { $select: "Vbeln,Rechazada", $filter: filtro }).requestContexts(0, 30);
			filas.forEach((f) => rechazadas.add(numeroSap((f.getObject() as { Vbeln: string }).Vbeln)));
		}
	} catch {
		// informativo: sin esto la oferta se ve como antes
	}
	return rechazadas;
}

/**
 * Lee las cotizaciones ACTIVAS (no borradores) del vendedor indicado del servicio YUI_COTIZ_SRV y las adapta a la lista del prototipo.
 * - "numero" es el de la primera oferta SAP (grupo 01); si todavia no se genero, queda vacio.
 * - El total se suma aqui con las lineas ($expand), porque el servicio no lo entrega.
 * - "doc" usa STCD1 y, si esta vacio, STCD2 (por confirmar cual guarda DNI y cual RUC en Socopur).
 */
export async function cargarOfertas(modelo: ODataModel, textoPedido: string, pernr?: string): Promise<OfertaLista[]> {
	// Solo las del vendedor identificado (PERNR de 8 digitos, como lo guarda el servicio); sin vendedor no se filtra.
	const deVendedor = pernr ? ` and Pernr eq '${pernr.replace(/'/g, "''")}'` : "";
	const binding = modelo.bindList("/Cotizacion", undefined, undefined, undefined, {
		$select: "CotizId,Estado,LocalCreatedAt,ClienteNombre,ClienteStcd1,ClienteStcd2,NumeroOferta,NumeroPedido,VigenciaHasta,Comentario",
		$expand: { _Item: { $select: "Cantidad,PrecioLista" }, _Grupo: { $select: "GrupoNo,VbelnOferta,Estado" } },
		$filter: `IsActiveEntity eq true${deVendedor}`,
		$orderby: "LocalCreatedAt desc"
	});
	const contextos = await binding.requestContexts(0, 200);
	const cotizaciones = contextos.map((contexto) => contexto.getObject() as CotizacionConLineas);
	const rechazadasSap = await ofertasRechazadasEnSap(modelo, cotizaciones.map((c) => numeroSap(c.NumeroOferta)).filter(Boolean));
	return cotizaciones.map((c) => {
		const conPedido = Boolean(c.NumeroPedido);
		// Anulada por el flujo del Cotizador (grupo en X, que conserva el numero de oferta) o rechazada directamente en SAP.
		const anulada = (c._Grupo ?? []).some((g) => g.Estado === "X" && numeroSap(g.VbelnOferta) === numeroSap(c.NumeroOferta)) || rechazadasSap.has(numeroSap(c.NumeroOferta));
		// Sin numero de oferta la lista mostraba "N° ·": o SAP la rechazo (grupo en E, el motivo queda en el comentario) o aun se esta creando (Q).
		const sinNumero = !numeroSap(c.NumeroOferta);
		const fallida = sinNumero && (c._Grupo ?? []).some((g) => g.Estado === "E");
		return {
			anulada,
			...(fallida ? { motivoError: motivoOfertaFallida(c.Comentario) } : {}),
			enProceso: sinNumero && !fallida && (c._Grupo ?? []).some((g) => g.Estado === "Q"),
			cotizId: c.CotizId,
			numero: numeroSap(c.NumeroOferta),
			cliente: c.ClienteNombre ?? "",
			doc: c.ClienteStcd1 || c.ClienteStcd2 || "",
			fecha: (c.LocalCreatedAt ?? "").slice(0, 10),
			total: formatoImporte.format(sumarTotal(c._Item)),
			estado: conPedido ? textoPedido : "",
			estadoState: conPedido ? "Information" : "None",
			vence: c.VigenciaHasta
		};
	});
}

/* ---------- Detalle de una oferta SAP (vistas YI_COTIZ_OFERTA / YI_COTIZ_OFERTAPOS) ---------- */

interface OfertaPosSap {
	Vbeln: string;
	Posnr: string;
	Matnr: string;
	Arktx: string;
	Kwmeng: string | number;
	Vrkme: string;
	Werks: string;
	Lgort: string;
	Netpr: string | number;
	Netwr: string | number;
	Waerk: string;
	Uepos: string;
	Pstyv: string;
	/** Impuesto de la posicion en SAP (VBAP-MWSBP) y tasa de IGV en porcentaje (18.00 = 18 %). */
	Mwsbp?: string | number;
	TasaIgv?: string | number;
	/** ISC (ZISC) e IGV (ZIGV) de la posicion, por separado; Mwsbp es la suma de ambos. */
	Isc?: string | number;
	Igv?: string | number;
	_Cond?: CondicionPosSap[];
}

/** Condicion de precio guardada en el documento (entidad OfertaPosCond: VBAP + PRCD_ELEMENTS). */
interface CondicionPosSap {
	Stunr: string;
	Zaehk: string;
	Kschl: string;
	Descripcion?: string;
	Krech?: string;
	Kbetr?: string | number;
	Waers?: string;
	Kpein?: string | number;
	Kmein?: string;
	Kwert?: string | number;
	Waerk?: string;
	Kstat?: string | boolean;
	Kinak?: string | boolean;
	Kherk?: string;
}

/**
 * Pasa una condicion del documento al formato de la simulacion (PrecioCond) para reutilizar la misma tabla.
 * La vista entrega el porcentaje directo (18 % = 18.0, descuentos con signo negativo), igual que hoy la simulacion: se copia tal cual,
 * como el importe de las demas condiciones (Condiciones.porcentajeDe lo muestra).
 * En los porcentajes Waers viene vacio: la moneda es la del documento (Waerk). Manual = origen 'C'.
 */
/** Marca de SAP como texto: el servicio entrega los indicadores como "X" o como booleano segun el campo (de ahi el error "trim is not a function"). */
function marca(valor: unknown): string {
	return valor === true || (typeof valor === "string" && valor.trim() !== "") ? "X" : "";
}

function condicionDeDocumento(c: CondicionPosSap): CondicionServicio {
	return {
		CondType: c.Kschl,
		Descripcion: c.Descripcion,
		Valor: c.Kbetr,
		Moneda: c.Waers,
		UmPrecio: c.Kpein,
		Unidad: c.Kmein,
		Total: c.Kwert,
		MonedaDoc: c.Waerk,
		Manual: c.Kherk === "C" ? "X" : "",
		Estadistica: marca(c.Kstat),
		Paso: c.Stunr,
		Contador: c.Zaehk,
		TipoCalculo: c.Krech,
		Inactiva: marca(c.Kinak)
	};
}

interface OfertaSap {
	Vbeln: string;
	Auart: string;
	Kunnr: string;
	ClienteNombre?: string;
	Erdat?: string;
	Angdt?: string;
	Bnddt?: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Vkbur: string;
	Netwr: string | number;
	Waerk: string;
	/** "X" si SAP tiene la oferta rechazada por completo (Abstk = C). */
	Rechazada?: string;
	_Pos?: OfertaPosSap[];
}

/** Linea del detalle con la forma que usa la pantalla (LineaMock + total). */
export interface LineaDetalle {
	grupo: string;
	orgVentas: string;
	sector: string;
	material: string;
	denominacion: string;
	detalle: string;
	cantidad: number;
	/** Neto unitario de SAP (Netpr), sin impuestos: es lo que se muestra como precio de la posicion del documento. */
	precio: number;
	/** Precio unitario con impuestos (neto + ISC + IGV): el que se guarda si la oferta se graba otra vez. */
	precioFinal?: number;
	total: number;
	bonificacion: boolean;
	sinTalla: boolean;
	/** "P" + Posnr de la posicion; en un regalo, origen es el de la posicion de la que cuelga (UEPOS), igual que en el carrito. */
	uid: string;
	origen: string;
	/** Impuesto (IGV) real de SAP para esta posicion. */
	impuesto: number;
	tasaIgv: number;
	/** ISC e IGV por separado; sin valor si el servicio no los devuelve. */
	isc?: number;
	igvImporte?: number;
	/** Valor neto + ISC + IGV de la linea; sin valor si el servicio no trae el desglose. */
	totalConImpuestos?: number;
	/** Condiciones de precio guardadas en SAP para la posicion; sin valor si el servicio aun no publica OfertaPosCond. */
	condicionesSap?: CondicionServicio[];
}

export interface DetalleOferta {
	numero: string;
	cliente: string;
	kunnr: string;
	clase: string;
	fecha: string;
	valida: string;
	moneda: string;
	total: number;
	orgVentas: string;
	sector: string;
	/** La oferta esta rechazada en SAP. */
	rechazada: boolean;
	lineas: LineaDetalle[];
}

/**
 * Lee el documento SAP de una oferta (cabecera y posiciones reales, incluidas las lineas de regalo que SAP
 * agrega solo). Una linea es regalo cuando cuelga de otra (UEPOS distinto de 000000) y su valor neto es 0.
 */
export async function cargarDetalleOferta(modelo: ODataModel, numeroOferta: string): Promise<DetalleOferta> {
	const clave = numeroOferta.replace(/'/g, "''");
	// Las condiciones son informativas: si el servicio no publica _Cond (o falla), se lee la oferta sin ellas.
	const leer = async (conCondiciones: boolean): Promise<OfertaSap> => {
		const contexto = modelo.bindContext(`/Oferta('${clave}')`, undefined, {
			$expand: { _Pos: conCondiciones ? { $orderby: "Posnr", $expand: { _Cond: {} } } : { $orderby: "Posnr" } }
		});
		return (await contexto.requestObject()) as OfertaSap;
	};
	const o = await leer(true).catch((error: Error) => {
		console.warn(`[Cotizador] condiciones de la oferta ${numeroOferta}: ${error.message}`);
		return leer(false);
	});
	const lineas = (o._Pos ?? []).map((p): LineaDetalle => {
		const esRegalo = Boolean(p.Uepos) && Number(p.Uepos) !== 0 && Number(p.Netwr ?? 0) === 0;
		return {
			grupo: `${o.Vkorg}/${o.Spart}`,
			orgVentas: o.Vkorg,
			sector: o.Spart,
			material: p.Matnr,
			denominacion: p.Arktx,
			detalle: "",
			cantidad: Number(p.Kwmeng ?? 0),
			precio: Number(p.Netpr ?? 0),
			precioFinal: precioFinalDePosicion(Number(p.Netwr ?? 0), Number(p.Mwsbp ?? 0), Number(p.Kwmeng ?? 0)),
			total: Number(p.Netwr ?? 0),
			bonificacion: esRegalo,
			sinTalla: esRegalo,
			uid: `P${p.Posnr}`,
			origen: esRegalo ? `P${p.Uepos}` : "",
			impuesto: Number(p.Mwsbp ?? 0),
			tasaIgv: Number(p.TasaIgv ?? 0),
			isc: p.Isc === undefined || p.Isc === null ? undefined : Number(p.Isc),
			igvImporte: p.Igv === undefined || p.Igv === null ? undefined : Number(p.Igv),
			condicionesSap: p._Cond?.map(condicionDeDocumento),
			totalConImpuestos: p.Isc === undefined || p.Isc === null || p.Igv === undefined || p.Igv === null ? undefined : Math.round((Number(p.Netwr ?? 0) + Number(p.Isc) + Number(p.Igv)) * 100) / 100
		};
	});
	return {
		numero: o.Vbeln,
		cliente: o.ClienteNombre ?? "",
		kunnr: o.Kunnr,
		clase: o.Auart,
		fecha: (o.Erdat ?? "").slice(0, 10),
		valida: (o.Bnddt ?? "").slice(0, 10),
		moneda: o.Waerk,
		total: Number(o.Netwr ?? 0),
		orgVentas: o.Vkorg,
		sector: o.Spart,
		rechazada: o.Rechazada === "X",
		lineas
	};
}
