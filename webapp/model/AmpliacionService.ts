import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Ampliacion retail del cliente desde el Cotizador, con la regla del boton "Validar Ampliacion Retail" de ZSDSCPP002: las areas activas de
 * ZTSD_BP_AMPRET (canales 11 y 15), las sociedades, los impuestos y los roles que le falten. Las areas mayoristas (canal 10, con credito)
 * siguen por solicitud a datos maestros.
 * - ClienteAmpliacion (YC_COTIZ_CLIAMPL): lo que le falta al cliente y el estado de la ultima solicitud. Solo lectura.
 * - Accion ampliarRetail de ClienteEdicion: valida y deja la solicitud en cola; la hace un job de fondo en SAP (necesita COMMIT), por eso
 *   se vuelve a leer el estado hasta que termine.
 */

const NS = "com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001";

export interface GrupoAreas {
	vkorg: string;
	vtweg: string;
	sectores: string[];
}

export interface EstadoAmpliacion {
	/** Le falta algo: areas, sociedades, impuestos o roles. */
	pendiente: boolean;
	areasPendientes: number;
	grupos: GrupoAreas[];
	/** Sociedades (codigo) que se le agregarian, separadas por coma. */
	sociedades: string;
	/** Ultima solicitud: A en espera | M ampliado | E error | "" ninguna. */
	estado: string;
	mensaje: string;
}

export interface EsperaAmpliacion {
	intervaloMs?: number;
	maximoMs?: number;
	pausa?: (ms: number) => Promise<void>;
}

/** La ampliacion sigue en el job de SAP: no es un fallo, las areas apareceran en unos minutos. */
export class AmpliacionEnProcesoError extends Error {}

const comillas = (texto: string): string => texto.replace(/'/g, "''");
const texto = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const pausaReal = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms));

/** Solicitud de ampliacion a un area que no es retail (mayorista): la envia SAP por correo a datos maestros. */
export interface SolicitudOtraArea {
	vkorg: string;
	/** Area pedida, ya con sus nombres (p. ej. "1101/10 Vehiculos · 10 Mayorista"). */
	area: string;
	/** Area de la que copiar las condiciones (la elegida en la oferta), si hay. */
	referencia: string;
	motivo: string;
	vendedor: string;
}

/** El servicio ya envia la solicitud por correo (accion solicitarAmpliacion de ClienteEdicion, 29/10/2026). */
export async function solicitudPublicada(modelo: ODataModel): Promise<boolean> {
	try {
		return !!(await modelo.getMetaModel().requestObject(`/${NS}.solicitarAmpliacion`));
	} catch {
		return false;
	}
}

/** Pide la ampliacion por correo. Un rechazo (sin destinatarios en ZBS_TB_CONSTA, cliente inexistente) llega como error con el motivo. */
export async function solicitarAmpliacion(modelo: ODataModel, kunnr: string, s: SolicitudOtraArea): Promise<void> {
	const filas = await modelo.bindList("/ClienteEdicion", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 1);
	if (!filas[0]) {
		throw new Error(`SAP no encontro al cliente ${kunnr}`);
	}
	const corto = (v: string, n: number): string => v.replace(/\s+/g, " ").trim().slice(0, n);
	const operacion = modelo.bindContext(`${NS}.solicitarAmpliacion(...)`, filas[0]);
	operacion.setParameter("Vkorg", s.vkorg);
	operacion.setParameter("AreaNueva", corto(s.area, 120));
	operacion.setParameter("Referencia", corto(s.referencia, 160));
	operacion.setParameter("Motivo", corto(s.motivo, 255));
	operacion.setParameter("Vendedor", corto(s.vendedor, 120));
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);
}

/** El servicio ya publica la ampliacion. Sin ella, el dialogo solo arma la solicitud a datos maestros. */
export function ampliacionPublicada(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "ClienteAmpliacion", "AreasTexto");
}

/**
 * "1101/11: 19, 20; 1201/11: 10, 11" -> un grupo por organizacion y canal. SAP corta el texto con "..." si no entra en 1333 caracteres:
 * el ultimo sector incompleto se descarta.
 */
export function gruposDeTexto(t: string): GrupoAreas[] {
	return t
		.split(";")
		.map((parte) => parte.trim())
		.filter(Boolean)
		.map((parte) => {
			const [clave = "", sectores = ""] = parte.split(":");
			const [vkorg = "", vtweg = ""] = clave.trim().split("/");
			return {
				vkorg,
				vtweg,
				sectores: sectores
					.split(",")
					.map((s) => s.trim())
					.filter((s) => s && !s.endsWith("..."))
			};
		})
		.filter((g) => g.vkorg && g.vtweg);
}

/** Fila de cualquiera de las listas del dialogo de ampliacion (areas actuales, pendientes o que se pueden solicitar). */
export interface FilaPorOrg {
	vkorg: string;
}

/** Fila agrupada por organizacion y canal: area actual o pendiente. */
export interface FilaAmpliacion extends FilaPorOrg {
	titulo: string;
	detalle: string;
}

/** Organizaciones de las listas del dialogo, sin repetir y ordenadas: las opciones del filtro. */
export function organizacionesDe(...listas: FilaPorOrg[][]): string[] {
	return [...new Set(listas.flat().map((f) => f.vkorg).filter(Boolean))].sort();
}

/** Filtro del dialogo: vacio = todas las organizaciones. */
export function filtrarPorOrg<T extends FilaPorOrg>(filas: T[], vkorg: string): T[] {
	return vkorg ? filas.filter((f) => f.vkorg === vkorg) : filas;
}

export function aEstadoAmpliacion(f: Record<string, unknown>): EstadoAmpliacion {
	return {
		pendiente: f.Pendiente === true || f.Pendiente === "X",
		areasPendientes: Number(f.AreasPendientes ?? 0),
		grupos: gruposDeTexto(texto(f.AreasTexto)),
		sociedades: texto(f.Sociedades),
		estado: texto(f.Estado),
		mensaje: texto(f.Mensaje)
	};
}

/** Lo que le falta al cliente y su ultima solicitud. null si SAP no devuelve fila (cliente inexistente). */
export async function leerAmpliacion(modelo: ODataModel, kunnr: string): Promise<EstadoAmpliacion | null> {
	const filas = await modelo
		.bindList("/ClienteAmpliacion", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` })
		.requestContexts(0, 1);
	return filas.length ? aEstadoAmpliacion(filas[0].getObject() as Record<string, unknown>) : null;
}

/**
 * Pide la ampliacion y espera al job. Un rechazo (ya tiene todo, otra en curso, cliente bloqueado por otro usuario) llega como error con el
 * mensaje de SAP. Devuelve el estado final: M ampliado o E con el motivo. Si el job no termina a tiempo, AmpliacionEnProcesoError.
 */
export async function ampliarRetail(modelo: ODataModel, kunnr: string, espera: EsperaAmpliacion = {}): Promise<EstadoAmpliacion> {
	const filas = await modelo.bindList("/ClienteEdicion", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 1);
	if (!filas[0]) {
		throw new Error(`SAP no encontro al cliente ${kunnr}`);
	}
	const operacion = modelo.bindContext(`${NS}.ampliarRetail(...)`, filas[0]);
	// ui5lint-disable-next-line no-deprecated-api -- invoke() existe desde UI5 1.123; el servidor de Socopur y los tipos son 1.120
	await operacion.execute("$auto", true);

	const intervalo = espera.intervaloMs ?? 3000;
	const maximo = espera.maximoMs ?? 120000;
	const pausa = espera.pausa ?? pausaReal;
	let estado = await leerAmpliacion(modelo, kunnr);
	for (let transcurrido = 0; (!estado || estado.estado === "A") && transcurrido < maximo; transcurrido += intervalo) {
		await pausa(intervalo);
		estado = await leerAmpliacion(modelo, kunnr);
	}
	if (!estado || estado.estado === "A") {
		throw new AmpliacionEnProcesoError(kunnr);
	}
	return estado;
}
