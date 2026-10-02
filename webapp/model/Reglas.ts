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

/** Canales que en TVAKZ (org. 1103) solo existen con sector 99. El 10 y el 12 usan el sector del material (50-56 y 90). */
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
export function sectorDeCabecera(canal: string, sectorDelMaterial: string): string {
	return CANALES_SECTOR_99.includes(canal) ? "99" : sectorDelMaterial;
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
export function gruposParaGuardar(grupos: GrupoCarrito[], perfil: PerfilVenta, almacen: string, unidad = "UN"): GrupoParaGuardar[] {
	return grupos.map((g) => {
		const canal = canalDe(g.canal);
		return {
			vkorg: g.lineas[0]?.orgVentas ?? "",
			vtweg: canal,
			spart: sectorDeCabecera(canal, g.lineas[0]?.sector ?? ""),
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
					centro: perfil.centro ?? "",
					almacen,
					precio: l.precio
				}))
		};
	});
}
