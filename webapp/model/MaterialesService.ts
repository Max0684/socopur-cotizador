import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Busqueda de materiales en SAP (entidad Material de YUI_COTIZ_SRV, vista YC_COTIZ_MATERIAL).
 * SIN PROBAR contra el servicio: los nombres de los campos son los del DISENO de sapiens-48 (02/10/2026) y la entidad
 * todavia no esta en el $metadata. Hasta que exista, el buscador usa el catalogo de ejemplo y lo avisa en pantalla.
 */

/** Filtros de la pantalla de busqueda (los vacios no se envian). */
export interface FiltrosMaterial {
	vkorg: string;
	vtweg: string;
	linea?: string;
	clase?: string;
	familia?: string;
	codigo?: string;
	descripcion?: string;
	texto?: string;
	sector?: string;
	marca?: string;
}

/** Fila del servicio (campos del diseno). */
export interface MaterialSap {
	Matnr: string;
	Maktx: string;
	Meins: string;
	Matkl?: string;
	Segmento1?: string;
	Segmento2?: string;
	Segmento3?: string;
	DescLinea?: string;
	DescClase?: string;
	DescFamilia?: string;
	Marca?: string;
	Spart?: string;
	SpartCabecera?: string;
	Mtart?: string;
	Vmsta?: string;
}

/** Fila con la forma que usa hoy la tabla de resultados de repuestos. El stock y el precio llegan aparte. */
export interface FilaRepuestoSap {
	material: string;
	denominacion: string;
	marca: string;
	linea: string;
	clase: string;
	familia: string;
	sector: string;
	sectorTxt: string;
	sectorOferta: string;
	orgVentas: string;
	um: string;
	grupo: string;
	origen: "sap";
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** true si la entidad Material ya esta en el $metadata del servicio. */
export async function materialesDisponibles(modelo: ODataModel): Promise<boolean> {
	try {
		return (await modelo.getMetaModel().requestObject("/Material")) !== undefined;
	} catch {
		return false;
	}
}

/** $filter de la entidad Material: organizacion y canal son obligatorios; el resto solo si viene informado. */
export function filtroMateriales(f: FiltrosMaterial): string {
	const partes = [`Vkorg eq '${comillas(f.vkorg)}'`, `Vtweg eq '${comillas(f.vtweg)}'`];
	if (f.linea) {
		partes.push(`Segmento1 eq '${comillas(f.linea)}'`);
	}
	if (f.clase) {
		partes.push(`Segmento2 eq '${comillas(f.clase)}'`);
	}
	if (f.familia) {
		partes.push(`Segmento3 eq '${comillas(f.familia)}'`);
	}
	if (f.sector) {
		partes.push(`Spart eq '${comillas(f.sector)}'`);
	}
	if (f.marca) {
		partes.push(`Marca eq '${comillas(f.marca)}'`);
	}
	if (f.codigo) {
		partes.push(`contains(Matnr,'${comillas(f.codigo.toUpperCase())}')`);
	}
	if (f.descripcion) {
		partes.push(`contains(Maktx,'${comillas(f.descripcion.toUpperCase())}')`);
	}
	return partes.join(" and ");
}

/** Convierte una fila del servicio a la fila que muestra la tabla de repuestos. */
/** `sectorCab` es la regla del sector de cabecera por canal (Reglas.sectorDeCabecera); sin ella se usa el sector del material. */
export function filaDeMaterial(m: MaterialSap, vkorg: string, vtweg: string, sectorCab: (canal: string, sector: string) => string = (_c, sector) => sector): FilaRepuestoSap {
	return {
		material: m.Matnr,
		denominacion: m.Maktx,
		marca: m.Marca ?? "",
		linea: m.Segmento1 ?? "",
		clase: m.Segmento2 ?? "",
		familia: m.Segmento3 ?? "",
		sector: m.Spart ?? "",
		sectorTxt: "",
		// Si el servicio no calcula el sector de cabecera, se usa la regla probada (canales 11, 14 y 99 -> 99).
		sectorOferta: m.SpartCabecera || sectorCab(vtweg, m.Spart ?? ""),
		orgVentas: vkorg,
		um: m.Meins,
		grupo: "Repuestos y accesorios",
		origen: "sap"
	};
}

/** Busca materiales en SAP (maximo 50 por pagina, orden por codigo). Lanza el error del servicio si falla. */
export async function buscarMateriales(modelo: ODataModel, filtros: FiltrosMaterial, sectorCab?: (canal: string, sector: string) => string, pagina = 0, tamano = 50): Promise<FilaRepuestoSap[]> {
	const lista = modelo.bindList("/Material", undefined, undefined, undefined, {
		$filter: filtroMateriales(filtros),
		$orderby: "Matnr",
		...(filtros.texto ? { $search: filtros.texto } : {})
	});
	const contextos = await lista.requestContexts(pagina * tamano, tamano);
	return contextos.map((c) => filaDeMaterial(c.getObject() as MaterialSap, filtros.vkorg, filtros.vtweg, sectorCab));
}

/* ---------- Combos Linea > Clase > Familia (entidades Linea, Clase y Familia) y stock por centro ---------- */

export interface OpcionSegmento {
	key: string;
	text: string;
}

export interface SegmentosSap {
	lineas: OpcionSegmento[];
	/** Clases por linea. */
	clases: Record<string, OpcionSegmento[]>;
	/** Familias por "linea-clase" (la misma clave que usa la pantalla). */
	familias: Record<string, OpcionSegmento[]>;
}

/** Arma las listas en cascada con el texto "codigo . descripcion", ordenadas por codigo. */
export function construirSegmentos(
	lineas: { Segmento1: string; Descripcion: string }[],
	clases: { Segmento1: string; Segmento2: string; Descripcion: string }[],
	familias: { Segmento1: string; Segmento2: string; Segmento3: string; Descripcion: string }[]
): SegmentosSap {
	const opcion = (key: string, descripcion: string): OpcionSegmento => ({ key, text: `${key} \u00b7 ${descripcion}` });
	const porCodigo = (a: OpcionSegmento, b: OpcionSegmento): number => a.key.localeCompare(b.key);
	const res: SegmentosSap = { lineas: lineas.map((l) => opcion(l.Segmento1, l.Descripcion)).sort(porCodigo), clases: {}, familias: {} };
	clases.forEach((c) => (res.clases[c.Segmento1] ??= []).push(opcion(c.Segmento2, c.Descripcion)));
	familias.forEach((f) => (res.familias[`${f.Segmento1}-${f.Segmento2}`] ??= []).push(opcion(f.Segmento3, f.Descripcion)));
	Object.values(res.clases).forEach((l) => l.sort(porCodigo));
	Object.values(res.familias).forEach((l) => l.sort(porCodigo));
	return res;
}

/** Lee los tres catalogos (son pequenos) y arma los combos. */
export async function cargarSegmentos(modelo: ODataModel): Promise<SegmentosSap> {
	const leer = async <T>(ruta: string): Promise<T[]> => {
		const contextos = await modelo.bindList(ruta).requestContexts(0, 2000);
		return contextos.map((c) => c.getObject() as T);
	};
	const [lineas, clases, familias] = await Promise.all([
		leer<{ Segmento1: string; Descripcion: string }>("/Linea"),
		leer<{ Segmento1: string; Segmento2: string; Descripcion: string }>("/Clase"),
		leer<{ Segmento1: string; Segmento2: string; Segmento3: string; Descripcion: string }>("/Familia")
	]);
	return construirSegmentos(lineas, clases, familias);
}

/** $filter de la entidad MaterialCentro para un centro y una lista de materiales. */
export function filtroStock(vkorg: string, vtweg: string, werks: string, matnrs: string[]): string {
	const materiales = matnrs.map((m) => `Matnr eq '${comillas(m)}'`).join(" or ");
	return `Vkorg eq '${comillas(vkorg)}' and Vtweg eq '${comillas(vtweg)}' and Werks eq '${comillas(werks)}' and (${materiales})`;
}

/**
 * Stock libre por material en un centro (entidad MaterialCentro). Si hay varios almacenes se toma el de mayor stock
 * (hoy 0001, salvo el centro 1007 con 0008). No incluye comprometido ni ATP (segunda version del servicio).
 */
export async function stockPorCentro(modelo: ODataModel, vkorg: string, vtweg: string, werks: string, matnrs: string[]): Promise<Record<string, number>> {
	if (matnrs.length === 0) {
		return {};
	}
	const contextos = await modelo.bindList("/MaterialCentro", undefined, undefined, undefined, { $filter: filtroStock(vkorg, vtweg, werks, matnrs) }).requestContexts(0, 500);
	const res: Record<string, number> = {};
	contextos.forEach((c) => {
		const f = c.getObject() as { Matnr: string; StockLibre: number | string };
		res[f.Matnr] = Math.max(res[f.Matnr] ?? 0, Number(f.StockLibre));
	});
	return res;
}
