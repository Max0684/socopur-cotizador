/** Hook de resolucion para los tests: los modulos de webapp/model se importan sin extension (como los carga UI5); aqui se prueba con ".ts". */
export async function resolve(especificador, contexto, siguiente) {
	try {
		return await siguiente(especificador, contexto);
	} catch (error) {
		if (error?.code === "ERR_MODULE_NOT_FOUND" && especificador.startsWith(".") && !/\.\w+$/.test(especificador)) {
			return siguiente(`${especificador}.ts`, contexto);
		}
		throw error;
	}
}
