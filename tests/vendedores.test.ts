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

test("filtroEmpleado: solo digitos = PERNR exacto de 8; texto = nombre contiene en mayusculas y con comillas escapadas", async () => {
	const { filtroEmpleado } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(filtroEmpleado("406"), "Pernr eq '00000406'");
	assert.equal(filtroEmpleado("99000354"), "Pernr eq '99000354'");
	assert.equal(filtroEmpleado("  ana o'neil "), "contains(Nombre,'ANA O''NEIL')");
});

test("claveVendedor distingue las filas de un mismo PERNR por organizacion y tipo de venta", async () => {
	const { claveVendedor } = await import("../webapp/model/VendedoresService.ts");
	const a = claveVendedor({ pernr: "99000298", vkorg: "1103", tipo: "repuestos" });
	const b = claveVendedor({ pernr: "99000298", vkorg: "1303", tipo: "repuestos" });
	assert.notEqual(a, b);
	assert.equal(a, "99000298|1103|repuestos");
});

test("filtroEmpleado con sociedad suma el filtro Bukrs; sociedadesDe saca las distintas, ordenadas y con nombre", async () => {
	const { filtroEmpleado, sociedadesDe, textoSociedad } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(filtroEmpleado("406"), "Pernr eq '00000406'");
	assert.equal(filtroEmpleado("406", "1200"), "Pernr eq '00000406' and Bukrs eq '1200'");
	assert.equal(filtroEmpleado("garay", "1100"), "contains(Nombre,'GARAY') and Bukrs eq '1100'");
	assert.deepEqual(sociedadesDe([{ Bukrs: "1200" }, { Bukrs: "1100" }, { Bukrs: "1200" }, {}, { Bukrs: "9999" }]).map((o) => o.key), ["1100", "1200", "9999"]);
	assert.equal(textoSociedad("1300"), "1300 Socopur Selva");
	assert.equal(textoSociedad("9999"), "9999");
});

test("organizacionesDeSociedad: cada sociedad ofrece sus tres organizaciones (vehiculos, taller, repuestos)", async () => {
	const { organizacionesDeSociedad, orgPorDefecto } = await import("../webapp/model/VendedoresService.ts");
	assert.deepEqual(organizacionesDeSociedad("1100").map((o) => o.key), ["1101", "1102", "1103"]);
	assert.deepEqual(organizacionesDeSociedad("1200").map((o) => o.key), ["1201", "1202", "1203"]);
	assert.deepEqual(organizacionesDeSociedad("1300").map((o) => o.key), ["1301", "1302", "1303"]);
	assert.equal(organizacionesDeSociedad("").length, 9);
	assert.match(organizacionesDeSociedad("1200")[2].text, /1203 Repuestos Promogesa/);
	assert.equal(orgPorDefecto("repuestos", "1200"), "1203");
	assert.equal(orgPorDefecto("vehiculos", "1300"), "1301");
	assert.equal(orgPorDefecto("repuestos", ""), "1103");
});

test("textoOrganizacion: descripcion de las organizaciones conocidas; una desconocida queda con su codigo", async () => {
	const { textoOrganizacion } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(textoOrganizacion("1203"), "1203 Repuestos Promogesa");
	assert.equal(textoOrganizacion("1101"), "1101 Vehículos Socopur");
	assert.equal(textoOrganizacion("1302"), "1302 Taller Socopur Selva");
	assert.equal(textoOrganizacion("9999"), "9999");
});
