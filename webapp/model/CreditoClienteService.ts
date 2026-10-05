import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Credito y saldo del cliente (solo informativo para el vendedor: el Cotizador no libera pedidos, la decision es de Creditos).
 * Fuentes en SAP: limite por segmento de credito (UKMBP_CMS_SGM) y saldo/vencido desde partidas abiertas (BSID).
 * UKM no persiste la exposicion, por eso no se reproduce el calculo de UKM: solo se muestran limite, saldo y vencido.
 * Los nombres de campo son los PROPUESTOS por el backend (YC_COTIZ_CLICREDITO / YC_COTIZ_CLISALDO); se confirman al publicarlos.
 */

/** Fila de ClienteCredito: un limite por segmento de credito. */
interface CreditoSap {
	Kunnr: string;
	CreditSgmnt: string;
	CreditLimit?: number | string;
	/** Fecha de vencimiento del limite (AAAA-MM-DD). */
	LimitValidDate?: string;
	/** SAP lo calcula (LimitValidDate >= hoy); si falta, se calcula aqui con la fecha local. */
	Vigente?: boolean | string;
	Xblocked?: boolean | string;
	BlockReason?: string;
	RiskClass?: string;
	CheckRule?: string;
}

/** Fila de ClienteSaldo: saldo por sociedad y moneda. */
interface SaldoSap {
	Kunnr: string;
	Bukrs: string;
	Waers: string;
	SaldoAbierto?: number | string;
	Vencido?: number | string;
	Vence30?: number | string;
	SinVencer?: number | string;
}

export interface SegmentoCredito {
	segmento: string;
	limite: number;
	moneda: string;
	/** Fecha de fin de vigencia del limite (AAAA-MM-DD); vacia = sin dato. */
	vigenteHasta: string;
	vigente: boolean;
	bloqueado: boolean;
	motivoBloqueo: string;
	claseRiesgo: string;
}

export interface SaldoCliente {
	sociedad: string;
	moneda: string;
	saldo: number;
	vencido: number;
	vence30: number;
	sinVencer: number;
}

export type EstadoCuenta = "AlDia" | "Vencido" | "Bloqueado" | "LimiteVencido" | "SinDatos";

export interface ResumenCredito {
	segmentos: SegmentoCredito[];
	saldos: SaldoCliente[];
	/** Segmento elegido para la organizacion de ventas (vacio si el mapeo aun no existe). */
	segmentoElegido: SegmentoCredito | null;
	saldoTotal: number;
	vencidoTotal: number;
	/** Limite menos saldo del segmento elegido (nunca negativo); null si no hay segmento elegido. */
	disponible: number | null;
	estado: EstadoCuenta;
}

const numero = (v: number | string | undefined): number => {
	const n = Number(v ?? 0);
	return Number.isFinite(n) ? n : 0;
};

const esVerdadero = (v: boolean | string | undefined): boolean => v === true || v === "X";

/** SAP usa 9999-12-31 / 99991231 para "sin vencimiento". Acepta las dos formas y devuelve AAAA-MM-DD. */
export function normalizarFecha(texto: string | undefined): string {
	const t = (texto ?? "").trim();
	if (t === "00000000") {
		return "";
	}
	if (/^\d{8}$/.test(t)) {
		return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
	}
	return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
}

export function aSegmento(f: CreditoSap, hoy: string): SegmentoCredito {
	const hasta = normalizarFecha(f.LimitValidDate);
	return {
		segmento: f.CreditSgmnt,
		limite: numero(f.CreditLimit),
		// El segmento no trae moneda propia: se asume la de la sociedad (soles).
		moneda: "PEN",
		vigenteHasta: hasta,
		// Sin fecha se considera vigente (no hay dato para decir lo contrario); con fecha, vigente hasta ese dia inclusive.
		vigente: f.Vigente === undefined ? hasta === "" || hasta >= hoy : esVerdadero(f.Vigente),
		bloqueado: esVerdadero(f.Xblocked),
		motivoBloqueo: f.BlockReason ?? "",
		claseRiesgo: f.RiskClass ?? ""
	};
}

export function aSaldo(f: SaldoSap): SaldoCliente {
	return {
		sociedad: f.Bukrs,
		moneda: f.Waers,
		saldo: numero(f.SaldoAbierto),
		vencido: numero(f.Vencido),
		vence30: numero(f.Vence30),
		sinVencer: numero(f.SinVencer)
	};
}

/**
 * Arma el resumen. `segmentoDeOrg` dice que segmento de credito corresponde a la organizacion de ventas de la oferta
 * (el mapeo todavia no esta confirmado con el funcional: sin el, no se elige segmento y no se calcula disponible).
 * Los saldos se suman por moneda de la oferta; otras monedas no se mezclan.
 *
 * Estado, por prioridad: Bloqueado (segmento elegido bloqueado) > Vencido (hay saldo vencido) > LimiteVencido
 * (el limite del segmento elegido ya no esta vigente) > AlDia; SinDatos si SAP no devolvio ni limite ni saldo.
 */
export function resumirCredito(segmentos: SegmentoCredito[], saldos: SaldoCliente[], moneda: string, segmentoDeOrg?: string): ResumenCredito {
	const elegido = segmentoDeOrg ? (segmentos.find((s) => s.segmento === segmentoDeOrg) ?? null) : null;
	const enMoneda = saldos.filter((s) => s.moneda === moneda);
	const saldoTotal = enMoneda.reduce((a, s) => a + s.saldo, 0);
	const vencidoTotal = enMoneda.reduce((a, s) => a + s.vencido, 0);
	let estado: EstadoCuenta = "AlDia";
	if (segmentos.length === 0 && saldos.length === 0) {
		estado = "SinDatos";
	} else if (elegido?.bloqueado) {
		estado = "Bloqueado";
	} else if (vencidoTotal > 0) {
		estado = "Vencido";
	} else if (elegido && !elegido.vigente) {
		estado = "LimiteVencido";
	}
	return {
		segmentos,
		saldos,
		segmentoElegido: elegido,
		saldoTotal,
		vencidoTotal,
		disponible: elegido ? Math.max(0, elegido.limite - saldoTotal) : null,
		estado
	};
}

/** Fecha de hoy en hora local (AAAA-MM-DD): en Peru, de noche, toISOString() ya devolveria el dia siguiente. */
export function fechaLocalISO(d: Date = new Date()): string {
	const dos = (n: number): string => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** Lee limites y saldos del cliente (siempre filtrado por Kunnr: BSID tiene cientos de partidas por cliente). */
export async function cargarCreditoCliente(modelo: ODataModel, kunnr: string, hoy: string): Promise<{ segmentos: SegmentoCredito[]; saldos: SaldoCliente[] }> {
	const filtro = `Kunnr eq '${comillas(kunnr)}'`;
	const [creditos, saldos] = await Promise.all([
		modelo.bindList("/ClienteCredito", undefined, undefined, undefined, { $filter: filtro, $orderby: "CreditSgmnt" }).requestContexts(0, 50),
		modelo.bindList("/ClienteSaldo", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 50)
	]);
	return {
		segmentos: creditos.map((c) => aSegmento(c.getObject() as CreditoSap, hoy)),
		saldos: saldos.map((c) => aSaldo(c.getObject() as SaldoSap))
	};
}
