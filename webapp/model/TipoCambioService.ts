import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Tipo de cambio de la cabecera de la oferta: el de SAP (tipo M de TCURR, el que mantiene Tesoreria), el mismo con el que SAP
 * calcula el precio. Lo entrega la entidad TipoCambio (YC_COTIZ_TIPOCAMBIO).
 */
export interface TipoCambio {
	/** Soles por 1 dolar. */
	cambio: number;
	/** Fecha del registro de SAP que aplica (aaaa-mm-dd). */
	desde: string;
}

interface TipoCambioSap {
	Cambio?: string | number;
	VigenteDesde?: string;
	Mensaje?: string;
}

/** El servicio publica el tipo de cambio de SAP (desde el 29/10/2026). */
export function tipoCambioPublicado(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "TipoCambio", "Cambio");
}

/** Tipo de cambio de dolares a soles en la fecha (aaaa-mm-dd; sin fecha, el de hoy). Falla con el motivo de SAP si no lo tiene. */
export async function leerTipoCambio(modelo: ODataModel, fecha?: string): Promise<TipoCambio> {
	const filtro = /^\d{4}-\d{2}-\d{2}$/.test(fecha ?? "") ? `Moneda eq 'USD' and MonedaLocal eq 'PEN' and Fecha eq ${fecha}` : "Moneda eq 'USD' and MonedaLocal eq 'PEN'";
	const contextos = await modelo.bindList("/TipoCambio", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 1);
	const fila = (contextos[0]?.getObject() ?? {}) as TipoCambioSap;
	const cambio = Number(fila.Cambio);
	if (!Number.isFinite(cambio) || cambio <= 0) {
		throw new Error(fila.Mensaje || "SAP no devolvió el tipo de cambio");
	}
	return { cambio, desde: fila.VigenteDesde ?? "" };
}

/** Texto del tipo de cambio como lo muestra la cabecera: hasta 4 decimales, sin ceros de relleno (3.406). */
export function tipoCambioTexto(cambio: number): string {
	return String(Math.round(cambio * 10000) / 10000);
}
