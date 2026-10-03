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
