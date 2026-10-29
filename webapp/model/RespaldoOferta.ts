/**
 * Respaldo en el navegador (localStorage) de la oferta NUEVA que se esta armando, para no perder los articulos si el navegador o la
 * pestana se cierran antes de guardar. Uno por vendedor; se borra al guardar en SAP o al descartar y vence a los 7 dias.
 * Los precios respaldados no se toman como definitivos: al recuperar, las lineas se vuelven a preciar con SAP.
 */
export const VERSION_RESPALDO = 1;
const PREFIJO = "socopur.cotizador.respaldo.";
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

/** Lo que se respalda de la oferta: cliente, lineas y los datos de cabecera que el vendedor eligio. */
export interface DatosRespaldo {
	cliente: unknown;
	lineas: unknown[];
	perfil: Record<string, unknown>;
	entrega: string;
	entregaDatos: Record<string, unknown>;
	fechaEntrega: string;
	modalidadesGrupo: Record<string, unknown>;
}

export interface Respaldo extends DatosRespaldo {
	version: number;
	/** ISO, hora del navegador. */
	guardadoEn: string;
}

/** Almacen minimo: localStorage, o uno en memoria en las pruebas. */
export interface Almacen {
	getItem(clave: string): string | null;
	setItem(clave: string, valor: string): void;
	removeItem(clave: string): void;
}

export function claveRespaldo(vendedor: string): string {
	return `${PREFIJO}${vendedor.trim() || "sin-vendedor"}`;
}

/** localStorage del navegador; undefined si esta bloqueado (modo privado estricto, politicas). */
export function almacenDelNavegador(): Almacen | undefined {
	try {
		return globalThis.localStorage ?? undefined;
	} catch {
		return undefined;
	}
}

/** Escribe el respaldo. false si no hay almacen o esta lleno: el respaldo nunca debe interrumpir el trabajo. */
export function guardarRespaldo(almacen: Almacen | undefined, clave: string, datos: DatosRespaldo, ahora = new Date()): boolean {
	if (!almacen) {
		return false;
	}
	try {
		almacen.setItem(clave, JSON.stringify({ ...datos, version: VERSION_RESPALDO, guardadoEn: ahora.toISOString() }));
		return true;
	} catch {
		return false;
	}
}

export function borrarRespaldo(almacen: Almacen | undefined, clave: string): void {
	try {
		almacen?.removeItem(clave);
	} catch {
		// nada que hacer
	}
}

/** Respaldo vigente y con al menos una linea; null si no hay. Uno danado, de otra version o vencido se borra. */
export function leerRespaldo(almacen: Almacen | undefined, clave: string, ahora = new Date()): Respaldo | null {
	let texto: string | null = null;
	try {
		texto = almacen?.getItem(clave) ?? null;
	} catch {
		return null;
	}
	if (!texto) {
		return null;
	}
	try {
		const respaldo = JSON.parse(texto) as Respaldo;
		const edad = ahora.getTime() - new Date(respaldo.guardadoEn).getTime();
		if (respaldo.version === VERSION_RESPALDO && Array.isArray(respaldo.lineas) && respaldo.lineas.length > 0 && edad <= VIGENCIA_MS) {
			return respaldo;
		}
	} catch {
		// danado: se borra abajo
	}
	borrarRespaldo(almacen, clave);
	return null;
}

/** Siguiente numero para los uid "L<n>": las lineas que se agreguen despues de recuperar no deben repetir el de una recuperada. */
export function siguienteContador(lineas: { uid?: string }[], actual: number): number {
	return lineas.reduce((mayor, l) => {
		const n = /^L(\d+)$/.exec(l.uid ?? "");
		return n ? Math.max(mayor, Number(n[1])) : mayor;
	}, actual);
}
