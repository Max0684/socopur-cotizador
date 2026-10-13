import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Alta y edicion de clientes contra YUI_COTIZ_SRV (entidades ClienteAlta, ClienteEdicion, ClienteEdicionBloqueo y ClienteCambio).
 * El contrato esta en Proyecto Socopur/03_Arquitectura/CONTRATO_FRONT_ALTA_EDICION_CLIENTE.md. Cada operacion solo se usa si el $metadata ya
 * publica la entidad (ver `serviciosDeCliente`); si no, la pantalla sigue en modo simulado.
 */

export interface DatosAlta {
	tipoDoc: string;
	doc: string;
	razon1: string;
	razon2: string;
	razon3: string;
	dir1: string;
	dir2: string;
	dir3: string;
	dep: string;
	prov: string;
	dist: string;
	celular: string;
	email: string;
}

export interface ResultadoAlta {
	kunnr: string;
	/** false = el documento ya existia en SAP y no se creo otro; kunnr es el del cliente existente. */
	creado: boolean;
	mensaje: string;
}

export interface CambiosCliente {
	razon1?: string;
	razon2?: string;
	razon3?: string;
	celular?: string;
	email?: string;
	/** Numero de la direccion fiscal a modificar (ClienteDireccion.Addrnumber). */
	addrnumber?: string;
	dir1?: string;
	dir2?: string;
	dir3?: string;
	dep?: string;
	prov?: string;
	dist?: string;
}

export interface BloqueoEdicion {
	nombreBloqueado: boolean;
	nombreMotivo: string;
	direccionBloqueada: boolean;
	direccionMotivo: string;
}

export interface CambioCliente {
	fecha: string;
	usuario: string;
	campo: string;
	antes: string;
	despues: string;
}

export interface ServiciosDeCliente {
	alta: boolean;
	edicion: boolean;
	bloqueo: boolean;
	historial: boolean;
	/** Catalogo real de departamento/provincia/distrito (UbigeoCatalogo). Sin el, la pantalla usa el de ejemplo. */
	ubigeo: boolean;
}

/** Arbol que usan los desplegables en cascada del alta. */
export interface NodoUbigeo {
	dep: string;
	provincias: { prov: string; distritos: string[] }[];
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");
const texto = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const verdadero = (v: unknown): boolean => v === true || v === "X";

/** Que partes del contrato publica ya el servicio. Un campo o entidad desconocidos en una peticion hacen que SAP la rechace entera. */
export async function serviciosDeCliente(modelo: ODataModel): Promise<ServiciosDeCliente> {
	const [alta, edicion, bloqueo, historial, ubigeo] = await Promise.all([
		entidadTieneCampo(modelo, "ClienteAlta", "Doc"),
		entidadTieneCampo(modelo, "ClienteEdicion", "Kunnr"),
		entidadTieneCampo(modelo, "ClienteEdicionBloqueo", "NombreBloqueado"),
		entidadTieneCampo(modelo, "ClienteCambio", "Campo"),
		entidadTieneCampo(modelo, "UbigeoCatalogo", "Distrito")
	]);
	return { alta, edicion, bloqueo, historial, ubigeo };
}

/** Cuerpo del create de ClienteAlta: todo recortado y con el largo de los campos de SAP. */
export function cuerpoAlta(a: DatosAlta): Record<string, string> {
	const corto = (v: string, largo: number): string => texto(v).trim().slice(0, largo);
	return {
		TipoDoc: a.tipoDoc,
		Doc: corto(a.doc, 11),
		Razon1: corto(a.razon1, 35),
		Razon2: corto(a.razon2, 35),
		Razon3: corto(a.razon3, 35),
		Dir1: corto(a.dir1, 35),
		Dir2: corto(a.dir2, 35),
		Dir3: corto(a.dir3, 35),
		Dep: corto(a.dep, 40),
		Prov: corto(a.prov, 40),
		Dist: corto(a.dist, 40),
		Celular: corto(a.celular.replace(/\s/g, ""), 9),
		Email: corto(a.email, 241)
	};
}

/** Solo los campos que cambiaron, con el nombre que espera ClienteEdicion. */
export function cuerpoEdicion(cambios: CambiosCliente): Record<string, string> {
	const nombres: Record<keyof CambiosCliente, string> = {
		razon1: "Razon1",
		razon2: "Razon2",
		razon3: "Razon3",
		celular: "Celular",
		email: "Email",
		addrnumber: "Addrnumber",
		dir1: "Dir1",
		dir2: "Dir2",
		dir3: "Dir3",
		dep: "Dep",
		prov: "Prov",
		dist: "Dist"
	};
	const cuerpo: Record<string, string> = {};
	for (const [clave, valor] of Object.entries(cambios) as [keyof CambiosCliente, string | undefined][]) {
		if (valor !== undefined) {
			cuerpo[nombres[clave]] = valor.trim();
		}
	}
	return cuerpo;
}

export interface EsperaAlta {
	/** Cada cuanto se vuelve a leer la solicitud (ms). */
	intervaloMs?: number;
	/** Tiempo maximo de espera (ms). */
	maximoMs?: number;
	/** Pausa entre lecturas; se puede reemplazar en las pruebas. */
	pausa?: (ms: number) => Promise<void>;
}

/** La solicitud sigue en proceso en SAP: no es un fallo, el cliente aparecera en unos minutos. */
export class AltaEnProcesoError extends Error {}

const pausaReal = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

export function aResultadoAlta(r: Record<string, unknown>): ResultadoAlta {
	return { kunnr: texto(r.Kunnr), creado: r.Creado === undefined ? true : verdadero(r.Creado), mensaje: texto(r.Mensaje) };
}

/** Sin Kunnr y con el aviso «en proceso»: el cliente se esta creando en segundo plano. Cualquier otro mensaje sin Kunnr es un rechazo. */
const sigueEnProceso = (r: ResultadoAlta): boolean => !r.kunnr && /proceso/i.test(r.mensaje);

/**
 * Crea el cliente en SAP. Las validaciones (formato, ubigeo, documento repetido) son inmediatas: un rechazo llega como error con el mensaje de
 * negocio o como creado=false con su motivo, y un documento repetido devuelve el Kunnr existente. La creacion real corre en segundo plano:
 * el POST vuelve con la solicitud «en proceso» y se vuelve a leer hasta que traiga el Kunnr o un mensaje de error.
 */
export async function crearClienteSap(modelo: ODataModel, datos: DatosAlta, espera: EsperaAlta = {}): Promise<ResultadoAlta> {
	const contexto = modelo.bindList("/ClienteAlta").create(cuerpoAlta(datos), true);
	await contexto.created();
	let r = aResultadoAlta(contexto.getObject() as Record<string, unknown>);
	const intervalo = espera.intervaloMs ?? 2000;
	const maximo = espera.maximoMs ?? 90000;
	const pausa = espera.pausa ?? pausaReal;
	for (let transcurrido = 0; sigueEnProceso(r) && transcurrido < maximo; transcurrido += intervalo) {
		await pausa(intervalo);
		r = aResultadoAlta((await modelo.bindContext(contexto.getPath(), undefined, { $$ownRequest: true }).requestObject()) as Record<string, unknown>);
	}
	if (sigueEnProceso(r)) {
		throw new AltaEnProcesoError(r.mensaje);
	}
	return r;
}

/** Pasa la fila de ClienteEdicionBloqueo a lo que muestra la pantalla. */
export function aBloqueo(f: Record<string, unknown>): BloqueoEdicion {
	return {
		nombreBloqueado: verdadero(f.NombreBloqueado),
		nombreMotivo: texto(f.NombreMotivo),
		direccionBloqueada: verdadero(f.DireccionBloqueada),
		direccionMotivo: texto(f.DireccionMotivo)
	};
}

/**
 * Bloqueos de edicion del cliente (p. ej. anticipo abierto). Si no se puede leer devuelve null: no se inventa un bloqueo, y el backend vuelve
 * a validar al guardar.
 */
export async function leerBloqueoEdicion(modelo: ODataModel, kunnr: string): Promise<BloqueoEdicion | null> {
	try {
		const filas = await modelo.bindList("/ClienteEdicionBloqueo", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 1);
		return filas.length ? aBloqueo(filas[0].getObject() as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

/** Envia los cambios (PATCH de ClienteEdicion). El mensaje del backend, si rechaza, llega como error. */
export async function modificarClienteSap(modelo: ODataModel, kunnr: string, cambios: CambiosCliente): Promise<void> {
	const cuerpo = cuerpoEdicion(cambios);
	const filas = await modelo.bindList("/ClienteEdicion", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 1);
	const contexto = filas[0];
	if (!contexto) {
		throw new Error(`SAP no encontro al cliente ${kunnr} para editarlo`);
	}
	for (const [campo, valor] of Object.entries(cuerpo)) {
		await contexto.setProperty(campo, valor, "$auto");
	}
	await modelo.submitBatch("$auto");
}

export function aCambio(f: Record<string, unknown>): CambioCliente {
	return { fecha: texto(f.Fecha).slice(0, 10), usuario: texto(f.Usuario), campo: texto(f.Campo), antes: texto(f.ValorAntes), despues: texto(f.ValorDespues) };
}

/** Ultimos cambios del cliente (quien, cuando y que campo), los mas recientes primero. */
export async function leerCambiosCliente(modelo: ODataModel, kunnr: string, maximo = 50): Promise<CambioCliente[]> {
	const filas = await modelo
		.bindList("/ClienteCambio", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'`, $orderby: "Fecha desc,Hora desc" })
		.requestContexts(0, maximo);
	return filas.map((c) => aCambio(c.getObject() as Record<string, unknown>));
}

interface FilaUbigeo {
	Departamento?: string;
	Provincia?: string;
	Distrito?: string;
}

/** Agrupa las filas planas (Departamento, Provincia, Distrito) en departamento -> provincia -> distritos, todo ordenado y sin repetidos. */
export function arbolUbigeo(filas: FilaUbigeo[]): NodoUbigeo[] {
	const deps = new Map<string, Map<string, Set<string>>>();
	for (const f of filas) {
		if (!f.Departamento || !f.Provincia || !f.Distrito) {
			continue;
		}
		const provs = deps.get(f.Departamento) ?? new Map<string, Set<string>>();
		const dists = provs.get(f.Provincia) ?? new Set<string>();
		dists.add(f.Distrito);
		provs.set(f.Provincia, dists);
		deps.set(f.Departamento, provs);
	}
	const orden = (a: string, b: string): number => a.localeCompare(b, "es");
	return [...deps.keys()].sort(orden).map((dep) => ({
		dep,
		provincias: [...(deps.get(dep) as Map<string, Set<string>>).keys()].sort(orden).map((prov) => ({
			prov,
			distritos: [...((deps.get(dep) as Map<string, Set<string>>).get(prov) as Set<string>)].sort(orden)
		}))
	}));
}

/** Catalogo real de ubigeo (unas 2 mil filas). Quien lo llame debe haber comprobado `servicios.ubigeo`. */
export async function cargarUbigeo(modelo: ODataModel): Promise<NodoUbigeo[]> {
	const filas = await modelo.bindList("/UbigeoCatalogo", undefined, undefined, undefined, { $select: "Departamento,Provincia,Distrito" }).requestContexts(0, 5000);
	return arbolUbigeo(filas.map((c) => c.getObject() as FilaUbigeo));
}
