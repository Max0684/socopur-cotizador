import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarCorreo, obtenerCorreo } from "../webapp/model/UsuarioBtp.ts";

test("normalizarCorreo deja el correo en minusculas y sin espacios; lo que no es correo queda vacio", () => {
	assert.equal(normalizarCorreo("  Ana.Perez@Socopur.PE "), "ana.perez@socopur.pe");
	assert.equal(normalizarCorreo("STA_AROJAS"), "");
	assert.equal(normalizarCorreo(undefined), "");
	assert.equal(normalizarCorreo("a b@c.pe"), "");
});

test("obtenerCorreo usa el launchpad y, si no trae correo o falla, el user-api del approuter", async () => {
	assert.equal(await obtenerCorreo({ launchpad: async () => "uno@socopur.pe", userApi: async () => "dos@socopur.pe" }), "uno@socopur.pe");
	assert.equal(await obtenerCorreo({ launchpad: async () => "", userApi: async () => "dos@socopur.pe" }), "dos@socopur.pe");
	assert.equal(
		await obtenerCorreo({
			launchpad: async () => {
				throw new Error("sin shell");
			},
			userApi: async () => "dos@socopur.pe"
		}),
		"dos@socopur.pe"
	);
	assert.equal(
		await obtenerCorreo({
			launchpad: async () => "",
			userApi: async () => {
				throw new Error("404");
			}
		}),
		""
	);
	assert.equal(await obtenerCorreo({}), "");
});
