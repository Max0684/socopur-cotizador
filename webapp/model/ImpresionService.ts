import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";
import type { DatosVehiculo } from "./ImpresionVehiculo";

/**
 * PDF oficial de la oferta: SAP lo genera con su formulario ZFRSD_COTIVTA (el mismo que imprimia el cotizador anterior) y lo
 * entrega en la entidad OfertaPdf, en base64. Solo existe para ofertas ya grabadas en SAP.
 */
export interface PdfOferta {
	numero: string;
	nombre: string;
	bytes: Uint8Array<ArrayBuffer>;
}

interface OfertaPdfSap {
	Vbeln?: string;
	Pdf?: string;
	Nombre?: string;
	Mensaje?: string;
}

/** El servicio publica el PDF de SAP (desde el 29/10/2026). */
export function pdfPublicado(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "OfertaPdf", "Pdf");
}

/** Numeros de oferta SAP, sin repetir y en orden: los de las ofertas guardadas en esta pantalla y el de la oferta abierta. */
export function numerosParaImprimir(guardadas: { numero?: string }[], abierta: string): string[] {
	const numeros = [...guardadas.map((o) => o.numero ?? ""), abierta].map((n) => n.trim()).filter((n) => /^\d{1,10}$/.test(n));
	return [...new Set(numeros)];
}

/** Base64 o base64url (Edm.Binary de OData V4) a bytes. */
export function base64ABytes(texto: string): Uint8Array<ArrayBuffer> {
	const normal = texto.replace(/-/g, "+").replace(/_/g, "/");
	const binario = atob(normal + "=".repeat((4 - (normal.length % 4)) % 4));
	return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

/** El servicio publica OfertaImpresion: dice si la oferta es de vehiculos y trae los datos de su formato (desde el 29/10/2026). */
export function impresionPublicada(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "OfertaImpresion", "Datos");
}

/** Formato que lleva la oferta: V vehiculos (con sus datos) o R repuestos (PDF de SAP). */
export async function leerImpresion(modelo: ODataModel, numero: string): Promise<{ tipo: "V" | "R"; datos?: DatosVehiculo }> {
	const contextos = await modelo
		.bindList("/OfertaImpresion", undefined, undefined, undefined, { $filter: `Vbeln eq '${numero.replace(/'/g, "''")}'` })
		.requestContexts(0, 1);
	const fila = (contextos[0]?.getObject() ?? {}) as { Tipo?: string; Datos?: string; Mensaje?: string };
	if (fila.Mensaje) {
		throw new Error(fila.Mensaje);
	}
	return fila.Tipo === "V" && fila.Datos ? { tipo: "V", datos: JSON.parse(fila.Datos) as DatosVehiculo } : { tipo: "R" };
}

/** PDF de una oferta SAP. Falla con el motivo de SAP si no lo pudo generar. */
export async function leerPdfOferta(modelo: ODataModel, numero: string): Promise<PdfOferta> {
	const contextos = await modelo
		.bindList("/OfertaPdf", undefined, undefined, undefined, { $filter: `Vbeln eq '${numero.replace(/'/g, "''")}'` })
		.requestContexts(0, 1);
	const fila = (contextos[0]?.getObject() ?? {}) as OfertaPdfSap;
	if (!fila.Pdf) {
		throw new Error(fila.Mensaje || `SAP no devolvió el PDF de la oferta ${numero}`);
	}
	return { numero, nombre: fila.Nombre || `Oferta ${numero}.pdf`, bytes: base64ABytes(fila.Pdf) };
}
