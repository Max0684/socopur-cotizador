import { test } from "node:test";
import assert from "node:assert/strict";
import { CIUDADES, ciudadDeCentro, ciudadPorClave, ciudadesDeSociedad, oficinaDeCentro, principalDe, sociedadDeCentro, textoSede } from "../webapp/model/Ciudades.ts";

test("Costa es solo Lima; Selva son Pucallpa, Iquitos, Tarapoto, Yurimaguas y Puerto Maldonado; Piura y Arequipa sin region todavia", () => {
	assert.deepEqual(CIUDADES.filter((c) => c.region === "Costa").map((c) => c.nombre), ["Lima"]);
	assert.deepEqual(CIUDADES.filter((c) => c.region === "Selva").map((c) => c.nombre), ["Pucallpa", "Iquitos", "Tarapoto", "Yurimaguas", "Puerto Maldonado"]);
	assert.deepEqual(CIUDADES.filter((c) => c.region === "").map((c) => c.nombre), ["Piura", "Arequipa"]);
});

test("un centro pertenece a una sola ciudad", () => {
	const todos = CIUDADES.flatMap((c) => c.centros);
	assert.equal(new Set(todos).size, todos.length);
});

test("el centro y la oficina principales de cada sociedad son de su propia ciudad y de esa sociedad", () => {
	for (const c of CIUDADES) {
		for (const [sociedad, p] of Object.entries(c.principales)) {
			assert.ok(c.centros.includes(p.centro), `${c.nombre}/${sociedad}: centro principal`);
			assert.ok(c.oficinas.includes(p.oficina), `${c.nombre}/${sociedad}: oficina principal`);
			assert.equal(sociedadDeCentro(p.centro), sociedad, `${c.nombre}/${sociedad}: el centro principal es de otra sociedad`);
			assert.equal(sociedadDeCentro(p.oficina), sociedad);
		}
	}
});

test("ciudadDeCentro: 1001 es Lima, 1101 Pucallpa; un centro 3xxx no pertenece a ninguna", () => {
	assert.equal(ciudadDeCentro("1001")?.nombre, "Lima");
	assert.equal(ciudadDeCentro("1101")?.nombre, "Pucallpa");
	assert.equal(ciudadDeCentro("1504")?.nombre, "Puerto Maldonado");
	assert.equal(ciudadDeCentro("2701")?.nombre, "Arequipa");
	assert.equal(ciudadDeCentro("2001")?.nombre, "Lima");
	assert.equal(ciudadDeCentro("3102")?.nombre, "Pucallpa");
	assert.equal(ciudadDeCentro("9999"), undefined);
	assert.equal(ciudadPorClave("TARAPOTO")?.region, "Selva");
});

test("oficinaDeCentro: la del mismo numero; los centros sin oficina propia usan la principal de su ciudad", () => {
	assert.equal(oficinaDeCentro("1002"), "1002");
	assert.equal(oficinaDeCentro("1009"), "1001");
	assert.equal(oficinaDeCentro("1104"), "1101");
	assert.equal(oficinaDeCentro("1306"), "1302");
	assert.equal(oficinaDeCentro("1504"), "1502");
	assert.equal(oficinaDeCentro("2018"), "2001");
	assert.equal(oficinaDeCentro("3001"), "3001");
	assert.equal(oficinaDeCentro("9999"), "");
});

test("textoSede muestra ciudad y region", () => {
	assert.equal(textoSede("1001"), "Lima · Costa");
	assert.equal(textoSede("1201"), "Iquitos · Selva");
	assert.equal(textoSede("2701"), "Arequipa");
	assert.equal(textoSede("2602"), "Piura");
	assert.equal(textoSede("9999"), "");
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

test("sociedadDeCentro por el primer digito; principalDe y ciudadesDeSociedad respetan la sociedad", () => {
	assert.equal(sociedadDeCentro("1001"), "1100");
	assert.equal(sociedadDeCentro("2701"), "1200");
	assert.equal(sociedadDeCentro("3301"), "1300");
	assert.equal(sociedadDeCentro("4001"), "");
	const lima = ciudadPorClave("LIMA")!;
	assert.equal(principalDe(lima, "1200").centro, "2001");
	assert.equal(principalDe(lima, "1100").centro, "1001");
	assert.deepEqual(ciudadesDeSociedad("1200").map((c) => c.nombre), ["Lima", "Piura", "Arequipa"]);
	assert.ok(!ciudadesDeSociedad("1100").some((c) => c.nombre === "Arequipa"));
	assert.equal(ciudadesDeSociedad("").length, CIUDADES.length);
});
