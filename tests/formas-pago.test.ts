import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarFormasPago, opcionesDeFormasPago, type FormaPagoSap } from "../webapp/model/FormasPagoService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const filas: FormaPagoSap[] = [
	{ Zterm: "CIR7", Texto: "Credito 7 dias", Dias: 7 },
	{ Zterm: "C045", Texto: "Credito 45 dias", Dias: 45 },
	{ Zterm: "C000", Texto: "Contado", Dias: 0 },
	{ Zterm: "C030", Texto: "Credito 30 dias", Dias: 30 },
	{ Zterm: "", Texto: "sin codigo", Dias: 0 }
];

test("opcionesDeFormasPago pone el contado primero y ordena por dias de plazo", () => {
	const o = opcionesDeFormasPago(filas);
	assert.deepEqual(o.map((x) => x.key), ["C000", "CIR7", "C030", "C045"]);
	assert.equal(o[0].text, "C000 Contado");
	assert.equal(o[0].contado, true);
	assert.equal(o[1].contado, false);
});

test("opcionesDeFormasPago respeta la marca EsContado del servicio y usa el codigo si no hay texto", () => {
	const o = opcionesDeFormasPago([{ Zterm: "X100", Dias: 10, EsContado: "X" }, { Zterm: "C030", Texto: "Credito", Dias: 30, EsContado: "" }]);
	assert.equal(o[0].key, "X100");
	assert.equal(o[0].text, "X100");
	assert.equal(o[0].contado, true);
	assert.equal(o[1].contado, false);
});

test("cargarFormasPago devuelve null si el servicio aun no publica la entidad (no inventa condiciones)", async () => {
	const { modelo } = crearModeloFalso({ precios: filas as unknown as Record<string, unknown>[] });
	assert.equal(await cargarFormasPago(modelo as unknown as Parameters<typeof cargarFormasPago>[0]), null);
});

test("cargarFormasPago lee la entidad FormaPago cuando esta publicada", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: filas as unknown as Record<string, unknown>[], camposPublicados: ["FormaPago/Zterm"] });
	const o = await cargarFormasPago(modelo as unknown as Parameters<typeof cargarFormasPago>[0]);
	assert.deepEqual(o?.map((x) => x.key), ["C000", "CIR7", "C030", "C045"]);
	assert.match(llamadas[0], /^read \/FormaPago/);
});
