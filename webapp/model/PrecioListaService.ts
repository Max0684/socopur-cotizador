import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Precio de lista por canal, sin depender del cliente (entidad PrecioLista de YUI_COTIZ_SRV, sobre la condicion Z300 / Z200 de la
 * tabla A914). Es REFERENCIAL: el precio de la linea lo calcula SAP para el cliente (entidad Precio). Mayorista = canal 10, Retail = canal 11.
 * Los nombres de campo son los PROPUESTOS por el backend (YC_COTIZ_PRECIOLISTA); se confirman al publicarla.
 */

/** Fila de la entidad PrecioLista (solo vigentes y sin marca de borrado). */
export interface PrecioListaSap {
	Vkorg: string;
	Vtweg: string;
	Matnr: string;
	Kschl: string;
	Knumh?: string;
	Importe?: number | string;
	Moneda?: string;
	/** Por cuantas unidades vale el importe (normalmente 1). */
	Por?: number | string;
	Um?: string;
	/** Inicio de validez (AAAA-MM-DD). */
	Datab?: string;
}

export interface PrecioLista {
	/** Importe por 1 unidad. */
	importe: number;
	moneda: string;
	kschl: string;
}

export interface PreciosDeLista {
	mayorista?: PrecioLista;
	retail?: PrecioLista;
}

/** Condicion preferida: Z300 es la lista base; Z200 solo se usa si falta. */
const PRIORIDAD: Record<string, number> = { Z300: 2, Z200: 1 };

const numero = (v: number | string | undefined): number => {
	const n = Number(v ?? 0);
	return Number.isFinite(n) ? n : 0;
};

/**
 * Elige UN precio entre las filas de un mismo material y canal: gana Z300 sobre Z200; con la misma condicion, el de inicio de validez
 * mas reciente (hay materiales con dos registros vigentes solapados). El importe se lleva a 1 unidad si el precio es "por" varias.
 */
export function elegirPrecioLista(filas: PrecioListaSap[]): PrecioLista | undefined {
	const ordenadas = [...filas].sort((a, b) => (PRIORIDAD[b.Kschl] ?? 0) - (PRIORIDAD[a.Kschl] ?? 0) || (b.Datab ?? "").localeCompare(a.Datab ?? ""));
	const f = ordenadas[0];
	if (!f) {
		return undefined;
	}
	const por = numero(f.Por) || 1;
	return { importe: numero(f.Importe) / por, moneda: f.Moneda || "PEN", kschl: f.Kschl };
}

/** Agrupa las filas por material y arma el precio mayorista (canal 10) y retail (canal 11) de cada uno. */
export function preciosPorMaterial(filas: PrecioListaSap[]): Record<string, PreciosDeLista> {
	const grupos = new Map<string, PrecioListaSap[]>();
	filas.forEach((f) => {
		const clave = `${f.Matnr}|${f.Vtweg}`;
		grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
	});
	const res: Record<string, PreciosDeLista> = {};
	grupos.forEach((lista, clave) => {
		const [matnr, canal] = clave.split("|");
		const precio = elegirPrecioLista(lista);
		if (!precio || (canal !== "10" && canal !== "11")) {
			return;
		}
		res[matnr] = { ...res[matnr], [canal === "10" ? "mayorista" : "retail"]: precio };
	});
	return res;
}

/** "S/ 65.30" o "US$ 12.00"; sin precio, una raya. */
export function textoPrecioLista(p: PrecioLista | undefined): string {
	if (!p) {
		return "—";
	}
	const simbolo = p.moneda === "PEN" ? "S/" : p.moneda === "USD" ? "US$" : p.moneda;
	return `${simbolo} ${p.importe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** $filter: organizacion, canales 10 y 11 y la lista de materiales (maximo 50 por consulta). */
export function filtroPrecioLista(vkorg: string, matnrs: string[]): string {
	const materiales = matnrs.slice(0, 50).map((m) => `Matnr eq '${comillas(m)}'`).join(" or ");
	return `Vkorg eq '${comillas(vkorg)}' and (Vtweg eq '10' or Vtweg eq '11') and (${materiales})`;
}

/** true si la entidad PrecioLista ya esta en el $metadata del servicio (mientras no este, las columnas no se muestran). */
export async function precioListaDisponible(modelo: ODataModel): Promise<boolean> {
	try {
		return (await modelo.getMetaModel().requestObject("/PrecioLista")) !== undefined;
	} catch {
		return false;
	}
}

/** Precios de lista mayorista y retail de hasta 50 materiales en una sola consulta. */
export async function cargarPreciosLista(modelo: ODataModel, vkorg: string, matnrs: string[]): Promise<Record<string, PreciosDeLista>> {
	if (matnrs.length === 0) {
		return {};
	}
	const filas = await modelo.bindList("/PrecioLista", undefined, undefined, undefined, { $filter: filtroPrecioLista(vkorg, matnrs) }).requestContexts(0, 500);
	return preciosPorMaterial(filas.map((c) => c.getObject() as PrecioListaSap));
}
