import { test } from "node:test";
import assert from "node:assert/strict";
import { borrarRespaldo, claveRespaldo, guardarRespaldo, leerRespaldo, siguienteContador, VERSION_RESPALDO, type Almacen, type DatosRespaldo } from "../webapp/model/RespaldoOferta.ts";

function almacen(): Almacen & { datos: Map<string, string> } {
	const datos = new Map<string, string>();
	return {
		datos,
		getItem: (c) => datos.get(c) ?? null,
		setItem: (c, v) => void datos.set(c, v),
		removeItem: (c) => void datos.delete(c)
	};
}

const datos = (lineas: unknown[] = [{ uid: "L3", material: "MOT112999", cantidad: 2 }]): DatosRespaldo => ({
	cliente: { kunnr: "0100025848", nombre: "CLIENTE DE PRUEBA" },
	lineas,
	perfil: { pernr: "99000406", moneda: "PEN" },
	entrega: "envio",
	entregaDatos: { direccionId: "D1" },
	fechaEntrega: "2026-10-30",
	modalidadesGrupo: {}
});

test("claveRespaldo separa por vendedor y usa un nombre fijo si aun no hay vendedor", () => {
	assert.equal(claveRespaldo("99000406"), "socopur.cotizador.respaldo.99000406");
	assert.equal(claveRespaldo("  "), "socopur.cotizador.respaldo.sin-vendedor");
});

test("guardarRespaldo y leerRespaldo devuelven lo mismo con version y hora", () => {
	const a = almacen();
	const ahora = new Date("2026-10-28T15:00:00Z");
	assert.equal(guardarRespaldo(a, "k", datos(), ahora), true);
	const r = leerRespaldo(a, "k", new Date("2026-10-28T16:00:00Z"));
	assert.ok(r);
	assert.equal(r.version, VERSION_RESPALDO);
	assert.equal(r.guardadoEn, ahora.toISOString());
	assert.deepEqual(r.lineas, datos().lineas);
	assert.equal(r.entrega, "envio");
});

test("leerRespaldo descarta y borra el vencido (mas de 7 dias), el de otra version, el danado y el que no tiene lineas", () => {
	const a = almacen();
	guardarRespaldo(a, "k", datos(), new Date("2026-10-20T10:00:00Z"));
	assert.equal(leerRespaldo(a, "k", new Date("2026-10-28T10:00:01Z")), null);
	assert.equal(a.datos.has("k"), false);
	a.setItem("k", JSON.stringify({ ...datos(), version: 99, guardadoEn: "2026-10-28T10:00:00Z" }));
	assert.equal(leerRespaldo(a, "k", new Date("2026-10-28T11:00:00Z")), null);
	a.setItem("k", "{no es json");
	assert.equal(leerRespaldo(a, "k"), null);
	assert.equal(a.datos.has("k"), false);
	guardarRespaldo(a, "k", datos([]));
	assert.equal(leerRespaldo(a, "k"), null);
});

test("sin almacen o con el almacen lleno no falla: no guarda y no hay respaldo", () => {
	assert.equal(guardarRespaldo(undefined, "k", datos()), false);
	assert.equal(leerRespaldo(undefined, "k"), null);
	const lleno: Almacen = {
		getItem: () => null,
		setItem: () => {
			throw new Error("QuotaExceededError");
		},
		removeItem: () => undefined
	};
	assert.equal(guardarRespaldo(lleno, "k", datos()), false);
	borrarRespaldo(undefined, "k");
});

test("perfilRecuperado: el vendedor es el identificado ahora; del respaldo solo vienen las elecciones de la oferta", async () => {
	const { perfilRecuperado } = await import("../webapp/model/RespaldoOferta.ts");
	const actual = { pernr: "99000406", vendedor: "99000406 — VENDEDORA", canal: "11", moneda: "PEN", busqueda: { tipo: "repuestos" } };
	const respaldado = { pernr: "", vendedor: "", canal: "10", moneda: "USD", formaPago: "", centro: "1103", busqueda: { tipo: "vehiculos" } };
	const p = perfilRecuperado(actual, respaldado);
	assert.equal(p.vendedor, "99000406 — VENDEDORA");
	assert.equal(p.pernr, "99000406");
	assert.equal(p.canal, "10");
	assert.equal(p.moneda, "USD");
	assert.equal(p.centro, "1103");
	assert.equal("formaPago" in p, false);
	assert.deepEqual(p.busqueda, { tipo: "repuestos" });
	assert.notEqual(p.busqueda, actual.busqueda);
});

test("siguienteContador sigue despues del mayor uid L<n> recuperado y nunca baja", () => {
	assert.equal(siguienteContador([{ uid: "L3" }, { uid: "L12" }, { uid: "P10" }, {}], 5), 12);
	assert.equal(siguienteContador([{ uid: "L2" }], 9), 9);
	assert.equal(siguienteContador([], 0), 0);
});
