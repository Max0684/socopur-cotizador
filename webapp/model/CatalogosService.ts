import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/** Catalogos de configuracion de SAP (entidades Centro y Oficina de YUI_COTIZ_SRV): centros y oficinas validos por organizacion y canal. */

export interface OpcionCatalogo {
	key: string;
	text: string;
}

export interface CentrosArea {
	/** Codigos de centro validos para la organizacion y el canal (TVKWZ), en orden. */
	codigos: string[];
	/** Nombre de cada centro (T001W). */
	nombres: Record<string, string>;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** Oficinas de venta como opciones de lista: "1101 PCP - CENTENARIO". */
export function opcionesDeOficinas(filas: { Vkbur: string; NombreOficina: string }[]): OpcionCatalogo[] {
	return filas
		.map((f) => ({ key: f.Vkbur, text: `${f.Vkbur} ${f.NombreOficina}` }))
		.sort((a, b) => a.key.localeCompare(b.key));
}

/** Arma los codigos (ordenados) y los nombres de las filas de la entidad Centro. */
export function centrosDeFilas(filas: { Werks: string; NombreCentro: string }[]): CentrosArea {
	const nombres: Record<string, string> = {};
	filas.forEach((f) => (nombres[f.Werks] = f.NombreCentro));
	return { codigos: Object.keys(nombres).sort(), nombres };
}

async function leer<T>(modelo: ODataModel, ruta: string, vkorg: string, vtweg: string): Promise<T[]> {
	const lista = modelo.bindList(ruta, undefined, undefined, undefined, { $filter: `Vkorg eq '${comillas(vkorg)}' and Vtweg eq '${comillas(vtweg)}'` });
	const contextos = await lista.requestContexts(0, 500);
	return contextos.map((c) => c.getObject() as T);
}

/** Centros validos para la organizacion y el canal. */
export async function leerCentros(modelo: ODataModel, vkorg: string, vtweg: string): Promise<CentrosArea> {
	return centrosDeFilas(await leer<{ Werks: string; NombreCentro: string }>(modelo, "/Centro", vkorg, vtweg));
}

/** Oficinas de venta validas para la organizacion y el canal. */
export async function leerOficinas(modelo: ODataModel, vkorg: string, vtweg: string): Promise<OpcionCatalogo[]> {
	return opcionesDeOficinas(await leer<{ Vkbur: string; NombreOficina: string }>(modelo, "/Oficina", vkorg, vtweg));
}

/** Almacen por defecto: el principal de todos los centros y el mas usado en pedidos y ofertas (no hay regla en SAP que lo determine). */
export const ALMACEN_POR_DEFECTO = "0001";

/** Almacenes de venta como opciones de lista: "0001 CENTENARIO / PCP". Solo EsVenta (excluye los tecnicos); el orden es por codigo. */
export function opcionesDeAlmacenes(filas: { Lgort: string; NombreAlmacen?: string; EsVenta?: boolean | string }[]): OpcionCatalogo[] {
	return filas
		.filter((f) => f.EsVenta === true || f.EsVenta === "X")
		.map((f) => ({ key: f.Lgort, text: `${f.Lgort} ${f.NombreAlmacen ?? ""}`.trim() }))
		.sort((a, b) => a.key.localeCompare(b.key));
}

/** Almacenes de venta del centro (entidad Almacen de T001L). Un almacen no es una regla: el vendedor puede cambiarlo en cada linea. */
export async function leerAlmacenes(modelo: ODataModel, werks: string): Promise<OpcionCatalogo[]> {
	const lista = modelo.bindList("/Almacen", undefined, undefined, undefined, { $filter: `Werks eq '${comillas(werks)}'`, $orderby: "Lgort" });
	const contextos = await lista.requestContexts(0, 100);
	return opcionesDeAlmacenes(contextos.map((c) => c.getObject() as { Lgort: string; NombreAlmacen?: string; EsVenta?: boolean | string }));
}
