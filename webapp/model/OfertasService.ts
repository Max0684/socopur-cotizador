import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { Cotizacion, Item } from "./odata/Entidades";

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
}

type CotizacionConLineas = Cotizacion & { _Item?: Pick<Item, "Cantidad" | "PrecioLista">[] };

const formatoImporte = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Total de la oferta = suma de cantidad x precio de lista de sus lineas (las bonificaciones traen precio 0). */
function sumarTotal(lineas: CotizacionConLineas["_Item"]): number {
	return (lineas ?? []).reduce((suma, l) => suma + Number(l.Cantidad ?? 0) * Number(l.PrecioLista ?? 0), 0);
}

/**
 * Lee las cotizaciones ACTIVAS (no borradores) del servicio YUI_COTIZ_SRV y las adapta a la lista del prototipo.
 * - "numero" es el de la primera oferta SAP (grupo 01); si todavia no se genero, queda vacio.
 * - El total se suma aqui con las lineas ($expand), porque el servicio no lo entrega.
 * - "doc" usa STCD1 y, si esta vacio, STCD2 (por confirmar cual guarda DNI y cual RUC en Socopur).
 */
export async function cargarOfertas(modelo: ODataModel, textoPedido: string): Promise<OfertaLista[]> {
	const binding = modelo.bindList("/Cotizacion", undefined, undefined, undefined, {
		$select: "CotizId,Estado,LocalCreatedAt,ClienteNombre,ClienteStcd1,ClienteStcd2,NumeroOferta,NumeroPedido,VigenciaHasta",
		$expand: { _Item: { $select: "Cantidad,PrecioLista" } },
		$filter: "IsActiveEntity eq true",
		$orderby: "LocalCreatedAt desc"
	});
	const contextos = await binding.requestContexts(0, 200);
	return contextos.map((contexto) => {
		const c = contexto.getObject() as CotizacionConLineas;
		const conPedido = Boolean(c.NumeroPedido);
		return {
			cotizId: c.CotizId,
			numero: c.NumeroOferta ?? "",
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
	precio: number;
	total: number;
	bonificacion: boolean;
	sinTalla: boolean;
	origen: string;
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
	lineas: LineaDetalle[];
}

/**
 * Lee el documento SAP de una oferta (cabecera y posiciones reales, incluidas las lineas de regalo que SAP
 * agrega solo). Una linea es regalo cuando cuelga de otra (UEPOS distinto de 000000) y su valor neto es 0.
 */
export async function cargarDetalleOferta(modelo: ODataModel, numeroOferta: string): Promise<DetalleOferta> {
	const clave = numeroOferta.replace(/'/g, "''");
	const contexto = modelo.bindContext(`/Oferta('${clave}')`, undefined, { $expand: { _Pos: { $orderby: "Posnr" } } });
	const o = (await contexto.requestObject()) as OfertaSap;
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
			total: Number(p.Netwr ?? 0),
			bonificacion: esRegalo,
			sinTalla: esRegalo,
			origen: p.Posnr
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
		lineas
	};
}
