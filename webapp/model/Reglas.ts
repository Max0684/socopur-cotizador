/**
 * Reglas puras del Cotizador (sin dependencias de UI5) para poder probarlas con `npm test` (node:test).
 * Todas salen de lecturas reales de DS4/130; el comentario de cada una dice de donde.
 */
import type { GrupoParaGuardar } from "./CotizacionesService";

/** Linea del carrito, solo con lo que usan estas reglas. */
export interface LineaCarrito {
	orgVentas: string;
	sector: string;
	material: string;
	cantidad: number;
	precio: number;
	bonificacion?: boolean;
	/** Solo vehiculos de SAP: variante, centro y almacen del vehiculo elegido. */
	variante?: string;
	centroVeh?: string;
	almacenVeh?: string;
}

/** Grupo del carrito = una oferta SAP. */
export interface GrupoCarrito {
	canal?: string;
	claseOferta?: string;
	clasePedido?: string;
	modalidad?: string;
	lineas: LineaCarrito[];
}

export interface PerfilVenta {
	oficina?: string;
	centro?: string;
}

/**
 * Organizaciones de REPUESTOS de las tres sociedades (1103 Socopur, 1203 Promogesa, 1303 Selva): comparten la misma regla de sector de
 * cabecera (lectura de TVAKZ en DS4/130, 05/10/2026). Las de vehiculos y taller usan el sector del material.
 */
const ORGS_REPUESTOS = ["1103", "1203", "1303"];

/** Canales que en TVAKZ (orgs. de repuestos) solo existen con sector 99. El 10 y el 12 usan el sector del material (50-56 y 90). */
const CANALES_SECTOR_99 = ["11", "14", "99"];

/** "11 Retail" -> "11". Texto vacio o sin numero inicial -> "". */
export function canalDe(texto?: string): string {
	return /^(\d{2})/.exec(texto ?? "")?.[1] ?? "";
}

/** "1101 PCP - Centenario" -> "1101". */
export function oficinaDe(texto?: string): string {
	return /^(\d{4})/.exec(texto ?? "")?.[1] ?? "";
}

/** Sector de la cabecera de la oferta segun el canal (si no, SAP rechaza: "no esta prevista la clase de pedido"). */
export function sectorDeCabecera(canal: string, sectorDelMaterial: string, orgVentas?: string): string {
	// La regla del sector 99 es de las orgs. de repuestos (1103, 1203 y 1303: la misma en las tres). Las demas (p. ej. 1101, vehiculos) usan
	// el sector del material; solo el canal 15 (Administrativo) pasa a 90 en todas. Sin organizacion se aplica la de repuestos.
	if (orgVentas && !ORGS_REPUESTOS.includes(orgVentas)) {
		return canal === "15" ? "90" : sectorDelMaterial;
	}
	if (canal === "15") {
		// En TVAKZ de las orgs. de repuestos el canal 15 (Administrativo) solo admite el sector 90 (lo calcula igual la entidad Material).
		return "90";
	}
	return CANALES_SECTOR_99.includes(canal) ? "99" : sectorDelMaterial;
}

/** Une las areas ya conocidas de un cliente con las filas leidas (organizacion/canal/sector) sin repetir. */
export function unirAreas(actuales: string[], filas: { Vkorg: string; Vtweg: string; Spart: string }[]): string[] {
	return [...new Set([...actuales, ...filas.map((f) => `${f.Vkorg}/${f.Vtweg}/${f.Spart}`)])];
}

/** Los clientes de SAP traen sus areas como organizacion/canal/sector; para comparar se usa organizacion/canal. */
export function areasOrgCanal(areas: string[]): string[] {
	return areas.map((a) => a.split("/").slice(0, 2).join("/"));
}

/**
 * true si el cliente NO esta dado de alta en la organizacion/canal. Sin organizacion o sin canal no se puede
 * decidir y devuelve false. Sin areas conocidas se usan las del prototipo (1101/11 y 1103/11).
 */
export function faltaAreaDeVentas(areasCliente: string[] | undefined, orgVentas: string | undefined, canal: string): boolean {
	if (!orgVentas || !canal) {
		return false;
	}
	return !areasOrgCanal(areasCliente ?? ["1101/11", "1103/11"]).includes(`${orgVentas}/${canal}`);
}

/**
 * Convierte los grupos del carrito en lo que recibe el servicio. Los regalos (bonificaciones) NO se envian:
 * SAP agrega solo la linea ZNA0 al crear la oferta y enviarla la duplicaria.
 */
export function gruposParaGuardar(grupos: GrupoCarrito[], perfil: PerfilVenta, almacen: string | ((centro: string) => string), unidad = "UN"): GrupoParaGuardar[] {
	return grupos.map((g) => {
		const canal = canalDe(g.canal);
		return {
			vkorg: g.lineas[0]?.orgVentas ?? "",
			vtweg: canal,
			spart: sectorDeCabecera(canal, g.lineas[0]?.sector ?? "", g.lineas[0]?.orgVentas),
			vkbur: oficinaDe(perfil.oficina),
			claseOferta: g.claseOferta ?? "",
			clasePedido: g.clasePedido ?? "",
			modalidad: g.modalidad ?? "",
			lineas: g.lineas
				.filter((l) => !l.bonificacion)
				.map((l) => ({
					material: l.material,
					cantidad: l.cantidad,
					um: unidad,
					// Un vehiculo se vende desde el centro y el almacen donde esta, no desde el centro del perfil.
					centro: l.centroVeh || perfil.centro || "",
					almacen: l.almacenVeh || (typeof almacen === "function" ? almacen(perfil.centro ?? "") : almacen),
					precio: l.precio,
					...(l.variante ? { variante: l.variante } : {})
				}))
		};
	});
}

/**
 * true si el centro es valido para la organizacion/canal segun TVKWZ. Si no hay lista para esa area
 * (por ejemplo 1103/99, que no se leyo completa) no se bloquea.
 */
export function centroValidoParaArea(centrosPorArea: Record<string, string[]>, orgVentas: string, canal: string, centro: string): boolean {
	const validos = centrosPorArea[`${orgVentas}/${canal}`];
	return !validos || validos.includes(centro);
}

/** Almacen de las lineas: el 0001 es el normal; el centro 1007 (aduanero) usa el 0008. Leido en MARD. */
export function almacenDeCentro(centro: string, almacenPorCentro: Record<string, string>): string {
	return almacenPorCentro[centro] ?? "0001";
}

const MODALIDAD_POR_DEFECTO: Record<string, Record<string, string>> = {
	repuestos: { "10": "rep_mayorista", "11": "rep_mostrador" },
	vehiculos: { "10": "veh_mayorista", "11": "veh_retail" }
};

/** Modalidad que se propone al elegir un canal; undefined si no hay una por defecto para ese canal. */
export function modalidadPorDefecto(tipo: "repuestos" | "vehiculos", canal: string): string | undefined {
	return MODALIDAD_POR_DEFECTO[tipo][canal];
}

export interface LineaTotales {
	total: number;
	iscPct?: number;
	/** Impuesto real de SAP; solo las lineas leidas del documento SAP lo traen. */
	impuesto?: number;
	/** ISC e IGV por separado (ZISC y ZIGV del documento SAP); si todas las lineas los traen, el total es neto + ISC + IGV. */
	isc?: number;
	igvImporte?: number;
}

export interface TotalesOferta {
	subtotal: number;
	neto: number;
	isc: number;
	hayIsc: boolean;
	igv: number;
	/** true solo si TODAS las lineas traen el impuesto de SAP; antes de guardar el IGV no se conoce. */
	igvConocido: boolean;
	total: number;
	/** true cuando ISC e IGV vienen separados de SAP (no se deduce el ISC del IGV). */
	desglose: boolean;
}

const redondear = (v: number): number => Math.round(v * 100) / 100;

/**
 * Totales de la oferta. El IGV sale de SAP (VBAP-MWSBP por posicion): si alguna linea no lo trae, el IGV se
 * considera desconocido (0 y igvConocido=false) y el total es solo la suma de las lineas. Con IGV conocido,
 * total = suma de las lineas + IGV, como Total = Netwr + ImpuestoTotal en el servicio.
 * El precio de lista de vehiculos ya incluye el ISC: se separa neto e ISC solo para informar.
 */
export function totalesDeOferta(lineas: LineaTotales[]): TotalesOferta {
	const subtotal = lineas.reduce((acc, l) => acc + l.total, 0);
	if (lineas.length > 0 && lineas.every((l) => l.isc !== undefined && l.igvImporte !== undefined)) {
		// Documento SAP: el valor de las lineas ya es neto; se suma el ISC y el IGV reales (el IGV puede ser 0 si esta exonerado).
		const iscSap = redondear(lineas.reduce((acc, l) => acc + (l.isc ?? 0), 0));
		const igvSap = redondear(lineas.reduce((acc, l) => acc + (l.igvImporte ?? 0), 0));
		return { subtotal, neto: redondear(subtotal), isc: iscSap, hayIsc: iscSap > 0, igv: igvSap, igvConocido: true, total: redondear(subtotal + iscSap + igvSap), desglose: true };
	}
	const isc = redondear(lineas.reduce((acc, l) => acc + l.total - l.total / (1 + (l.iscPct ?? 0) / 100), 0));
	const igvConocido = lineas.length > 0 && lineas.every((l) => l.impuesto !== undefined);
	const igv = igvConocido ? redondear(lineas.reduce((acc, l) => acc + (l.impuesto ?? 0), 0)) : 0;
	return { subtotal, neto: redondear(subtotal - isc), isc, hayIsc: isc > 0, igv, igvConocido, total: redondear(subtotal + igv), desglose: false };
}
