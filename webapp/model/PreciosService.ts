import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import type { Precio } from "./odata/Entidades";

/** Lo que se pregunta al servicio de precios (entidad Precio de YUI_COTIZ_SRV, que llama a Z_FM_SD_GET_CONDICIONES). */
export interface ConsultaPrecio {
	kunnr: string;
	vkorg: string;
	vtweg: string;
	spart: string;
	auart: string;
	matnr: string;
	werks: string;
	cantidad: number;
	waers: "PEN" | "USD";
	/** aaaa-mm-dd; vacia = hoy. */
	fecha?: string;
	/** Solo vehiculos: variante (modelo + condicion + ano + color); el precio sale de ella, con Matnr = el modelo. */
	varcond?: string;
}

/** Precio real de SAP: en la moneda pedida SAP ya convierte, no hace falta un tipo de cambio en el front. */
export interface PrecioSap {
	moneda: string;
	precioLista: number;
	precioUnitario: number;
	neto: number;
	impuestos: number;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/**
 * Arma el $filter de la entidad Precio. Todos los filtros van con "eq" (el servicio los exige); la cantidad es numerica.
 */
export function filtroPrecio(c: ConsultaPrecio): string {
	const partes = [
		`Kunnr eq '${comillas(c.kunnr)}'`,
		`Vkorg eq '${comillas(c.vkorg)}'`,
		`Vtweg eq '${comillas(c.vtweg)}'`,
		`Spart eq '${comillas(c.spart)}'`,
		`Auart eq '${comillas(c.auart)}'`,
		`Matnr eq '${comillas(c.matnr)}'`,
		`Werks eq '${comillas(c.werks)}'`,
		`Cantidad eq ${Number(c.cantidad)}`,
		`Waers eq '${c.waers}'`
	];
	if (c.fecha) {
		partes.push(`Fecha eq ${c.fecha}`);
	}
	if (c.varcond) {
		partes.push(`Varcond eq '${comillas(c.varcond)}'`);
	}
	return partes.join(" and ");
}

/**
 * Pide el precio a SAP. Lanza un Error con el mensaje del servicio si SAP no pudo calcular el precio
 * (Respuesta distinta de 0, p. ej. "Sin precio para ..."): el llamador decide que mostrar, nunca se inventa un precio.
 * Verificado por OData en DS4/130: SFX428H-150-MTK x100, canal 10 -> PEN 17.50 y USD 5.14 por unidad.
 */
export async function consultarPrecio(modelo: ODataModel, consulta: ConsultaPrecio): Promise<PrecioSap> {
	const lista = modelo.bindList("/Precio", undefined, undefined, undefined, { $filter: filtroPrecio(consulta) });
	const contextos = await lista.requestContexts(0, 1);
	const fila = contextos[0]?.getObject() as Precio | undefined;
	if (!fila) {
		throw new Error("SAP no devolvio precio");
	}
	if (Number(fila.Respuesta) !== 0) {
		throw new Error(fila.Mensaje || "SAP no pudo calcular el precio");
	}
	// Un precio unitario de cero es "sin precio": SAP no encontro condicion de precio vigente (p. ej. el Z300 del canal esta borrado) y
	// el documento saldria con valor 0. Se trata como error para no generar ofertas y pedidos en cero.
	if (!(Number(fila.PrecioUnitario) > 0)) {
		throw new Error("SAP no encontró un precio vigente para este material en este canal");
	}
	return {
		moneda: fila.Moneda,
		precioLista: Number(fila.PrecioLista),
		precioUnitario: Number(fila.PrecioUnitario),
		neto: Number(fila.Neto),
		impuestos: Number(fila.Impuestos)
	};
}

/** Fila de la entidad PrecioCond: una condicion de la simulacion de precios de SAP para la linea. */
export interface CondicionSap {
	CondType: string;
	/** Importe de esa condicion para TODA la linea (KWERT), en la moneda pedida. */
	Total?: string | number;
}

export interface ImpuestosLinea {
	igv: number;
	isc: number;
}

const redondear2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * IGV (condicion ZIGV) e ISC (ZISC) de una linea, sumando el Total de cada condicion. Se usa Total (importe de la linea) y NO Valor:
 * en los porcentajes el valor sale dividido por 10 (18 % aparece como 1.8).
 */
export function impuestosDeCondiciones(condiciones: CondicionSap[]): ImpuestosLinea {
	const suma = (tipo: string): number => redondear2(condiciones.filter((c) => c.CondType === tipo).reduce((a, c) => a + (Number(c.Total) || 0), 0));
	return { igv: suma("ZIGV"), isc: suma("ZISC") };
}

/**
 * IGV e ISC estimados de una linea ANTES de guardar: la misma simulacion de precios de SAP que se usa al crear el documento (cliente,
 * centro, organizacion, canal, clase y cantidad). Es una estimacion; el valor final es el del documento.
 */
export async function consultarImpuestos(modelo: ODataModel, consulta: ConsultaPrecio): Promise<ImpuestosLinea> {
	const filas = await modelo.bindList("/PrecioCond", undefined, undefined, undefined, { $filter: filtroPrecio(consulta) }).requestContexts(0, 100);
	return impuestosDeCondiciones(filas.map((c) => c.getObject() as CondicionSap));
}
