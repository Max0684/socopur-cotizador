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

export interface Disponibilidad {
	/** Stock fisico libre. */
	fisico: number;
	disponible: number;
	comprometido: number;
}

/** Filas de MaterialAtp a disponibilidad por material: se toma el almacen de mayor stock; si SAP no pudo calcular alguna fila (Respuesta != 0) se omite. */
export function disponibilidadDeFilas(filas: { Matnr: string; StockLibre: number | string; Disponible: number | string; Comprometido: number | string; Respuesta?: number | string }[]): Record<string, Disponibilidad> {
	const res: Record<string, Disponibilidad> = {};
	filas.forEach((f) => {
		if (Number(f.Respuesta ?? 0) !== 0) {
			return;
		}
		const fisico = Number(f.StockLibre);
		if (fisico >= (res[f.Matnr]?.fisico ?? -1)) {
			res[f.Matnr] = { fisico, disponible: Number(f.Disponible), comprometido: Number(f.Comprometido) };
		}
	});
	return res;
}

/** Disponibilidad (stock libre, ATP y comprometido) por material en un centro (entidad MaterialAtp, maximo 50 materiales). */
export async function disponibilidadPorCentro(modelo: ODataModel, vkorg: string, vtweg: string, werks: string, matnrs: string[]): Promise<Record<string, Disponibilidad>> {
	if (matnrs.length === 0) {
		return {};
	}
	const contextos = await modelo.bindList("/MaterialAtp", undefined, undefined, undefined, { $filter: filtroStock(vkorg, vtweg, werks, matnrs.slice(0, 50)) }).requestContexts(0, 50);
	return disponibilidadDeFilas(contextos.map((c) => c.getObject() as Parameters<typeof disponibilidadDeFilas>[0][number]));
}

export type MotivoVacio = "" | "sinCoincidencias" | "sinStock";

/**
 * Por que una busqueda de repuestos no muestra nada, para decirlo claro al vendedor:
 * - sinCoincidencias: ningun material cumple los filtros (en la organizacion y el canal del perfil);
 * - sinStock: hay materiales que cumplen, pero ninguno con stock en el centro del perfil (y el filtro "solo con stock" esta activo).
 * Con resultados visibles no hay motivo.
 */
export function motivoVacio(coinciden: number, visibles: number, soloStock: boolean): MotivoVacio {
	if (visibles > 0) {
		return "";
	}
	if (coinciden === 0) {
		return "sinCoincidencias";
	}
	return soloStock ? "sinStock" : "";
}

/** Fila de repuesto con su stock en el centro del perfil. */
export type FilaConStock = FilaRepuestoSap & { disponible: number; comprometido: number | string; total: number };

/**
 * Une los materiales con su stock en el centro. El stock libre (MaterialCentro) es lo que decide si "hay stock": es la fuente confiable.
 * El ATP (MaterialAtp) solo aporta Disponible y Comprometido; si SAP no pudo calcularlo para un material, no se descarta: se muestra el
 * stock libre como disponible y el comprometido como "\u2014".
 */
export function combinarStock(filas: FilaRepuestoSap[], libre: Record<string, number>, atp: Record<string, Disponibilidad>): FilaConStock[] {
	return filas.map((f) => {
		const stock = libre[f.material] ?? 0;
		const a = atp[f.material];
		return { ...f, disponible: a ? a.disponible : stock, comprometido: a ? a.comprometido : "\u2014", total: stock };
	});
}

export interface ResultadoBusquedaStock {
	filas: FilaConStock[];
	/** Cuantos materiales cumplian los filtros entre los revisados (con o sin stock). */
	coinciden: number;
	/** true si se llego al tope de paginas revisadas y puede haber mas materiales con stock. */
	parcial: boolean;
}

/** Paginas de 50 materiales que se revisan como maximo buscando stock (20 = 1000 materiales). */
export const MAX_PAGINAS_STOCK = 20;
export const FILAS_POR_PAGINA = 50;

/**
 * Busca repuestos con el filtro de stock del servidor: recorre los materiales por paginas, mira el stock libre de cada pagina y se queda
 * con los que tienen stock hasta juntar una pagina de resultados o agotar los materiales (o el tope de paginas). Sin `soloStock` trae
 * la primera pagina, con su stock. El ATP solo se pide para los que se van a mostrar.
 */
export async function buscarRepuestosConStock(
	modelo: ODataModel,
	filtros: FiltrosMaterial,
	werks: string,
	soloStock: boolean,
	sectorCab?: (canal: string, sector: string) => string,
	/** Medicion opcional: nombre de la fase y milisegundos (solo para diagnosticar lentitud). */
	medir?: (fase: string, ms: number) => void
): Promise<ResultadoBusquedaStock> {
	const cronometrar = async <T>(fase: string, tarea: () => Promise<T>): Promise<T> => {
		const t0 = Date.now();
		try {
			return await tarea();
		} finally {
			medir?.(fase, Date.now() - t0);
		}
	};
	const filas: FilaConStock[] = [];
	let coinciden = 0;
	let parcial = false;
	for (let pagina = 0; pagina < MAX_PAGINAS_STOCK; pagina++) {
		const materiales = await cronometrar(`Material p${pagina}`, () => buscarMateriales(modelo, filtros, sectorCab, pagina, FILAS_POR_PAGINA));
		if (materiales.length === 0) {
			break;
		}
		coinciden += materiales.length;
		const libre = await cronometrar(`Stock p${pagina}`, () => stockPorCentro(modelo, filtros.vkorg, filtros.vtweg, werks, materiales.map((m) => m.material)));
		const aMostrar = soloStock ? materiales.filter((m) => (libre[m.material] ?? 0) > 0) : materiales;
		let atp: Record<string, Disponibilidad> = {};
		if (aMostrar.length > 0) {
			try {
				atp = await cronometrar(`ATP p${pagina} (${aMostrar.length})`, () => disponibilidadPorCentro(modelo, filtros.vkorg, filtros.vtweg, werks, aMostrar.map((m) => m.material)));
			} catch {
				// Sin ATP se muestra el stock libre; no se pierde el resultado.
			}
		}
		filas.push(...combinarStock(aMostrar, libre, atp));
		if (!soloStock || filas.length >= FILAS_POR_PAGINA || materiales.length < FILAS_POR_PAGINA) {
			break;
		}
		if (pagina === MAX_PAGINAS_STOCK - 1) {
			parcial = true;
		}
	}
	return { filas, coinciden, parcial };
}
