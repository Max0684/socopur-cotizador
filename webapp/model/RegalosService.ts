import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Promociones de regalo de un material (entidad Regalo de YUI_COTIZ_SRV = YCL_COTIZ_REGALO, publicada el 28/10/2026). SAP devuelve una fila
 * por escala de cada promocion vigente: ZNA0 (VK11/VK12, KONDN + KONDNS) y Zeta (venta cruzada, ZSDP010). Con cantidad, marca cual aplica.
 * Verificado por OData en el 130: SFX428H-150-MTK en 1103/10/1101 con 200 UN -> 20 PM-13008-C; con 700 -> 7 baterias y ningun filtro.
 */
export interface ConsultaRegalo {
	kunnr: string;
	vkorg: string;
	vtweg: string;
	matnr: string;
	spart?: string;
	vkbur?: string;
	/** Sin cantidad (o 0) solo se listan las promociones. */
	cantidad?: number;
	/** Centro y almacen de la cabecera: con ellos SAP informa el stock libre del regalo ahi (SAP del 29/10/2026 en adelante). */
	werks?: string;
	lgort?: string;
}

/** ZNA0: SAP agrega sola la linea de regalo al crear la oferta. ZETA: no la agrega; la envia el Cotizador (Bonif "Z"). */
export type Mecanismo = "ZNA0" | "ZETA";

/** A aplica con esta cantidad, N no alcanza el minimo, E excluida (gana otra escala o la ZNA0), vacio = solo lista. */
export type EstadoRegalo = "" | "A" | "N" | "E";

export interface PromoRegalo {
	mecanismo: Mecanismo;
	promocion: string;
	escala: string;
	/** Cantidad minima, base y cantidad gratis por cada base. */
	desde: number;
	porCada: number;
	regaloPorCada: number;
	unidad: string;
	matnrRegalo: string;
	descRegalo: string;
	unidadRegalo: string;
	/** Sector del material de regalo: si el cliente no esta en el area de ese sector, SAP rechaza la oferta (visto el 28/10/2026 con sector 90). */
	spartRegalo: string;
	/** 1 gratis incluida en la cantidad, 2 gratis adicional, 3 incluida sin posicion propia. */
	tipo: string;
	estado: EstadoRegalo;
	cantidadRegalo: number;
	mensaje: string;
	/** Stock libre del regalo en el centro/almacen de la cabecera; sin valor si SAP no lo consulto. */
	stockRegalo?: number;
}

interface FilaRegalo {
	Mecanismo?: string;
	Promocion?: string;
	Escala?: string;
	Desde?: string | number;
	PorCada?: string | number;
	RegaloPorCada?: string | number;
	Unidad?: string;
	MatnrRegalo?: string;
	DescRegalo?: string;
	UnidadRegalo?: string;
	SpartRegalo?: string;
	Tipo?: string;
	Estado?: string;
	CantidadRegalo?: string | number;
	Mensaje?: string;
	StockRegalo?: string | number;
	StockLeido?: string;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

export function filtroRegalo(c: ConsultaRegalo): string {
	const partes = [`Kunnr eq '${comillas(c.kunnr)}'`, `Vkorg eq '${comillas(c.vkorg)}'`, `Vtweg eq '${comillas(c.vtweg)}'`, `Matnr eq '${comillas(c.matnr)}'`];
	if (c.spart) {
		partes.push(`Spart eq '${comillas(c.spart)}'`);
	}
	if (c.vkbur) {
		partes.push(`Vkbur eq '${comillas(c.vkbur)}'`);
	}
	if (c.cantidad && c.cantidad > 0) {
		partes.push(`Cantidad eq ${c.cantidad}`);
	}
	if (c.werks) {
		partes.push(`Werks eq '${comillas(c.werks)}'`);
		if (c.lgort) {
			partes.push(`Lgort eq '${comillas(c.lgort)}'`);
		}
	}
	return partes.join(" and ");
}

export function promoDeFila(f: FilaRegalo): PromoRegalo {
	const texto = (v?: string): string => (v ?? "").trim();
	const estado = texto(f.Estado);
	return {
		mecanismo: texto(f.Mecanismo) === "ZETA" ? "ZETA" : "ZNA0",
		promocion: texto(f.Promocion).replace(/^0+(?=\d)/, ""),
		escala: texto(f.Escala),
		desde: Number(f.Desde ?? 0),
		porCada: Number(f.PorCada ?? 0),
		regaloPorCada: Number(f.RegaloPorCada ?? 0),
		unidad: texto(f.Unidad),
		matnrRegalo: texto(f.MatnrRegalo),
		descRegalo: texto(f.DescRegalo),
		unidadRegalo: texto(f.UnidadRegalo),
		spartRegalo: texto(f.SpartRegalo),
		tipo: texto(f.Tipo),
		estado: estado === "A" || estado === "N" || estado === "E" ? estado : "",
		cantidadRegalo: Number(f.CantidadRegalo ?? 0),
		mensaje: texto(f.Mensaje),
		...(texto(f.StockLeido) === "X" ? { stockRegalo: Number(f.StockRegalo ?? 0) } : {})
	};
}

/** El servicio informa el stock del regalo (Werks/Lgort y StockRegalo, desde el 29/10/2026). */
export function regaloConStock(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "Regalo", "StockRegalo");
}

export async function consultarRegalos(modelo: ODataModel, consulta: ConsultaRegalo): Promise<PromoRegalo[]> {
	// Un filtro por un campo que el servicio no tiene hace que SAP rechace la consulta: centro y almacen solo si los publica.
	const conStock = !!consulta.werks && (await regaloConStock(modelo));
	const pedida = conStock ? consulta : { ...consulta, werks: undefined, lgort: undefined };
	const filas = await modelo.bindList("/Regalo", undefined, undefined, undefined, { $filter: filtroRegalo(pedida) }).requestContexts(0, 100);
	return filas.map((c) => promoDeFila(c.getObject() as FilaRegalo));
}

/** Los regalos que SAP daria con la cantidad consultada (estado A y cantidad mayor que cero). */
export function regalosQueAplican(promos: PromoRegalo[]): PromoRegalo[] {
	return promos.filter((p) => p.estado === "A" && p.cantidadRegalo > 0);
}

/** 10 -> "10", 2.5 -> "2.5": las cantidades llegan con 3 decimales y en pantalla se ven sin los ceros. */
export function cantidadTxt(n: number): string {
	return String(Math.round(n * 1000) / 1000);
}

/** Cuanto falta de stock para entregar el regalo (0 si alcanza o si SAP no informo el stock). Solo avisa: la oferta se guarda igual. */
export function faltanteStock(p: PromoRegalo): number {
	return p.stockRegalo === undefined ? 0 : Math.max(0, Math.round((p.cantidadRegalo - p.stockRegalo) * 1000) / 1000);
}

/** La escala mas cercana que la cantidad todavia no alcanza (estado N): para decir "llevando N UN recibe ...". */
export function proximoRegalo(promos: PromoRegalo[], cantidad: number): PromoRegalo | undefined {
	return promos.filter((p) => p.estado === "N" && p.desde > cantidad).sort((a, b) => a.desde - b.desde)[0];
}

/**
 * Regalos de venta cruzada (Zeta) que SAP no da porque el material tiene una ZNA0: la clase de condicion es exclusiva y gana la ZNA0,
 * aunque la cantidad no llegue a su minimo (SFX428H-150-MTK con 50 UN no recibe nada). Si alguna Zeta aplica, la exclusion de las
 * otras es por un registro mas especifico, no por la ZNA0.
 */
export function zetaExcluidasPorZna0(promos: PromoRegalo[]): PromoRegalo[] {
	if (!promos.some((p) => p.mecanismo === "ZNA0") || promos.some((p) => p.mecanismo === "ZETA" && p.estado === "A")) {
		return [];
	}
	return promos.filter((p) => p.mecanismo === "ZETA" && p.estado === "E");
}

/** Clave para saber si los regalos de una linea cambiaron (y avisar solo entonces). */
export function claveRegalos(promos: PromoRegalo[]): string {
	return regalosQueAplican(promos)
		.map((p) => `${p.mecanismo}:${p.matnrRegalo}:${p.cantidadRegalo}`)
		.join("|");
}
