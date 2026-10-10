import type { GrupoEstado } from "./odata/Entidades";

/** Quien resuelve el bloqueo del pedido. "ninguno" = el pedido no tiene bloqueo. */
export type Destino = "caja" | "creditos" | "caseManagement" | "ninguno";

export interface BloqueoPedido {
	/** Destinos reales, en orden: primero el Z1 (Caja o Credito) y despues Credit Management. Vacio = sin bloqueo. */
	destinos: Destino[];
	/** Clave i18n y parametros del texto de la fila (columna Liberacion). */
	fila: { clave: string; parametros: string[] }[];
	/** Clave i18n del siguiente paso para el vendedor; vacio si no hay nada que hacer. */
	avisos: string[];
	/** Discrepancia con la matriz de la reunion del 09/10/2026; vacio si coincide o si la matriz no permite decidirlo. */
	discrepancia: string;
}

/** Clases con celda fija en la matriz sea cual sea la situacion del cliente. Las demas (Itinerante, Z323/Z112/Z310 a credito) dependen del cliente o no estan confirmadas. */
const RETAIL = ["Z311", "Z116"];
const CONTADO_FACTURA = ["Z311", "Z116", "Z323", "Z112"];
const CONTADO_ENTREGA = ["Z310"];

/**
 * Bloqueo real del pedido segun lo que SAP dejo en VBAK (FAKSK, LIFSK, CMGST). El Cotizador no decide ni libera nada: la matriz solo sirve
 * para detectar que SAP se comporte distinto de lo acordado (campo discrepancia, que el llamador registra en el log).
 * Devuelve null si no se pudo leer el estado: no se inventa uno.
 */
export function evaluarBloqueoPedido(real: GrupoEstado | null, clase: string, formaPago: string): BloqueoPedido | null {
	if (!real) {
		return null;
	}
	const contado = formaPago === "C000";
	const z1Factura = !!real.BloqueoFactura;
	const z1Entrega = !!real.BloqueoEntrega;
	const caseManagement = real.EstadoCredito === "B";
	const destinos: Destino[] = [];
	const fila: BloqueoPedido["fila"] = [];
	const avisos: string[] = [];
	const tipos = [z1Factura ? "Factura" : "", z1Entrega ? "Entrega" : ""].filter(Boolean);
	for (const tipo of tipos) {
		const codigo = tipo === "Factura" ? real.BloqueoFactura : real.BloqueoEntrega;
		destinos.push(contado ? "caja" : "creditos");
		fila.push({ clave: `pedidoZ1${contado ? "Caja" : "Credito"}${tipo}`, parametros: [codigo] });
		avisos.push(contado ? "pedidoAvisoCaja" : "pedidoAvisoCreditos");
	}
	if (caseManagement) {
		destinos.push("caseManagement");
		fila.push({ clave: "pedidoCaseManagement", parametros: [] });
		avisos.push("pedidoAvisoCaseManagement");
	}
	if (fila.length === 0) {
		fila.push({ clave: "pedidoSinBloqueo", parametros: [] });
	}
	return { destinos, fila, avisos: [...new Set(avisos)], discrepancia: discrepanciaConMatriz(real, clase, contado) };
}

function discrepanciaConMatriz(real: GrupoEstado, clase: string, contado: boolean): string {
	const z1Factura = !!real.BloqueoFactura;
	const z1Entrega = !!real.BloqueoEntrega;
	const cm = real.EstadoCredito === "B";
	if (contado && cm) {
		return "contado con bloqueo de Credit Management (la matriz no revisa credito en contado)";
	}
	if (contado && CONTADO_FACTURA.includes(clase) && !z1Factura) {
		return "contado sin Z1 de facturacion (la matriz espera Z1 en Bandeja Caja)";
	}
	if (contado && CONTADO_ENTREGA.includes(clase) && !z1Entrega) {
		return "contado Z310 sin Z1 de entrega (la matriz espera Z1 de entrega en Bandeja Caja)";
	}
	if (!contado && RETAIL.includes(clase) && !z1Factura) {
		return "credito Retail sin Z1 de facturacion (la matriz espera Z1 en Bandeja de Credito)";
	}
	return "";
}
