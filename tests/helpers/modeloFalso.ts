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
	/** Lo que devuelve la accion crearPedido (entidad Grupo). */
	grupoDePedido?: Record<string, unknown>;
	/** Lo que devuelve la lectura de GrupoEstado; null = la lectura falla. */
	estado?: Record<string, unknown> | null;
	/** Filas que devuelve la entidad Precio. */
	precios?: Record<string, unknown>[];
}

export interface Creada {
	ruta: string;
	datos: Record<string, unknown>;
}

export function crearModeloFalso(opciones: OpcionesModeloFalso = {}) {
	const llamadas: string[] = [];
	const creadas: Creada[] = [];
	let contadorGrupo = 0;
	let contadorItem = 0;

	const modelo = {
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
				async execute() {
					llamadas.push(`execute ${ruta}`);
					if (opciones.fallaExecute?.some((f) => ruta.includes(f))) {
						throw new Error(`execute ${ruta} rechazado`);
					}
				},
				async requestObject() {
					llamadas.push(`read ${ruta}`);
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
	return { modelo, llamadas, creadas };
}
