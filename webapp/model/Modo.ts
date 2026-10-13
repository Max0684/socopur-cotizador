/**
 * Decide si la app usa el servicio real de SAP o los datos de ejemplo (prototipo).
 * - `?odata=1` fuerza SAP real y `?odata=0` fuerza el prototipo.
 * - Sin la marca: en `localhost` (desarrollo sin proxy) queda el prototipo; en cualquier otro servidor (la app publicada en BTP) usa SAP real,
 *   porque alli la URL la arma el Launchpad y no lleva la marca.
 */
export function usarODataEn(busqueda: string, host: string): boolean {
	const marca = new URLSearchParams(busqueda).get("odata");
	if (marca === "1") {
		return true;
	}
	if (marca === "0") {
		return false;
	}
	return !["localhost", "127.0.0.1", "[::1]", "::1", ""].includes(host);
}

/** Lo mismo con la direccion actual del navegador. */
export function usarOData(): boolean {
	return usarODataEn(window.location.search, window.location.hostname);
}
