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
		// Cada palabra se busca por separado (en cualquier orden): "rodaje 6202" encuentra "RODAJE BOLAS 6202-2NSL".
		f.descripcion
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.forEach((palabra) => partes.push(`contains(Maktx,'${comillas(palabra.toUpperCase())}')`));
	}
	return partes.join(" and ");
}

/** Convierte una fila del servicio a la fila que muestra la tabla de repuestos. */
/**
 * `sectorCab` es la regla del sector de cabecera (Reglas.sectorDeCabecera: por organizacion y canal). Cuando se da, MANDA sobre el campo
 * SpartCabecera del servicio, que hoy solo esta calculado para la org. 1103 y devolvia el sector del material en 1203 y 1303 (SAP rechazaba
 * la oferta: "1203/11/50 no esta prevista la clase Z300"). Sin regla se usa SpartCabecera y, si falta, el sector del material.
 */
export function filaDeMaterial(m: MaterialSap, vkorg: string, vtweg: string, sectorCab?: (canal: string, sector: string, org?: string) => string): FilaRepuestoSap {
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
		sectorOferta: sectorCab ? sectorCab(vtweg, m.Spart ?? "", vkorg) : m.SpartCabecera || (m.Spart ?? ""),
		orgVentas: vkorg,
		um: m.Meins,
		grupo: "Repuestos y accesorios",
		origen: "sap"
	};
}

/** Busca materiales en SAP (maximo 50 por pagina, orden por codigo). Lanza el error del servicio si falla. */
export async function buscarMateriales(modelo: ODataModel, filtros: FiltrosMaterial, sectorCab?: (canal: string, sector: string, org?: string) => string, pagina = 0, tamano = 50): Promise<FilaRepuestoSap[]> {
	const lista = modelo.bindList("/Material", undefined, undefined, undefined, {
		$filter: filtroMateriales(filtros),
		$orderby: "Matnr",
		...(filtros.texto ? { $search: filtros.texto } : {})
	});
	const contextos = await lista.requestContexts(pagina * tamano, tamano);
	return contextos.map((c) => filaDeMaterial(c.getObject() as MaterialSap, filtros.vkorg, filtros.vtweg, sectorCab));
}

/** Codigos por consulta en la busqueda exacta: el $filter con muchos "or" se vuelve largo para la URL. */
const CODIGOS_POR_CONSULTA = 20;

/**
 * Materiales con esos codigos exactos en la organizacion y canal (carga desde Excel). Los que no existen ahi simplemente no vuelven.
 * El servicio acepta "or" entre codigos (probado en el 130 el 30/10/2026).
 */
export async function materialesPorCodigo(modelo: ODataModel, vkorg: string, vtweg: string, codigos: string[], sectorCab?: (canal: string, sector: string, org?: string) => string): Promise<FilaRepuestoSap[]> {
	const lotes: string[][] = [];
	for (let i = 0; i < codigos.length; i += CODIGOS_POR_CONSULTA) {
		lotes.push(codigos.slice(i, i + CODIGOS_POR_CONSULTA));
	}
	const resultados = await Promise.all(
		lotes.map(async (lote) => {
			const codigosFiltro = lote.map((c) => `Matnr eq '${comillas(c.toUpperCase())}'`).join(" or ");
			const lista = modelo.bindList("/Material", undefined, undefined, undefined, {
				$filter: `Vkorg eq '${comillas(vkorg)}' and Vtweg eq '${comillas(vtweg)}' and (${codigosFiltro})`
			});
			const contextos = await lista.requestContexts(0, lote.length);
			return contextos.map((c) => filaDeMaterial(c.getObject() as MaterialSap, vkorg, vtweg, sectorCab));
		})
	);
	return resultados.flat();
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
export async function stockPorCentro(modelo: ODataModel, vkorg: string, vtweg: string, werks: string, matnrs: string[], lgort = ""): Promise<Record<string, number>> {
	if (matnrs.length === 0) {
		return {};
	}
	const contextos = await modelo.bindList("/MaterialCentro", undefined, undefined, undefined, { $filter: filtroStock(vkorg, vtweg, werks, matnrs) }).requestContexts(0, 500);
	const res: Record<string, number> = {};
	contextos.forEach((c) => {
		const f = c.getObject() as { Matnr: string; Lgort?: string; StockLibre: number | string };
		// Con almacen, solo cuenta el stock de ESE almacen (el del perfil del vendedor): el pedido sale de el.
		if (lgort && f.Lgort !== lgort) {
			return;
		}
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
export function disponibilidadDeFilas(filas: { Matnr: string; Lgort?: string; StockLibre: number | string; Disponible: number | string; Comprometido: number | string; Respuesta?: number | string }[], lgort = ""): Record<string, Disponibilidad> {
	const res: Record<string, Disponibilidad> = {};
	filas.forEach((f) => {
		if (Number(f.Respuesta ?? 0) !== 0 || (lgort && f.Lgort !== lgort)) {
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
export async function disponibilidadPorCentro(modelo: ODataModel, vkorg: string, vtweg: string, werks: string, matnrs: string[], lgort = ""): Promise<Record<string, Disponibilidad>> {
	if (matnrs.length === 0) {
		return {};
	}
	const contextos = await modelo.bindList("/MaterialAtp", undefined, undefined, undefined, { $filter: filtroStock(vkorg, vtweg, werks, matnrs.slice(0, 50)) }).requestContexts(0, 50);
	return disponibilidadDeFilas(contextos.map((c) => c.getObject() as Parameters<typeof disponibilidadDeFilas>[0][number]), lgort);
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
/** Paginas que se piden a la vez: menos viajes seguidos a SAP sin traer cientos de materiales de mas. */
export const PAGINAS_EN_PARALELO = 3;

/**
 * Busca repuestos con el filtro de stock del servidor: recorre los materiales por lotes de paginas (en paralelo), mira el stock libre
 * de cada pagina y se queda con los que tienen stock hasta juntar una pagina de resultados o agotar los materiales (o el tope de
 * paginas). Sin `soloStock` trae la primera pagina, con su stock. El ATP solo se pide, una vez, para las filas que se van a mostrar.
 */
export async function buscarRepuestosConStock(
	modelo: ODataModel,
	filtros: FiltrosMaterial,
	werks: string,
	soloStock: boolean,
	sectorCab?: (canal: string, sector: string, org?: string) => string,
	/** Medicion opcional: nombre de la fase y milisegundos (solo para diagnosticar lentitud). */
	medir?: (fase: string, ms: number) => void,
	/** Avance para mostrar al vendedor: materiales revisados y cuantos tienen stock hasta ahora. */
	progreso?: (revisados: number, conStock: number) => void,
	/** Almacen del perfil: el stock y la disponibilidad se miden en ESE almacen (no en el mejor del centro). Vacio = el mejor del centro. */
	lgort = ""
): Promise<ResultadoBusquedaStock> {
	const cronometrar = async <T>(fase: string, tarea: () => Promise<T>): Promise<T> => {
		const t0 = Date.now();
		try {
			return await tarea();
		} finally {
			medir?.(fase, Date.now() - t0);
		}
	};
	const lote = soloStock ? PAGINAS_EN_PARALELO : 1;
	const candidatas: FilaRepuestoSap[] = [];
	const libreTotal: Record<string, number> = {};
	let coinciden = 0;
	let parcial = false;
	let agotado = false;
	for (let desde = 0; desde < MAX_PAGINAS_STOCK && !agotado && candidatas.length < FILAS_POR_PAGINA; desde += lote) {
		const paginas = Array.from({ length: Math.min(lote, MAX_PAGINAS_STOCK - desde) }, (_, k) => desde + k);
		// Cada pagina pide sus materiales y luego su stock; las paginas del lote van a la vez.
		const resultados = await Promise.all(
			paginas.map(async (pagina) => {
				const materiales = await cronometrar(`Material p${pagina}`, () => buscarMateriales(modelo, filtros, sectorCab, pagina, FILAS_POR_PAGINA));
				const libre = materiales.length
					? await cronometrar(`Stock p${pagina}`, () => stockPorCentro(modelo, filtros.vkorg, filtros.vtweg, werks, materiales.map((m) => m.material), lgort))
					: {};
				return { materiales, libre };
			})
		);
		for (const { materiales, libre } of resultados) {
			coinciden += materiales.length;
			Object.assign(libreTotal, libre);
			candidatas.push(...(soloStock ? materiales.filter((m) => (libre[m.material] ?? 0) > 0) : materiales));
			if (materiales.length < FILAS_POR_PAGINA) {
				agotado = true;
			}
		}
		progreso?.(coinciden, candidatas.length);
		if (!soloStock) {
			break;
		}
		if (desde + lote >= MAX_PAGINAS_STOCK && !agotado && candidatas.length < FILAS_POR_PAGINA) {
			parcial = true;
		}
	}
	let aMostrar = candidatas.slice(0, FILAS_POR_PAGINA);
	let atp: Record<string, Disponibilidad> = {};
	if (aMostrar.length > 0) {
		try {
			atp = await cronometrar(`ATP (${aMostrar.length})`, () => disponibilidadPorCentro(modelo, filtros.vkorg, filtros.vtweg, werks, aMostrar.map((m) => m.material), lgort));
		} catch {
			// Sin ATP se muestra el stock libre; no se pierde el resultado.
		}
	}
	// "Solo con stock" cuenta el DISPONIBLE (ATP), no el fisico: un almacen con 1 unidad ya comprometida por otro documento no tiene stock
	// para vender (SAP rechaza el pedido). Si SAP no pudo calcular el ATP de un material, se conserva por su stock libre.
	if (soloStock) {
		aMostrar = aMostrar.filter((m) => (atp[m.material] ? atp[m.material].disponible : (libreTotal[m.material] ?? 0)) > 0);
	}
	return { filas: combinarStock(aMostrar, libreTotal, atp), coinciden, parcial };
}

export interface DisponibleAlmacen {
	lgort: string;
	libre: number;
	disponible: number;
}

/** Filas de MaterialAtp a disponibilidad por almacen de un material; las filas que SAP no pudo calcular (Respuesta != 0) se omiten. */
export function disponibilidadPorAlmacenDeFilas(
	filas: { Matnr: string; Lgort?: string; StockLibre: number | string; Disponible: number | string; Respuesta?: number | string }[],
	matnr: string
): DisponibleAlmacen[] {
	return filas
		.filter((f) => f.Matnr === matnr && f.Lgort && Number(f.Respuesta ?? 0) === 0)
		.map((f) => ({ lgort: f.Lgort as string, libre: Number(f.StockLibre), disponible: Number(f.Disponible) }))
		.sort((a, b) => a.lgort.localeCompare(b.lgort));
}

/**
 * Almacenes de un centro con su stock libre y DISPONIBLE (ATP) de un material. Un pedido solo se crea si el disponible del almacen alcanza:
 * el stock fisico puede estar comprometido por otros documentos (visto en el 0004 del centro 2001: 1 fisico, 1.000 reservados).
 */
export async function disponibilidadPorAlmacen(modelo: ODataModel, vkorg: string, vtweg: string, werks: string, matnr: string): Promise<DisponibleAlmacen[]> {
	const contextos = await modelo.bindList("/MaterialAtp", undefined, undefined, undefined, { $filter: filtroStock(vkorg, vtweg, werks, [matnr]) }).requestContexts(0, 50);
	return disponibilidadPorAlmacenDeFilas(contextos.map((c) => c.getObject() as Parameters<typeof disponibilidadPorAlmacenDeFilas>[0][number]), matnr);
}

export interface StockEnCentro {
	werks: string;
	lgort: string;
	libre: number;
	disponible: number;
}

type FilaAtp = { Matnr: string; Werks?: string; Lgort?: string; StockLibre: number | string; Disponible: number | string; Respuesta?: number | string };

/** Filas de MaterialAtp de todos los centros; las que SAP no pudo calcular (Respuesta != 0) se omiten, como en un solo centro. */
export function stockEnCentrosDeFilas(filas: FilaAtp[], matnr: string): StockEnCentro[] {
	return filas
		.filter((f) => f.Matnr === matnr && f.Werks && f.Lgort && Number(f.Respuesta ?? 0) === 0)
		.map((f) => ({ werks: f.Werks as string, lgort: f.Lgort as string, libre: Number(f.StockLibre), disponible: Number(f.Disponible) }));
}

/**
 * Stock libre y DISPONIBLE (ATP) de un material en TODOS los centros de la organizacion y el canal: MaterialAtp sin Werks recorre los centros
 * de TVKWZ que tienen el material (YCL_COTIZ_MATERIALATP_QUERY, hasta 50 filas). Una sola llamada.
 */
export async function stockEnCentros(modelo: ODataModel, vkorg: string, vtweg: string, matnr: string): Promise<StockEnCentro[]> {
	const filtro = `Vkorg eq '${comillas(vkorg)}' and Vtweg eq '${comillas(vtweg)}' and Matnr eq '${comillas(matnr)}'`;
	const contextos = await modelo.bindList("/MaterialAtp", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 50);
	return stockEnCentrosDeFilas(contextos.map((c) => c.getObject() as FilaAtp), matnr);
}

export interface FilaStockCentro {
	ubicacion: string;
	esMio: boolean;
	fisico: number;
	disponible: number;
	transito: number;
}

/**
 * Filas del dialogo de stock (pruebas del 28/10/2026: sin stock propio no se veia donde habia). Primero el almacen del vendedor, aunque no
 * tenga stock (si SAP no lo devolvio, con lo que dio la busqueda); despues los demas almacenes con stock, de mas a menos disponible. Es solo
 * para ver: el pedido sigue saliendo del almacen del vendedor.
 */
export function filasDeStockEnCentros(
	stock: StockEnCentro[],
	propio: { werks: string; lgort: string; fisico: number; disponible: number },
	nombreCentro: (werks: string) => string
): FilaStockCentro[] {
	const ubicacion = (werks: string, lgort: string): string => [werks, nombreCentro(werks), lgort].filter(Boolean).join(" · ");
	const esPropio = (s: StockEnCentro): boolean => s.werks === propio.werks && s.lgort === propio.lgort;
	const mio = stock.find(esPropio);
	const otros = stock
		.filter((s) => !esPropio(s) && (s.libre > 0 || s.disponible > 0))
		.sort((a, b) => b.disponible - a.disponible || a.werks.localeCompare(b.werks) || a.lgort.localeCompare(b.lgort));
	return [
		{ ubicacion: ubicacion(propio.werks, propio.lgort), esMio: true, fisico: mio?.libre ?? propio.fisico, disponible: mio?.disponible ?? propio.disponible, transito: 0 },
		...otros.map((s) => ({ ubicacion: ubicacion(s.werks, s.lgort), esMio: false, fisico: s.libre, disponible: s.disponible, transito: 0 }))
	];
}
