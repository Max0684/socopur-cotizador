/**
 * Validacion de DNI y RUC peruanos antes de crear un cliente. Funciones puras, sin SAP.
 * - DNI: 8 digitos; se rechazan los valores obviamente falsos (todos ceros o un mismo digito repetido).
 * - RUC: 11 digitos, empieza con 10, 15, 17 o 20, y el ultimo digito es el verificador (modulo 11 de SUNAT).
 *   El digito verificador se exige solo cuando `estricto` es true (con SAP real): el RUC de ejemplo del prototipo no lo cumple.
 */

export type ErrorDocumento = "dniFormato" | "dniFalso" | "rucFormato" | "rucDigito";

const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Digito verificador que le corresponde a los primeros 10 digitos de un RUC. */
export function digitoVerificadorRuc(base: string): number {
	const suma = PESOS_RUC.reduce((total, peso, i) => total + peso * Number(base[i]), 0);
	const d = 11 - (suma % 11);
	return d === 10 ? 0 : d === 11 ? 1 : d;
}

/** Devuelve el motivo del rechazo, o null si el documento es valido. */
export function validarDocumento(tipo: string, doc: string, estricto = true): ErrorDocumento | null {
	const d = doc.trim();
	if (tipo === "DNI") {
		if (!/^\d{8}$/.test(d)) {
			return "dniFormato";
		}
		return /^(\d)\1{7}$/.test(d) ? "dniFalso" : null;
	}
	if (tipo === "RUC") {
		if (!/^(10|15|17|20)\d{9}$/.test(d)) {
			return "rucFormato";
		}
		return estricto && digitoVerificadorRuc(d) !== Number(d[10]) ? "rucDigito" : null;
	}
	return null;
}
