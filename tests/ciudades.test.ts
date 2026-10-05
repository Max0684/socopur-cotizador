import { test } from "node:test";
import assert from "node:assert/strict";
import { CIUDADES, ciudadDeCentro, ciudadPorClave, oficinaDeCentro, textoSede } from "../webapp/model/Ciudades.ts";

test("Costa es solo Lima; Selva son Pucallpa, Iquitos, Tarapoto, Yurimaguas y Puerto Maldonado", () => {
	assert.deepEqual(CIUDADES.filter((c) => c.region === "Costa").map((c) => c.nombre), ["Lima"]);
	assert.deepEqual(CIUDADES.filter((c) => c.region === "Selva").map((c) => c.nombre), ["Pucallpa", "Iquitos", "Tarapoto", "Yurimaguas", "Puerto Maldonado"]);
});

test("un centro pertenece a una sola ciudad", () => {
	const todos = CIUDADES.flatMap((c) => c.centros);
	assert.equal(new Set(todos).size, todos.length);
});

test("el centro y la oficina principales son de su propia ciudad", () => {
	for (const c of CIUDADES) {
		assert.ok(c.centros.includes(c.centroPrincipal), `${c.nombre}: centro principal`);
		assert.ok(c.oficinas.includes(c.oficinaPrincipal), `${c.nombre}: oficina principal`);
	}
});

test("ciudadDeCentro: 1001 es Lima, 1101 Pucallpa; un centro 3xxx no pertenece a ninguna", () => {
	assert.equal(ciudadDeCentro("1001")?.nombre, "Lima");
	assert.equal(ciudadDeCentro("1101")?.nombre, "Pucallpa");
	assert.equal(ciudadDeCentro("1504")?.nombre, "Puerto Maldonado");
	assert.equal(ciudadDeCentro("3001"), undefined);
	assert.equal(ciudadPorClave("TARAPOTO")?.region, "Selva");
});

test("oficinaDeCentro: la del mismo numero; los centros sin oficina propia usan la principal de su ciudad", () => {
	assert.equal(oficinaDeCentro("1002"), "1002");
	assert.equal(oficinaDeCentro("1009"), "1001");
	assert.equal(oficinaDeCentro("1104"), "1101");
	assert.equal(oficinaDeCentro("1306"), "1302");
	assert.equal(oficinaDeCentro("1504"), "1502");
	assert.equal(oficinaDeCentro("3001"), "");
});

test("textoSede muestra ciudad y region", () => {
	assert.equal(textoSede("1001"), "Lima · Costa");
	assert.equal(textoSede("1201"), "Iquitos · Selva");
	assert.equal(textoSede("3001"), "");
});
