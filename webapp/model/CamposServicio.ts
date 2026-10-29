import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

const cache = new WeakMap<object, Map<string, Promise<boolean>>>();

/** Consulta el metamodelo una sola vez por modelo y clave. Sin metamodelo (pruebas) o ante cualquier error responde false. */
function consultarMetadata(modelo: ODataModel, clave: string, ruta: string, evaluar: (valor: unknown) => boolean): Promise<boolean> {
	const meta = (modelo as unknown as { getMetaModel?: () => { requestObject(ruta: string): Promise<unknown> } }).getMetaModel?.();
	if (!meta) {
		return Promise.resolve(false);
	}
	let porClave = cache.get(modelo);
	if (!porClave) {
		porClave = new Map();
		cache.set(modelo, porClave);
	}
	let respuesta = porClave.get(clave);
	if (!respuesta) {
		respuesta = meta
			.requestObject(ruta)
			.then(evaluar)
			.catch(() => false);
		porClave.set(clave, respuesta);
	}
	return respuesta;
}

/**
 * Dice si el $metadata publicado ya trae un campo de una entidad (p. ej. Precio/Vkbur). Se usa para mandar campos nuevos solo cuando el
 * servicio los tiene: un campo desconocido en un filtro o en un create hace que SAP rechace TODA la peticion. Sin metamodelo (pruebas) o
 * ante cualquier error responde false, y el campo simplemente no se envia. El resultado se guarda por modelo.
 */
export function entidadTieneCampo(modelo: ODataModel, entidad: string, campo: string): Promise<boolean> {
	return consultarMetadata(modelo, `${entidad}/${campo}`, `/${entidad}/${campo}`, (v) => v !== undefined && v !== null);
}

/**
 * Dice si una accion ligada a la entidad publica un parametro (p. ej. Grupo, crearPedido, UsuarioBtp). Lee la lista de parametros de la
 * propia accion: la ruta ".../$Parameter/X" tambien encuentra un campo X de la entidad aunque la accion no tenga ese parametro.
 */
export function accionTieneParametro(modelo: ODataModel, entidad: string, accion: string, parametro: string): Promise<boolean> {
	return consultarMetadata(modelo, `${entidad}/${accion}(${parametro})`, `/${entidad}/${accion}/@$ui5.overload/0/$Parameter`, (lista) =>
		Array.isArray(lista) && lista.some((p) => (p as { $Name?: string } | null)?.$Name === parametro)
	);
}
