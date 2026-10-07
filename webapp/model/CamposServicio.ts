import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

const cache = new WeakMap<object, Map<string, Promise<boolean>>>();

/**
 * Dice si el $metadata publicado ya trae un campo de una entidad (p. ej. Precio/Vkbur). Se usa para mandar campos nuevos solo cuando el
 * servicio los tiene: un campo desconocido en un filtro o en un create hace que SAP rechace TODA la peticion. Sin metamodelo (pruebas) o
 * ante cualquier error responde false, y el campo simplemente no se envia. El resultado se guarda por modelo.
 */
export function entidadTieneCampo(modelo: ODataModel, entidad: string, campo: string): Promise<boolean> {
	const meta = (modelo as unknown as { getMetaModel?: () => { requestObject(ruta: string): Promise<unknown> } }).getMetaModel?.();
	if (!meta) {
		return Promise.resolve(false);
	}
	let porClave = cache.get(modelo);
	if (!porClave) {
		porClave = new Map();
		cache.set(modelo, porClave);
	}
	const clave = `${entidad}/${campo}`;
	let respuesta = porClave.get(clave);
	if (!respuesta) {
		respuesta = meta
			.requestObject(`/${entidad}/${campo}`)
			.then((v) => v !== undefined && v !== null)
			.catch(() => false);
		porClave.set(clave, respuesta);
	}
	return respuesta;
}
