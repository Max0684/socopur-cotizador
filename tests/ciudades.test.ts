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

test("listaDeSede: solo la ciudad del vendedor y siempre con el valor del perfil dentro", async () => {
	const { listaDeSede } = await import("../webapp/model/Ciudades.ts");
	const sap = [
		{ key: "1001", text: "1001 LIMA - ATE" },
		{ key: "1101", text: "1101 PUCALLPA - CENTENARIO" },
		{ key: "1301", text: "1301 TARAPOTO - ILO" }
	];
	const a = listaDeSede(sap, "PUCALLPA", "centros", "1101", "no habilitado");
	assert.deepEqual(a.opciones.map((o) => o.key), ["1101"]);
	assert.equal(a.fueraDeSap, false);
	// El centro del perfil no esta habilitado en SAP para la org/canal: se muestra igual, marcado, y se avisa.
	const b = listaDeSede(sap, "PUCALLPA", "centros", "1104", "no habilitado");
	assert.deepEqual(b.opciones.map((o) => o.key), ["1104", "1101"]);
	assert.equal(b.opciones[0].text, "1104 (no habilitado)");
	assert.equal(b.fueraDeSap, true);
	// Sin ciudad conocida (p. ej. un perfil antiguo) no se filtra.
	assert.equal(listaDeSede(sap, "", "centros", "1001", "x").opciones.length, 3);
});
