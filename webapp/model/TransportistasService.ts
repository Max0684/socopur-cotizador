import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Transportistas y sedes de YUI_COTIZ_SRV (entidades Transportista y TransportistaSede). Busqueda y paginado en el servidor: son unos 1700
 * proveedores y no se cargan juntos. RolPedido dice como viaja al pedido: ZT si el transportista es cliente (Kunnr), SP si solo es proveedor.
 */

interface TransportistaSap {
	Id: string;
	Nombre?: string;
	Ruc?: string;
	Dni?: string;
	Kunnr?: string;
	Lifnr?: string;
	UsosZT?: number | string;
	RolPedido?: string;
}

interface SedeSap {
	Id: string;
	Addrnumber: string;
	Nombre?: string;
	Direccion?: string;
	Distrito?: string;
	Provincia?: string;
	Departamento?: string;
	Ubigeo?: string;
}

/** Fila de la tabla de transportistas. */
export interface FilaTransportista {
	id: string;
	nombre: string;
	/** RUC o, si no tiene, DNI. */
	documento: string;
	rol: "ZT" | "SP";
	usos: number;
	/** Cliente (KUNNR) del transportista: es el interlocutor ZT del pedido. Vacio si solo es proveedor. */
	kunnr: string;
	/** Proveedor (LIFNR): es el interlocutor SP del pedido cuando no es cliente. */
	lifnr: string;
}

export interface SedeTransportista {
	key: string;
	text: string;
	direccion: string;
}

export interface PaginaTransportistas {
	filas: FilaTransportista[];
	total: number;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

export function aFilaTransportista(t: TransportistaSap): FilaTransportista {
	return {
		id: t.Id,
		nombre: t.Nombre ?? t.Id,
		documento: t.Ruc || t.Dni || "",
		rol: t.RolPedido === "SP" ? "SP" : "ZT",
		usos: Number(t.UsosZT ?? 0) || 0,
		kunnr: t.Kunnr ?? "",
		lifnr: t.Lifnr ?? ""
	};
}

/** "Calle, Distrito, Provincia, Departamento (ubigeo)"; omite lo que falte. */
export function textoSede(s: SedeSap): string {
	const base = [s.Direccion, s.Distrito, s.Provincia, s.Departamento].filter(Boolean).join(", ");
	return s.Ubigeo ? `${base} (${s.Ubigeo})` : base;
}

export function aSede(s: SedeSap): SedeTransportista {
	return { key: s.Addrnumber, text: s.Nombre || s.Direccion || s.Addrnumber, direccion: textoSede(s) };
}

/**
 * $filter de la busqueda: solo digitos = empieza por RUC o DNI; si no, el nombre contiene el texto (NombreMayus esta en mayusculas).
 * Sin texto no hay filtro.
 */
export function filtroTransportistas(texto: string): string | undefined {
	const t = texto.trim();
	if (!t) {
		return undefined;
	}
	if (/^\d+$/.test(t)) {
		return `startswith(Ruc,'${comillas(t)}') or startswith(Dni,'${comillas(t)}')`;
	}
	return `contains(NombreMayus,'${comillas(t.toUpperCase())}')`;
}

/** Una pagina de transportistas (los mas usados primero). `pagina` empieza en 1. */
export async function buscarTransportistas(modelo: ODataModel, texto: string, pagina: number, tamano: number): Promise<PaginaTransportistas> {
	const parametros: Record<string, string | boolean> = { $orderby: "UsosZT desc,Nombre", $count: true };
	const filtro = filtroTransportistas(texto);
	if (filtro) {
		parametros.$filter = filtro;
	}
	const lista = modelo.bindList("/Transportista", undefined, undefined, undefined, parametros);
	const contextos = await lista.requestContexts((pagina - 1) * tamano, tamano);
	return { filas: contextos.map((c) => aFilaTransportista(c.getObject() as TransportistaSap)), total: lista.getLength() };
}

export async function cargarSedes(modelo: ODataModel, id: string): Promise<SedeTransportista[]> {
	const contextos = await modelo.bindList("/TransportistaSede", undefined, undefined, undefined, { $filter: `Id eq '${comillas(id)}'`, $orderby: "Addrnumber" }).requestContexts(0, 50);
	return contextos.map((c) => aSede(c.getObject() as SedeSap));
}

/** Transportista del prototipo (mock.json) con sus sedes. */
export interface TransportistaMock {
	key: string;
	text: string;
	sedes: { key: string; text: string; direccion: string }[];
}

/** Misma busqueda y paginado sobre los transportistas de EJEMPLO, para el prototipo sin SAP. */
export function buscarTransportistasMock(lista: TransportistaMock[], texto: string, pagina: number, tamano: number): PaginaTransportistas {
	const t = texto.trim().toUpperCase();
	const coincide = lista.filter((x) => !t || x.text.toUpperCase().includes(t) || x.key.toUpperCase().includes(t));
	const filas = coincide
		.slice((pagina - 1) * tamano, pagina * tamano)
		.map((x) => ({ id: x.key, nombre: x.text, documento: "", rol: "ZT" as const, usos: 0, kunnr: "", lifnr: "" }));
	return { filas, total: coincide.length };
}
