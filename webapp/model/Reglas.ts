/**
 * Reglas puras del Cotizador (sin dependencias de UI5) para poder probarlas con `npm test` (node:test).
 * Todas salen de lecturas reales de DS4/130; el comentario de cada una dice de donde.
 */
import type { GrupoParaGuardar } from "./CotizacionesService";

/** Linea del carrito, solo con lo que usan estas reglas. */
export interface LineaCarrito {
	orgVentas: string;
	sector: string;
	/** Sector propio del material (50-56, 90...); con el se recalcula el sector de cabecera segun el canal de la modalidad. */
	sectorMaterial?: string;
	material: string;
	cantidad: number;
	precio: number;
	/**
	 * Solo lineas leidas de un documento SAP (oferta guardada o reabierta): precio unitario CON impuestos. En ellas `precio` es el neto de SAP
	 * (Netpr); si la oferta se vuelve a guardar, el precio de lista que viaja es este y no el neto (si no, se pierde el IGV: 17.50 -> 14.83).
	 */
	precioFinal?: number;
	bonificacion?: boolean;
	/** Regalo de promocion de repuestos: ZNA0 (SAP lo agrega solo) o ZETA (venta cruzada, lo envia el Cotizador). */
	mecanismo?: string;
	/** Solo regalos de promocion: sector del material de regalo. */
	sectorRegalo?: string;
	/** Identificador de la linea y, en un regalo, el de la linea que lo genera. */
	uid?: string;
	origen?: string;
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

/** Condicion comercial de un cliente en UN area de ventas (fila de KNVV): puede cambiar por canal y por sector. */
export interface CondicionArea {
	vkorg: string;
	vtweg: string;
	spart: string;
	/** Condicion de pago y su texto. */
	zterm: string;
	ztermTexto: string;
	/** Moneda del area; vacia si el servicio aun no la publica. */
	waers: string;
	/** Grupo de clientes (Mayorista / Retail) y su texto. */
	grupo: string;
	grupoTexto: string;
}

/** Condicion del area exacta (organizacion, canal y sector); undefined si el cliente no esta dado de alta en esa area. */
export function condicionDeArea(condiciones: CondicionArea[] | undefined, vkorg: string, vtweg: string, spart: string): CondicionArea | undefined {
	return (condiciones ?? []).find((c) => c.vkorg === vkorg && c.vtweg === vtweg && c.spart === spart);
}

/** Valores distintos de una condicion entre las areas dadas, para avisar cuando un carrito mezcla monedas o condiciones de pago. */
export function valoresDistintos(condiciones: (CondicionArea | undefined)[], campo: "zterm" | "waers"): string[] {
	return [...new Set(condiciones.filter((c): c is CondicionArea => !!c).map((c) => c[campo]).filter(Boolean))];
}

/** Area de ventas del cliente para elegir en el perfil: organizacion + canal con las mismas condiciones, agrupando los sectores que las comparten. */
export interface OpcionAreaCliente {
	key: string;
	vkorg: string;
	vtweg: string;
	sectores: string[];
	zterm: string;
	ztermTexto: string;
	waers: string;
	grupo: string;
	grupoTexto: string;
}

/**
 * Areas del cliente que puede usar el vendedor (las de sus organizaciones). Las filas de un mismo canal con la misma condicion de pago, moneda
 * y grupo de clientes se juntan en una sola opcion; si cambian por sector (p. ej. USD en el sector 10 y PEN en el 15) quedan opciones separadas.
 */
export function opcionesAreaCliente(condiciones: CondicionArea[] | undefined, orgs: string[]): OpcionAreaCliente[] {
	const grupos = new Map<string, OpcionAreaCliente>();
	for (const c of condiciones ?? []) {
		if (!orgs.includes(c.vkorg)) {
			continue;
		}
		const clave = [c.vkorg, c.vtweg, c.zterm, c.waers, c.grupo].join("|");
		const existente = grupos.get(clave);
		if (existente) {
			existente.sectores.push(c.spart);
		} else {
			grupos.set(clave, { key: clave, vkorg: c.vkorg, vtweg: c.vtweg, sectores: [c.spart], zterm: c.zterm, ztermTexto: c.ztermTexto, waers: c.waers, grupo: c.grupo, grupoTexto: c.grupoTexto });
		}
	}
	return [...grupos.values()]
		.map((o) => ({ ...o, sectores: [...o.sectores].sort() }))
		.sort((a, b) => a.vkorg.localeCompare(b.vkorg) || a.vtweg.localeCompare(b.vtweg) || a.sectores[0].localeCompare(b.sectores[0]));
}

export interface SolicitudAmpliacion {
	cliente: string;
	kunnr: string;
	documento: string;
	/** Area que se pide (organizacion y canal, ya con sus nombres) y, si se conoce, de cual copiar las condiciones. */
	areaNueva: string;
	areaReferencia?: string;
	vendedor: string;
	motivo: string;
}

/** Texto de la solicitud de ampliacion de un cliente a una area de ventas, para quien administra los datos maestros. */
export function textoSolicitudAmpliacion(s: SolicitudAmpliacion): { asunto: string; cuerpo: string } {
	const lineas = [
		"Solicitud de ampliación de cliente a un área de ventas",
		"",
		`Cliente: ${s.cliente} (N° ${s.kunnr}${s.documento ? `, ${s.documento}` : ""})`,
		`Área de ventas solicitada: ${s.areaNueva}`,
		...(s.areaReferencia ? [`Copiar condiciones de: ${s.areaReferencia}`] : []),
		`Motivo: ${s.motivo || "cotización en el Cotizador"}`,
		`Solicitante: ${s.vendedor}`
	];
	return { asunto: `Ampliar cliente ${s.kunnr} a ${s.areaNueva}`, cuerpo: lineas.join("\n") };
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
 * Convierte los grupos del carrito en lo que recibe el servicio. Los regalos ZNA0 (y los de la moto) NO se envian: SAP agrega solo la linea
 * ZNA0 al crear la oferta y enviarla la duplicaria. Los de venta cruzada (Zeta) SI: SAP no los genera, y el job de la oferta los manda como
 * posicion CSEL colgada de su linea (Bonif "Z" + PosnrPadre, YCL_COTIZ_BG->armar_input).
 */
export function gruposParaGuardar(grupos: GrupoCarrito[], perfil: PerfilVenta, almacen: string | ((centro: string) => string), unidad = "UN"): GrupoParaGuardar[] {
	return grupos.map((g) => {
		const canal = canalDe(g.canal);
		const delCarrito = g.lineas.filter((l) => !l.bonificacion || (l.mecanismo === "ZETA" && !!l.origen));
		// Un regalo cuya linea ya no esta no se puede colgar de nada en SAP.
		const enviadas = delCarrito.filter((l) => !l.bonificacion || delCarrito.some((p) => !p.bonificacion && p.uid === l.origen));
		return {
			vkorg: g.lineas[0]?.orgVentas ?? "",
			vtweg: canal,
			spart: sectorDeCabecera(canal, g.lineas[0]?.sectorMaterial ?? g.lineas[0]?.sector ?? "", g.lineas[0]?.orgVentas),
			vkbur: oficinaDe(perfil.oficina),
			claseOferta: g.claseOferta ?? "",
			clasePedido: g.clasePedido ?? "",
			modalidad: g.modalidad ?? "",
			lineas: enviadas.map((l) => ({
				material: l.material,
				cantidad: l.cantidad,
				um: unidad,
				// Un vehiculo se vende desde el centro y el almacen donde esta, no desde el centro del perfil.
				centro: l.centroVeh || perfil.centro || "",
				almacen: l.almacenVeh || (typeof almacen === "function" ? almacen(perfil.centro ?? "") : almacen),
				precio: l.bonificacion ? 0 : (l.precioFinal ?? l.precio),
				...(l.variante ? { variante: l.variante } : {}),
				...(l.bonificacion ? { bonif: "Z" as const, padre: enviadas.findIndex((p) => !p.bonificacion && p.uid === l.origen) } : {})
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
export function almacenDeCentro(centro: string, almacenPorCentro: Record<string, string>, almacenDelPerfil = "", centroDelPerfil = ""): string {
	// El almacen que el administrador fijo en el perfil del vendedor manda en el centro del perfil; en otro centro rige la regla practica.
	if (almacenDelPerfil && centro === centroDelPerfil) {
		return almacenDelPerfil;
	}
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

/** Modalidad de repuestos con envio al cliente (YCOTIZ_MODAL en DS4/130: canal 10, pedido Z310). */
export const MODALIDAD_DESPACHO = "rep_despacho";

/**
 * Modalidad de un grupo de REPUESTOS cuando el vendedor cambia la entrega (pruebas del 28/10/2026). Con envio pasa a despacho a cliente, salvo
 * que la suya ya sea de envio (p. ej. web); al volver a recojo, la de despacho vuelve a la por defecto del canal. undefined = no cambia.
 */
export function modalidadParaEntrega(actual: { key: string; expedicion: string } | undefined, envio: boolean, porDefectoRecojo: string): string | undefined {
	if (envio) {
		return actual?.expedicion === "envio" ? undefined : MODALIDAD_DESPACHO;
	}
	return actual?.key === MODALIDAD_DESPACHO ? porDefectoRecojo : undefined;
}

export interface LineaTotales {
	total: number;
	iscPct?: number;
	/** Impuesto real de SAP; solo las lineas leidas del documento SAP lo traen. */
	impuesto?: number;
	/** ISC e IGV por separado (ZISC y ZIGV del documento SAP); si todas las lineas los traen, el total es neto + ISC + IGV. */
	isc?: number;
	igvImporte?: number;
	/**
	 * true si `total` es el precio FINAL (con IGV incluido) y isc / igvImporte son la parte de impuesto que SAP EXTRAE de ese precio: asi
	 * funciona la lista Z300 para un cliente sujeto a IGV (neto = precio / 1.18; IGV = precio x 18/118). El total NO se suma de nuevo.
	 */
	impuestoIncluido?: boolean;
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
 * Motivo por el que SAP no creo la oferta, tal como el proceso de fondo lo deja en el comentario de la cotizacion
 * ("[Oferta grupo 01] Sold-to party ... not maintained ..."), sin el prefijo. Si el comentario es de otra cosa, vacio.
 */
export function motivoOfertaFallida(comentario: string | undefined): string {
	const m = /^\[Oferta grupo \d+\]\s*(.*)$/s.exec((comentario ?? "").trim());
	return m ? m[1].trim() : "";
}

/** Precio unitario con impuestos de una posicion de un documento SAP: (valor neto + ISC + IGV) / cantidad. Sin cantidad no hay precio. */
export function precioFinalDePosicion(netwr: number, impuesto: number, cantidad: number): number | undefined {
	return cantidad > 0 ? redondear((netwr + impuesto) / cantidad) : undefined;
}

/**
 * Totales de la oferta. El IGV sale de SAP (VBAP-MWSBP por posicion): si alguna linea no lo trae, el IGV se
 * considera desconocido (0 y igvConocido=false) y el total es solo la suma de las lineas. Con IGV conocido,
 * total = suma de las lineas + IGV, como Total = Netwr + ImpuestoTotal en el servicio.
 * El precio de lista de vehiculos ya incluye el ISC: se separa neto e ISC solo para informar.
 */
/**
 * "IGV 0 % (exonerado)" solo se puede decir cuando HAY una base y el IGV es cero. Con base cero (documento sin precio) el IGV es 0 aunque
 * SAP haya aplicado el 18 %: ahi no hay exoneracion, solo falta el precio.
 */
export function igvExonerado(t: { desglose: boolean; igv: number; subtotal: number }): boolean {
	return t.desglose && t.igv === 0 && t.subtotal > 0;
}

export function totalesDeOferta(lineas: LineaTotales[]): TotalesOferta {
	const subtotal = lineas.reduce((acc, l) => acc + l.total, 0);
	if (lineas.length > 0 && lineas.every((l) => l.isc !== undefined && l.igvImporte !== undefined)) {
		// Documento SAP: el valor de las lineas ya es neto; se suma el ISC y el IGV reales (el IGV puede ser 0 si esta exonerado).
		const iscSap = redondear(lineas.reduce((acc, l) => acc + (l.isc ?? 0), 0));
		const igvSap = redondear(lineas.reduce((acc, l) => acc + (l.igvImporte ?? 0), 0));
		if (lineas.every((l) => l.impuestoIncluido)) {
			// Estimacion antes de guardar: el total ya es el precio final; el neto es el precio sin los impuestos que SAP extrae.
			const bruto = redondear(subtotal);
			const neto = redondear(bruto - iscSap - igvSap);
			return { subtotal: neto, neto, isc: iscSap, hayIsc: iscSap > 0, igv: igvSap, igvConocido: true, total: bruto, desglose: true };
		}
		return { subtotal, neto: redondear(subtotal), isc: iscSap, hayIsc: iscSap > 0, igv: igvSap, igvConocido: true, total: redondear(subtotal + iscSap + igvSap), desglose: true };
	}
	const isc = redondear(lineas.reduce((acc, l) => acc + l.total - l.total / (1 + (l.iscPct ?? 0) / 100), 0));
	const igvConocido = lineas.length > 0 && lineas.every((l) => l.impuesto !== undefined);
	const igv = igvConocido ? redondear(lineas.reduce((acc, l) => acc + (l.impuesto ?? 0), 0)) : 0;
	return { subtotal, neto: redondear(subtotal - isc), isc, hayIsc: isc > 0, igv, igvConocido, total: redondear(subtotal + igv), desglose: false };
}

/**
 * Organizacion de ventas de VEHICULOS que corresponde a la de repuestos de un perfil: la de la misma sociedad (11xx SOCOPUR, 12xx PROMOTORA
 * GENESIS, 13xx SOCOPUR SELVA). Verificado en DS4/130: comparten centros y sus oficinas estan asignadas tambien a la org de vehiculos
 * (excepcion: una oficina de 1303 no esta en 1301). 1102/1202/1302 no venden vehiculos (o solo en el canal 11 de 3101/3201), por eso van a su org de vehiculos.
 */
const ORG_VEHICULOS_DE: Record<string, string> = { "1102": "1101", "1103": "1101", "1202": "1201", "1203": "1201", "1302": "1301", "1303": "1301" };

export function orgVehiculosDe(orgRepuestos: string): string | undefined {
	return ORG_VEHICULOS_DE[orgRepuestos];
}

/**
 * Permiso para vender vehiculos de un centro distinto al del perfil (la factura y la salida de mercancia saldrian de otro centro y afectan su stock).
 * Por ahora solo el rol administrador (A) de YCOTIZ_VENDEDOR; un permiso propio por vendedor queda pendiente de definir con Socopur.
 */
export function puedeVenderOtroCentro(rol?: string): boolean {
	return rol === "A";
}

/**
 * true si el cliente SI esta dado de alta en la organizacion y el canal pero NO en el sector de la cabecera de la oferta (SAP rechaza el documento:
 * "No se ha creado el solicitante para area de ventas org canal sector"). Las areas de SAP vienen como organizacion/canal/sector; una area sin
 * sector (la que agrega "ampliar area") vale para cualquier sector. Sin sector o sin areas conocidas no se puede decidir y devuelve false.
 */
export function faltaSectorDeVentas(areasCliente: string[] | undefined, orgVentas: string | undefined, canal: string, sector: string | undefined): boolean {
	if (!areasCliente?.length || !orgVentas || !canal || !sector) {
		return false;
	}
	const delArea = areasCliente.map((a) => a.split("/")).filter((p) => p[0] === orgVentas && p[1] === canal);
	if (delArea.length === 0 || delArea.some((p) => p.length < 3)) {
		return false;
	}
	return !delArea.some((p) => p[2] === sector);
}

/**
 * Primer sector del grupo en el que el cliente no esta dado de alta: el de la cabecera y el propio de cada material. SAP revisa tambien
 * el sector de cada posicion: en mostrador (cabecera 99) rechazo la oferta de OSANTRAK, ampliado a 1103/11/99 pero no a 1103/11/51, con
 * "Sold-to party ... not maintained for sales area 1103 11 51" (27/10/2026). undefined = no falta ninguno o no se puede saber.
 */
/**
 * Sectores de un grupo que SAP revisa en el area de ventas del cliente: el propio de cada material y el de cada regalo de venta cruzada (Zeta),
 * que el Cotizador envia como posicion. La oferta de JYAS MOTORS del 28/10/2026 se rechazo por el lapicero y la franela de la llanta
 * SFX-18X300-C051, de sector 90: "No se ha creado el solicitante 100024840 para area de ventas 1103 10 90". El regalo ZNA0 lo agrega SAP.
 */
export function sectoresDeLineas(lineas: LineaCarrito[]): string[] {
	return lineas.flatMap((l) => (!l.bonificacion ? [l.sectorMaterial ?? l.sector] : l.mecanismo === "ZETA" && l.sectorRegalo ? [l.sectorRegalo] : []));
}

export function sectorQueFalta(
	areasCliente: string[] | undefined,
	orgVentas: string | undefined,
	canal: string,
	sectorCabecera: string,
	sectoresLineas: string[]
): string | undefined {
	return [...new Set([sectorCabecera, ...sectoresLineas].filter(Boolean))].find((s) => faltaSectorDeVentas(areasCliente, orgVentas, canal, s));
}
