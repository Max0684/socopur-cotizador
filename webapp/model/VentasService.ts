import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Ventas del vendedor (relevamiento #215-#217: el vendedor no tenia como ver sus ventas del dia o del mes sin pedirselas a otra persona).
 * Vista VentaVendedor (YC_COTIZ_VENTAVEND): ofertas y pedidos en los que es el vendedor (interlocutor VE) y las facturas no anuladas de sus
 * pedidos. Valores netos, sin IGV, en la moneda de cada documento.
 */

export type TipoVenta = "OFERTA" | "PEDIDO" | "FACTURA";

export interface FilaVenta {
	tipo: string;
	documento: string;
	/** aaaa-mm-dd */
	fecha: string;
	clase: string;
	kunnr: string;
	cliente: string;
	vkorg: string;
	valor: number;
	moneda: string;
}

export interface ResumenVenta {
	tipo: string;
	moneda: string;
	cantidad: number;
	total: number;
}

const texto = (v: unknown): string => (v === undefined || v === null ? "" : String(v).trim());
const ORDEN_TIPOS: string[] = ["OFERTA", "PEDIDO", "FACTURA"];

/** El servicio publica la vista de ventas (desde el 29/10/2026). */
export function ventasPublicadas(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "VentaVendedor", "Pernr");
}

/** Fecha local como aaaa-mm-dd (literal Edm.Date de OData, sin comillas). */
export function fechaIso(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Del primer dia del mes a hoy: el periodo con el que se abre la pantalla. */
export function periodoDelMes(hoy: Date): { desde: Date; hasta: Date } {
	return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) };
}

export function filtroVentas(pernr: string, desde: Date, hasta: Date): string {
	return `Pernr eq '${pernr.replace(/'/g, "''")}' and Fecha ge ${fechaIso(desde)} and Fecha le ${fechaIso(hasta)}`;
}

export function aFilaVenta(f: Record<string, unknown>): FilaVenta {
	return {
		tipo: texto(f.Tipo),
		documento: texto(f.Documento),
		fecha: texto(f.Fecha),
		clase: texto(f.Clase),
		kunnr: texto(f.Kunnr),
		cliente: texto(f.Cliente),
		vkorg: texto(f.Vkorg),
		valor: Number(f.ValorNeto ?? 0),
		moneda: texto(f.Moneda)
	};
}

/** Documentos del vendedor en el periodo, los mas recientes primero. */
export async function leerVentas(modelo: ODataModel, pernr: string, desde: Date, hasta: Date, maximo = 5000): Promise<FilaVenta[]> {
	const filas = await modelo
		.bindList("/VentaVendedor", undefined, undefined, undefined, { $filter: filtroVentas(pernr, desde, hasta), $orderby: "Fecha desc,Documento desc" })
		.requestContexts(0, maximo);
	return filas.map((c) => aFilaVenta(c.getObject() as Record<string, unknown>));
}

/** Cantidad y valor por tipo (oferta, pedido, factura) y moneda; soles antes que dolares. */
export function resumirVentas(filas: FilaVenta[]): ResumenVenta[] {
	const grupos = new Map<string, ResumenVenta>();
	for (const f of filas) {
		const clave = `${f.tipo}|${f.moneda}`;
		const g = grupos.get(clave) ?? { tipo: f.tipo, moneda: f.moneda, cantidad: 0, total: 0 };
		g.cantidad += 1;
		g.total = Math.round((g.total + f.valor) * 100) / 100;
		grupos.set(clave, g);
	}
	const orden = (t: string): number => (ORDEN_TIPOS.includes(t) ? ORDEN_TIPOS.indexOf(t) : ORDEN_TIPOS.length);
	return [...grupos.values()].sort((a, b) => orden(a.tipo) - orden(b.tipo) || (a.moneda === "PEN" ? -1 : b.moneda === "PEN" ? 1 : a.moneda.localeCompare(b.moneda)));
}

/**
 * CSV para Excel: separador ";" y BOM, asi Excel lo abre con tildes y en columnas. Los valores con ";" o comillas van entre comillas.
 * titulos: encabezados en el orden fecha, tipo, documento, clase, cliente (codigo), cliente (nombre), organizacion, valor neto, moneda.
 */
export function csvVentas(filas: FilaVenta[], titulos: string[], nombreTipo: (t: string) => string = (t) => t): string {
	const celda = (v: string): string => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
	const lineas = [titulos.map(celda).join(";")];
	for (const f of filas) {
		lineas.push([f.fecha, nombreTipo(f.tipo), f.documento, f.clase, f.kunnr, f.cliente, f.vkorg, f.valor.toFixed(2), f.moneda].map(celda).join(";"));
	}
	return `﻿${lineas.join("\r\n")}\r\n`;
}
