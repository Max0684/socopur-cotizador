import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";
import type { CondicionServicio } from "./Condiciones";
import type { Precio } from "./odata/Entidades";

/** Lo que se pregunta al servicio de precios (entidad Precio de YUI_COTIZ_SRV, que llama a Z_FM_SD_GET_CONDICIONES). */
export interface ConsultaPrecio {
	kunnr: string;
	vkorg: string;
	vtweg: string;
	spart: string;
	auart: string;
	matnr: string;
	werks: string;
	cantidad: number;
	waers: "PEN" | "USD";
	/** aaaa-mm-dd; vacia = hoy. */
	fecha?: string;
	/**
	 * Oficina de ventas y forma de pago del documento. Sin ellas SAP no encuentra condiciones cuya clave las incluye (p. ej. el
	 * descuento Z320 por oficina + grupo de clientes + grupo de materiales, o las escalas Z323/Z324 por forma de pago) y el precio
	 * sale distinto al del pedido. Solo se envian si el servicio las publica (ver quitarNoPublicados).
	 */
	vkbur?: string;
	zterm?: string;
	/** Solo vehiculos: variante (modelo + condicion + ano + color); el precio sale de ella, con Matnr = el modelo. */
	varcond?: string;
}

/** Precio real de SAP: en la moneda pedida SAP ya convierte, no hace falta un tipo de cambio en el front. */
export interface PrecioSap {
	moneda: string;
	precioLista: number;
	precioUnitario: number;
	neto: number;
	impuestos: number;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/**
 * Arma el $filter de la entidad Precio. Todos los filtros van con "eq" (el servicio los exige); la cantidad es numerica.
 */
export function filtroPrecio(c: ConsultaPrecio): string {
	const partes = [
		`Kunnr eq '${comillas(c.kunnr)}'`,
		`Vkorg eq '${comillas(c.vkorg)}'`,
		`Vtweg eq '${comillas(c.vtweg)}'`,
		`Spart eq '${comillas(c.spart)}'`,
		`Auart eq '${comillas(c.auart)}'`,
		`Matnr eq '${comillas(c.matnr)}'`,
		`Werks eq '${comillas(c.werks)}'`,
		`Cantidad eq ${Number(c.cantidad)}`,
		`Waers eq '${c.waers}'`
	];
	if (c.fecha) {
		partes.push(`Fecha eq ${c.fecha}`);
	}
	if (c.varcond) {
		partes.push(`Varcond eq '${comillas(c.varcond)}'`);
	}
	if (c.vkbur) {
		partes.push(`Vkbur eq '${comillas(c.vkbur)}'`);
	}
	if (c.zterm) {
		partes.push(`Zterm eq '${comillas(c.zterm)}'`);
	}
	return partes.join(" and ");
}

/** Quita oficina y forma de pago si la entidad aun no tiene esos campos: un filtro desconocido haria fallar toda la consulta. */
async function quitarNoPublicados(modelo: ODataModel, entidad: string, c: ConsultaPrecio): Promise<ConsultaPrecio> {
	const salida = { ...c };
	if (salida.vkbur && !(await entidadTieneCampo(modelo, entidad, "Vkbur"))) {
		delete salida.vkbur;
	}
	if (salida.zterm && !(await entidadTieneCampo(modelo, entidad, "Zterm"))) {
		delete salida.zterm;
	}
	return salida;
}

/**
 * Pide el precio a SAP. Lanza un Error con el mensaje del servicio si SAP no pudo calcular el precio
 * (Respuesta distinta de 0, p. ej. "Sin precio para ..."): el llamador decide que mostrar, nunca se inventa un precio.
 * Verificado por OData en DS4/130: SFX428H-150-MTK x100, canal 10 -> PEN 17.50 y USD 5.14 por unidad.
 */
export async function consultarPrecio(modelo: ODataModel, consulta: ConsultaPrecio): Promise<PrecioSap> {
	const lista = modelo.bindList("/Precio", undefined, undefined, undefined, { $filter: filtroPrecio(await quitarNoPublicados(modelo, "Precio", consulta)) });
	const contextos = await lista.requestContexts(0, 1);
	const fila = contextos[0]?.getObject() as Precio | undefined;
	if (!fila) {
		throw new Error("SAP no devolvio precio");
	}
	if (Number(fila.Respuesta) !== 0) {
		throw new Error(fila.Mensaje || "SAP no pudo calcular el precio");
	}
	// Un precio unitario de cero es "sin precio": SAP no encontro condicion de precio vigente (p. ej. el Z300 del canal esta borrado) y
	// el documento saldria con valor 0. Se trata como error para no generar ofertas y pedidos en cero.
	if (!(Number(fila.PrecioUnitario) > 0)) {
		throw new Error("SAP no encontró un precio vigente para este material en este canal");
	}
	return {
		moneda: fila.Moneda,
		precioLista: Number(fila.PrecioLista),
		precioUnitario: Number(fila.PrecioUnitario),
		neto: Number(fila.Neto),
		impuestos: Number(fila.Impuestos)
	};
}

/** Fila de la entidad PrecioCond: una condicion de la simulacion de precios de SAP para la linea. */
export interface CondicionSap {
	CondType: string;
	/** Importe de esa condicion para TODA la linea (KWERT), en la moneda pedida. */
	Total?: string | number;
}

export interface ImpuestosLinea {
	igv: number;
	isc: number;
}

const redondear2 = (v: number): number => Math.round(v * 100) / 100;

/**
 * IGV (condicion ZIGV) e ISC (ZISC) de una linea, sumando el Total de cada condicion. Se usa Total (importe de la linea) y NO Valor:
 * en los porcentajes el valor sale dividido por 10 (18 % aparece como 1.8).
 */
export function impuestosDeCondiciones(condiciones: CondicionSap[]): ImpuestosLinea {
	const suma = (tipo: string): number => redondear2(condiciones.filter((c) => c.CondType === tipo).reduce((a, c) => a + (Number(c.Total) || 0), 0));
	return { igv: suma("ZIGV"), isc: suma("ZISC") };
}

/**
 * IGV e ISC estimados de una linea ANTES de guardar: la misma simulacion de precios de SAP que se usa al crear el documento (cliente,
 * centro, organizacion, canal, clase y cantidad). Es una estimacion; el valor final es el del documento.
 */
export async function consultarImpuestos(modelo: ODataModel, consulta: ConsultaPrecio): Promise<ImpuestosLinea> {
	const filtro = filtroPrecio(await quitarNoPublicados(modelo, "PrecioCond", consulta));
	const filas = await modelo.bindList("/PrecioCond", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 100);
	return impuestosDeCondiciones(filas.map((c) => c.getObject() as CondicionSap));
}

/**
 * Todas las condiciones de la linea (precio, descuentos, impuestos, subtotales) segun la simulacion de SAP, para mostrarlas como lista.
 * Es la misma simulacion que el precio y los impuestos; no se calcula nada en el front.
 */
export async function consultarCondiciones(modelo: ODataModel, consulta: ConsultaPrecio): Promise<CondicionServicio[]> {
	const filtro = filtroPrecio(await quitarNoPublicados(modelo, "PrecioCond", consulta));
	const filas = await modelo.bindList("/PrecioCond", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 100);
	return filas.map((c) => c.getObject() as CondicionServicio);
}

/**
 * Tramo de una condicion con escala por cantidad que SAP aplica al material (entidad Escala = YCL_COTIZ_ESCALA, publicada el 28/10/2026).
 * precioDesde es el precio unitario que da SAP con la cantidad del tramo, con todas las condiciones juntas.
 * Verificado por OData en el 130: MOT112999, JYAS MOTORS 1103/10/55, contado -> 34,06 (1 UN), 29,63 (12), 25,45 (24: Z300 7,70 USD,
 * Z323 -3 % y Z324 -0,23 USD).
 */
export interface EscalaSap {
	condicion: string;
	descripcion: string;
	desde: number;
	unidad: string;
	/** Importe en `moneda`, o porcentaje si `moneda` es "%". */
	valor: number;
	moneda: string;
	precioDesde: number;
	monedaPrecio: string;
}

/** Un tramo de la tabla: desde que cantidad, que condiciones cambian y el precio unitario que da SAP. */
export interface TramoPrecio {
	desde: number;
	unidad: string;
	condiciones: EscalaSap[];
	precio: number;
	moneda: string;
}

/** El mismo $filter de Precio sin la cantidad: las escalas son del material, no de la cantidad elegida. */
export function filtroEscala(c: Omit<ConsultaPrecio, "cantidad">): string {
	return filtroPrecio({ ...c, cantidad: 0 })
		.split(" and ")
		.filter((p) => !p.startsWith("Cantidad eq "))
		.join(" and ");
}

export async function consultarEscalas(modelo: ODataModel, consulta: Omit<ConsultaPrecio, "cantidad">): Promise<EscalaSap[]> {
	const filtro = filtroEscala(await quitarNoPublicados(modelo, "Escala", { ...consulta, cantidad: 0 }));
	const filas = await modelo.bindList("/Escala", undefined, undefined, undefined, { $filter: filtro }).requestContexts(0, 100);
	return filas.map((c) => {
		const f = c.getObject() as Record<string, string | number | undefined>;
		return {
			condicion: String(f.CondType ?? ""),
			descripcion: String(f.Descripcion ?? "").trim(),
			desde: Number(f.Desde ?? 0),
			unidad: String(f.Unidad ?? "").trim(),
			valor: Number(f.Valor ?? 0),
			moneda: String(f.Moneda ?? "").trim(),
			precioDesde: Number(f.PrecioDesde ?? 0),
			monedaPrecio: String(f.MonedaPrecio ?? "").trim()
		};
	});
}

/**
 * Agrupa las filas por cantidad: un tramo por cada "desde", con las condiciones que tienen valor en ese tramo (un descuento en 0 no se
 * muestra) y el precio que da SAP. Un material sin escalas (una sola fila por condicion) no llega: YCL_COTIZ_ESCALA ya lo descarta.
 */
export function tramosDeEscalas(escalas: EscalaSap[]): TramoPrecio[] {
	const porDesde = new Map<number, TramoPrecio>();
	for (const e of [...escalas].sort((a, b) => a.desde - b.desde)) {
		let tramo = porDesde.get(e.desde);
		if (!tramo) {
			tramo = { desde: e.desde, unidad: e.unidad, condiciones: [], precio: e.precioDesde, moneda: e.monedaPrecio };
			porDesde.set(e.desde, tramo);
		}
		if (e.valor !== 0) {
			tramo.condiciones.push(e);
		}
	}
	return [...porDesde.values()];
}

/** El tramo que vale con la cantidad (el de "desde" mas alto que la cantidad alcanza). */
export function tramoVigente(tramos: TramoPrecio[], cantidad: number): TramoPrecio | undefined {
	return [...tramos].reverse().find((t) => cantidad >= t.desde);
}

/** El siguiente tramo que baja el precio, para avisar "llevando N el precio baja a X". */
export function siguienteTramo(tramos: TramoPrecio[], cantidad: number): TramoPrecio | undefined {
	const actual = tramoVigente(tramos, cantidad);
	return tramos.find((t) => t.desde > cantidad && (!actual || t.precio < actual.precio));
}
