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
