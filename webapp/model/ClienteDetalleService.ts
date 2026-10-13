import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Detalle de solo lectura del cliente para la ficha y el estado de cuenta: partidas (movimientos), direcciones y contactos.
 * Entidades de YUI_COTIZ_SRV: ClientePartida, ClienteDireccion y ClienteContacto. Se filtra SIEMPRE por Kunnr.
 * Telefono y correo son datos personales: solo se muestran en la ficha, nunca en listas.
 */

interface PartidaSap {
	Kunnr: string;
	Belnr: string;
	Blart?: string;
	BlartTexto?: string;
	Budat?: string;
	Vencimiento?: string;
	Waers?: string;
	/** Importe con signo en moneda de transaccion; los creditos (H) son negativos. */
	Wrbtr?: number | string;
	Abierta?: boolean | string;
	Vencida?: boolean | string;
	DiasVencido?: number | string;
}

interface DireccionSap {
	Kunnr: string;
	Tipo: string;
	Kunn2: string;
	Nombre?: string;
	Calle?: string;
	Numero?: string;
	Distrito?: string;
	Provincia?: string;
	RegionTexto?: string;
	Ubigeo?: string;
	/** Numero de direccion de SAP (ADRC). Con el: una fila por direccion distinta del cliente (maestro o ya usada en pedidos). */
	Addrnumber?: string;
	Origen?: string;
}

interface ContactoSap {
	Tipo: string;
	Seq?: string | number;
	Valor?: string;
	EsDefault?: boolean | string;
	EsMovil?: boolean | string;
}

/** Fila de la tabla de movimientos del estado de cuenta. */
export interface Movimiento {
	fecha: string;
	doc: string;
	tipo: string;
	monto: string;
	moneda: string;
	estado: string;
}

export interface DireccionCliente {
	id: string;
	alias: string;
	tipo: "Fiscal" | "Envio";
	texto: string;
	/** Destinatario (KUNN2) y numero de direccion (ADRC) tal como los guarda SAP; con ellos viaja el WE al pedido. */
	kunn2?: string;
	addrnumber?: string;
}

export interface ContactoCliente {
	correo: string;
	telefono: string;
}

const verdadero = (v: boolean | string | undefined): boolean => v === true || v === "X";
const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** AAAA-MM-DD a DD/MM/AAAA (el formato que usa la pantalla). */
export function fechaPantalla(iso: string | undefined): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
	return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Importe con dos decimales y separador de miles, con signo: los creditos (notas de credito, anulaciones) salen negativos. */
export function formatoImporte(valor: number | string | undefined): string {
	const n = Number(valor ?? 0);
	return Number.isFinite(n) ? n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}

/**
 * Estado de una partida para la tabla: Vencida (abierta y pasada de fecha), Pendiente (abierta) o Compensada.
 * Una partida con credito (nota de credito) abierta es Pendiente, nunca Vencida (SAP solo marca vencidas las de cargo).
 */
export function estadoPartida(p: Pick<PartidaSap, "Abierta" | "Vencida">): "Vencida" | "Pendiente" | "Compensada" {
	if (!verdadero(p.Abierta)) {
		return "Compensada";
	}
	return verdadero(p.Vencida) ? "Vencida" : "Pendiente";
}

export function aMovimiento(p: PartidaSap): Movimiento {
	return {
		fecha: fechaPantalla(p.Budat),
		doc: p.Belnr,
		tipo: p.BlartTexto || p.Blart || "",
		monto: formatoImporte(p.Wrbtr),
		moneda: p.Waers || "PEN",
		estado: estadoPartida(p)
	};
}

/** "Calle Numero, Distrito, Provincia, Departamento (ubigeo)"; omite lo que falte. */
export function textoDireccion(d: DireccionSap): string {
	const calle = [d.Calle, d.Numero].filter(Boolean).join(" ");
	const base = [calle, d.Distrito, d.Provincia, d.RegionTexto].filter(Boolean).join(", ");
	return d.Ubigeo ? `${base} (${d.Ubigeo})` : base;
}

/**
 * Fiscal primero; despues todas las demas direcciones del cliente (envio, facturacion, maestro o ya usadas en pedidos). Los selectores de envio y
 * de facturacion muestran todas, sin filtrar por tipo. Con Addrnumber el id es la direccion; sin el (servicio anterior), el cliente del WE.
 */
export function aDirecciones(filas: DireccionSap[], aliasFiscal: string): DireccionCliente[] {
	const lista = filas.map((d) => ({
		id: d.Tipo === "FISCAL" ? "FISCAL" : d.Addrnumber ? `A-${d.Addrnumber}` : `WE-${d.Kunn2}`,
		alias: d.Tipo === "FISCAL" ? aliasFiscal : d.Nombre || d.Kunn2,
		tipo: (d.Tipo === "FISCAL" ? "Fiscal" : "Envio") as "Fiscal" | "Envio",
		texto: textoDireccion(d),
		kunn2: d.Kunn2 || undefined,
		addrnumber: d.Addrnumber || undefined
	}));
	return [...lista.filter((d) => d.tipo === "Fiscal"), ...lista.filter((d) => d.tipo === "Envio")];
}

/** Correo y telefono predeterminados; sin predeterminado, el primero; entre telefonos prefiere el movil si ninguno es el predeterminado. */
export function aContacto(filas: ContactoSap[]): ContactoCliente {
	const elegir = (tipo: string): string => {
		const lista = filas.filter((c) => c.Tipo === tipo && c.Valor);
		const ordenada = [...lista].sort((a, b) => Number(verdadero(b.EsDefault)) - Number(verdadero(a.EsDefault)) || Number(verdadero(b.EsMovil)) - Number(verdadero(a.EsMovil)));
		return ordenada[0]?.Valor ?? "";
	};
	return { correo: elegir("MAIL"), telefono: elegir("TEL") };
}

/** Partidas del cliente (abiertas y compensadas de los ultimos 12 meses), las mas recientes primero. */
export async function cargarMovimientos(modelo: ODataModel, kunnr: string, maximo = 100): Promise<Movimiento[]> {
	const filas = await modelo
		.bindList("/ClientePartida", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'`, $orderby: "Budat desc,Belnr desc" })
		.requestContexts(0, maximo);
	return filas.map((c) => aMovimiento(c.getObject() as PartidaSap));
}

export async function cargarDirecciones(modelo: ODataModel, kunnr: string, aliasFiscal: string): Promise<DireccionCliente[]> {
	const filas = await modelo.bindList("/ClienteDireccion", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 100);
	return aDirecciones(filas.map((c) => c.getObject() as DireccionSap), aliasFiscal);
}

export async function cargarContacto(modelo: ODataModel, kunnr: string): Promise<ContactoCliente> {
	const filas = await modelo.bindList("/ClienteContacto", undefined, undefined, undefined, { $filter: `Kunnr eq '${comillas(kunnr)}'` }).requestContexts(0, 50);
	return aContacto(filas.map((c) => c.getObject() as ContactoSap));
}
