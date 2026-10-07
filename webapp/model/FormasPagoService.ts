import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Formas de pago de SAP (entidad FormaPago de YUI_COTIZ_SRV, sobre las condiciones de pago T052 con su texto en espanol). Reemplaza la lista fija
 * de dos opciones del prototipo. Los nombres de campo son los PROPUESTOS; se confirman cuando el servicio publique la entidad.
 */
export interface FormaPagoSap {
	Zterm: string;
	Texto?: string;
	/** Dias de plazo (0 = contado). */
	Dias?: number | string;
	/** "X" si la condicion es de contado. */
	EsContado?: string;
}

export interface OpcionFormaPago {
	key: string;
	text: string;
	contado: boolean;
}

/** Contado primero y luego por dias de plazo; dentro de cada plazo, por codigo. Texto "C000 Contado". */
export function opcionesDeFormasPago(filas: FormaPagoSap[]): OpcionFormaPago[] {
	const dias = (f: FormaPagoSap): number => Number(f.Dias) || 0;
	const esContado = (f: FormaPagoSap): boolean => f.EsContado === "X" || (f.EsContado === undefined && dias(f) === 0);
	return [...filas]
		.filter((f) => f.Zterm)
		.sort((a, b) => Number(esContado(b)) - Number(esContado(a)) || dias(a) - dias(b) || a.Zterm.localeCompare(b.Zterm))
		.map((f) => ({ key: f.Zterm, text: f.Texto ? `${f.Zterm} ${f.Texto}`.trim() : f.Zterm, contado: esContado(f) }));
}

/**
 * Lee las formas de pago de SAP. Devuelve null si el servicio aun no publica la entidad (el llamador deja la lista de antes) o si la lectura
 * falla: nunca inventa condiciones de pago.
 */
export async function cargarFormasPago(modelo: ODataModel): Promise<OpcionFormaPago[] | null> {
	if (!(await entidadTieneCampo(modelo, "FormaPago", "Zterm"))) {
		return null;
	}
	try {
		const filas = (await modelo.bindList("/FormaPago", undefined, undefined, undefined, { $orderby: "Zterm" }).requestContexts(0, 200)).map((c) => c.getObject() as FormaPagoSap);
		const opciones = opcionesDeFormasPago(filas);
		return opciones.length ? opciones : null;
	} catch {
		return null;
	}
}
