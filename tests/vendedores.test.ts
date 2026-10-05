import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarVendedores, hashPin, normalizarPernr, pinCorrecto, type Vendedor } from "../webapp/model/VendedoresService.ts";

const v = (pernr: string, nombre: string, pinHash = ""): Vendedor => ({
	pernr, nombre, tipo: "repuestos", vkorg: "1103", vkbur: "1101", werks: "1101", lgort: "0001", vtweg: "11",
	zterm: "C000", vsbed: "02", waers: "PEN", vigenciaDias: 7, rol: "V", conPin: pinHash !== "", pinHash, activo: true
});

test("normalizarPernr completa a 8 digitos y deja intacto lo que no es numerico", () => {
	assert.equal(normalizarPernr(" 406 "), "00000406");
	assert.equal(normalizarPernr("99000406"), "99000406");
	assert.equal(normalizarPernr("ab1"), "ab1");
});

test("buscarVendedores busca por nombre sin tildes ni mayusculas y por PERNR", () => {
	const lista = [v("99000406", "María Pérez"), v("99000354", "Juan Soto")];
	assert.deepEqual(buscarVendedores(lista, "maria").map((x) => x.pernr), ["99000406"]);
	assert.deepEqual(buscarVendedores(lista, "354").map((x) => x.pernr), ["99000354"]);
	assert.equal(buscarVendedores(lista, "").length, 2);
	assert.equal(buscarVendedores(lista, "zzz").length, 0);
});

test("pinCorrecto: sin PIN guardado entra; con PIN compara el hash", async () => {
	assert.equal(await pinCorrecto(undefined, v("1", "A"), ""), true);
	const conPin = v("2", "B", await hashPin("1234"));
	assert.equal(await pinCorrecto(undefined, conPin, "1234"), true);
	assert.equal(await pinCorrecto(undefined, conPin, "9999"), false);
	assert.equal(await pinCorrecto(undefined, conPin, ""), false);
});
