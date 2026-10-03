import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { ordenarPorTexto } from "com/socopur/cotizador/model/Orden";

/** Fila de la vista YI_COTIZ_CLIENTE (cliente por area de ventas). */
interface ClienteSapFila {
	Kunnr: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Kdgrp?: string;
	Zterm?: string;
	Vsbed?: string;
	Aufsd?: string;
	Name1?: string;
	Name2?: string;
	Stcd1?: string;
	Stcd2?: string;
	Land1?: string;
	Ort01?: string;
	Stras?: string;
	Sperr?: string;
	Loevm?: string;
}

/** Cliente de SAP con lo que hoy entrega el servicio (nombre, documento, grupo y datos de venta). */
export interface ClienteSap {
	kunnr: string;
	nombre: string;
	doc: string;
	tipoDoc: string;
	grupo: string;
	zterm: string;
	direccion: string;
	/** Bloqueo central (SPERR), marca de borrado (LOEVM) o bloqueo de pedidos del area de ventas (AUFSD). */
	bloqueado: boolean;
	/** Areas de venta (org/canal/sector) en las que el cliente esta dado de alta. */
	areas: string[];
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/**
 * Busca clientes por RUC/DNI (coincidencia exacta) o por nombre (contiene) dentro de una organizacion de ventas.
 * La vista trae una fila por area de ventas; aqui se agrupan por cliente.
 * STCD1 se usa como documento y, si esta vacio, STCD2 (RUC en STCD1 en Socopur; el DNI iria en STCD2 por confirmar).
 */
export async function buscarClientes(modelo: ODataModel, texto: string, vkorg: string, maximo = 20): Promise<ClienteSap[]> {
	const t = comillas(texto.trim());
	if (!t) {
		return [];
	}
	const filtro =
		`Vkorg eq '${comillas(vkorg)}' and (Stcd1 eq '${t}' or Stcd2 eq '${t}' or Kunnr eq '${t.padStart(10, "0")}' or contains(Name1,'${t.toUpperCase()}'))`;
	const binding = modelo.bindList("/Cliente", undefined, undefined, undefined, {
		$select: "Kunnr,Vkorg,Vtweg,Spart,Kdgrp,Zterm,Aufsd,Name1,Name2,Stcd1,Stcd2,Stras,Ort01,Sperr,Loevm",
		$filter: filtro,
		$orderby: "Name1",
		$count: false
	});
	// La vista trae una fila por area de venta (un cliente puede tener 10 o mas): se leen bastantes filas para no cortar clientes.
	const contextos = await binding.requestContexts(0, 500);
	const porCliente = new Map<string, ClienteSap>();
	for (const contexto of contextos) {
		const f = contexto.getObject() as ClienteSapFila;
		const area = `${f.Vkorg}/${f.Vtweg}/${f.Spart}`;
		const existente = porCliente.get(f.Kunnr);
		if (existente) {
			existente.areas.push(area);
			continue;
		}
		const doc = f.Stcd1 || f.Stcd2 || "";
		porCliente.set(f.Kunnr, {
			kunnr: f.Kunnr,
			nombre: [f.Name1, f.Name2].filter(Boolean).join(" "),
			doc,
			tipoDoc: doc.length === 11 ? "RUC" : doc.length === 8 ? "DNI" : "",
			grupo: f.Kdgrp ?? "",
			zterm: f.Zterm ?? "",
			direccion: [f.Stras, f.Ort01].filter(Boolean).join(", "),
			bloqueado: Boolean(f.Sperr) || Boolean(f.Loevm) || Boolean(f.Aufsd),
			areas: [area]
		});
		if (porCliente.size >= maximo) {
			break;
		}
	}
	const clientes = Array.from(porCliente.values());
	await completarAreas(modelo, clientes);
	return ordenarPorTexto(clientes, (c) => c.nombre);
}

/**
 * La busqueda filtra por la organizacion de ventas elegida, asi que solo trae las areas de esa organizacion. Un cliente de repuestos
 * (1103) tambien puede vender vehiculos (1101): se leen todas sus areas para no avisar "no esta dado de alta" por error.
 * Si la lectura falla se dejan las areas que ya se tenian.
 */
async function completarAreas(modelo: ODataModel, clientes: ClienteSap[]): Promise<void> {
	if (clientes.length === 0) {
		return;
	}
	try {
		const filtro = clientes.map((c) => `Kunnr eq '${comillas(c.kunnr)}'`).join(" or ");
		const filas = await modelo.bindList("/Cliente", undefined, undefined, undefined, { $select: "Kunnr,Vkorg,Vtweg,Spart", $filter: filtro, $count: false }).requestContexts(0, 2000);
		const porKunnr = new Map(clientes.map((c) => [c.kunnr, new Set(c.areas)]));
		for (const contexto of filas) {
			const f = contexto.getObject() as ClienteSapFila;
			porKunnr.get(f.Kunnr)?.add(`${f.Vkorg}/${f.Vtweg}/${f.Spart}`);
		}
		clientes.forEach((c) => (c.areas = [...(porKunnr.get(c.kunnr) ?? c.areas)]));
	} catch {
		// se conservan las areas de la organizacion buscada
	}
}
