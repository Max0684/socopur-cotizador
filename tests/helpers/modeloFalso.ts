/**
 * Modelo OData V4 falso para probar CotizacionesService sin UI5 ni SAP.
 * Registra cada llamada en `llamadas` y las entidades creadas en `creadas`, para comprobar el ORDEN y el contenido.
 */
export interface OpcionesModeloFalso {
	/** Rutas de create que deben fallar (p. ej. "_Item"). */
	fallaCreate?: string[];
	/** Fragmentos de ruta cuyo execute debe fallar (p. ej. "Activate"). */
	fallaExecute?: string[];
	/** Grupos que devuelve la lectura despues de generarOfertas. */
	gruposLeidos?: { GrupoNo: string; VbelnOferta: string; Estado?: string }[];
	/** Lecturas sucesivas de los grupos (una por llamada) para simular un grupo en proceso que termina; si se acaba, repite la ultima. */
	secuenciaGrupos?: { GrupoNo: string; VbelnOferta: string; Estado?: string }[][];
	/** Comentario de la cotizacion (SAP deja ahi el motivo cuando rechaza). */
	comentario?: string;
	/** Lecturas sucesivas del Grupo tras crearPedido (pedido en segundo plano); si se acaba, repite la ultima. */
	secuenciaPedido?: Record<string, unknown>[];
	/** Lo que devuelve la accion crearPedido (entidad Grupo). */
	grupoDePedido?: Record<string, unknown>;
	/** Lo que devuelve la lectura de GrupoEstado; null = la lectura falla. */
	estado?: Record<string, unknown> | null;
	/** Filas que devuelve la entidad Precio. */
	precios?: Record<string, unknown>[];
	/** Campos que el $metadata "publica", como "Precio/Vkbur" o "Cotizacion/Pernr"; por defecto ninguno. */
	camposPublicados?: string[];
}

export interface Creada {
	ruta: string;
	datos: Record<string, unknown>;
}

export function crearModeloFalso(opciones: OpcionesModeloFalso = {}) {
	const llamadas: string[] = [];
	const creadas: Creada[] = [];
	/** Parametros puestos en cada accion (setParameter), por ruta. */
	const parametros: Record<string, Record<string, unknown>> = {};
	let contadorGrupo = 0;
	let contadorItem = 0;

	const modelo = {
		getMetaModel() {
			return {
				async requestObject(ruta: string) {
					return opciones.camposPublicados?.includes(ruta.replace(/^\//, "")) ? {} : undefined;
				}
			};
		},
		bindList(ruta: string, _padre?: unknown, _a?: unknown, _b?: unknown, parametros?: { $filter?: string }) {
			return {
				async requestContexts() {
					llamadas.push(`read ${ruta} ${parametros?.$filter ?? ""}`);
					return (opciones.precios ?? []).map((o) => ({ getObject: () => o }));
				},
				create(datos: Record<string, unknown>) {
					llamadas.push(`create ${ruta}`);
					creadas.push({ ruta, datos });
					const clave =
						ruta === "/Cotizacion"
							? { CotizId: "COT-1" }
							: ruta === "_Grupo"
								? { GrupoNo: String(++contadorGrupo).padStart(2, "0") }
								: { Posnr: String(++contadorItem * 10).padStart(6, "0") };
					const objeto = { ...datos, ...clave };
					return {
						created: () =>
							opciones.fallaCreate?.includes(ruta) ? Promise.reject(new Error(`create ${ruta} rechazado`)) : Promise.resolve(),
						getObject: () => objeto
					};
				}
			};
		},
		bindContext(ruta: string) {
			return {
				setParameter(nombre: string, valor: unknown) {
					(parametros[ruta] ??= {})[nombre] = valor;
					return this;
				},
				async execute() {
					llamadas.push(`execute ${ruta}`);
					if (opciones.fallaExecute?.some((f) => ruta.includes(f))) {
						throw new Error(`execute ${ruta} rechazado`);
					}
				},
				async requestObject() {
					llamadas.push(`read ${ruta}`);
					if (ruta.startsWith("/Grupo(") && opciones.secuenciaPedido?.length) {
						return opciones.secuenciaPedido.length > 1 ? opciones.secuenciaPedido.shift() : opciones.secuenciaPedido[0];
					}
					if (ruta.startsWith("/GrupoEstado")) {
						if (opciones.estado === null) {
							throw new Error("sin lectura");
						}
						return opciones.estado ?? {};
					}
					if (opciones.secuenciaGrupos?.length) {
						const grupos = opciones.secuenciaGrupos.length > 1 ? opciones.secuenciaGrupos.shift() : opciones.secuenciaGrupos[0];
						return { Comentario: opciones.comentario ?? "", _Grupo: grupos };
					}
					return { Comentario: opciones.comentario ?? "", _Grupo: opciones.gruposLeidos ?? [] };
				},
				getBoundContext() {
					return { getObject: () => opciones.grupoDePedido };
				}
			};
		}
	};
	return { modelo, llamadas, creadas, parametros };
}
