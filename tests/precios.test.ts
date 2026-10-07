import { test } from "node:test";
import assert from "node:assert/strict";
import { consultarPrecio, filtroPrecio, impuestosDeCondiciones, type ConsultaPrecio } from "../webapp/model/PreciosService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const consulta: ConsultaPrecio = {
	kunnr: "0100024840",
	vkorg: "1103",
	vtweg: "10",
	spart: "50",
	auart: "Z300",
	matnr: "SFX428H-150-MTK",
	werks: "1101",
	cantidad: 100,
	waers: "PEN"
};

const como = (m: unknown) => m as Parameters<typeof consultarPrecio>[0];

test("filtroPrecio arma el $filter con eq en todos los campos y la cantidad numerica", () => {
	assert.equal(
		filtroPrecio(consulta),
		"Kunnr eq '0100024840' and Vkorg eq '1103' and Vtweg eq '10' and Spart eq '50' and Auart eq 'Z300' and Matnr eq 'SFX428H-150-MTK' and Werks eq '1101' and Cantidad eq 100 and Waers eq 'PEN'"
	);
});

test("filtroPrecio duplica las comillas y agrega la fecha si viene", () => {
	const f = filtroPrecio({ ...consulta, matnr: "A'B", fecha: "2026-10-03" });
	assert.match(f, /Matnr eq 'A''B'/);
	assert.match(f, /Fecha eq 2026-10-03$/);
});

test("consultarPrecio devuelve el precio de SAP (PEN 17.50, verificado por OData)", async () => {
	const { modelo, llamadas } = crearModeloFalso({
		precios: [{ Moneda: "PEN", PrecioLista: "1750.00", PrecioUnitario: "17.50", Neto: "1750.00", Impuestos: "0.00", Respuesta: 0, Mensaje: "" }]
	});
	const p = await consultarPrecio(como(modelo), consulta);
	assert.deepEqual(p, { moneda: "PEN", precioLista: 1750, precioUnitario: 17.5, neto: 1750, impuestos: 0 });
	assert.match(llamadas[0], /^read \/Precio Kunnr eq '0100024840'/);
});

test("consultarPrecio en USD usa el precio convertido por SAP (5.14)", async () => {
	const { modelo } = crearModeloFalso({
		precios: [{ Moneda: "USD", PrecioLista: 514, PrecioUnitario: 5.14, Neto: 514, Impuestos: 0, Respuesta: 0, Mensaje: "" }]
	});
	const p = await consultarPrecio(como(modelo), { ...consulta, waers: "USD" });
	assert.equal(p.precioUnitario, 5.14);
	assert.equal(p.moneda, "USD");
});

test("consultarPrecio lanza el mensaje de SAP si no hay precio (no inventa uno)", async () => {
	const { modelo } = crearModeloFalso({ precios: [{ Respuesta: 1, Mensaje: "Sin precio para X" }] });
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), { message: "Sin precio para X" });
});

test("consultarPrecio lanza error si el servicio no devuelve filas", async () => {
	const { modelo } = crearModeloFalso({ precios: [] });
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), { message: "SAP no devolvio precio" });
});

test("filtroPrecio agrega Varcond solo si es un vehiculo", () => {
	const base = { kunnr: "1", vkorg: "1101", vtweg: "10", spart: "10", auart: "Z100", matnr: "DU200Z0", werks: "1101", cantidad: 1, waers: "PEN" as const };
	assert.ok(!filtroPrecio(base).includes("Varcond"));
	assert.ok(filtroPrecio({ ...base, varcond: "DU200Z0CBU2025ANA" }).endsWith("and Varcond eq 'DU200Z0CBU2025ANA'"));
});

test("consultarPrecio: un precio unitario de 0 es 'sin precio vigente' y lanza error (caso 1203/11 con el Z300 borrado)", async () => {
	const { modelo } = crearModeloFalso({
		precios: [{ Moneda: "PEN", PrecioLista: "0.00", PrecioUnitario: "0.00", Neto: "0.00", Impuestos: "0.00", Respuesta: 0, Mensaje: "" }]
	});
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), /precio vigente/);
});

test("impuestosDeCondiciones: suma el Total de ZIGV y de ZISC por separado e ignora las demas condiciones (caso 65.30 con IGV 18 %)", () => {
	const r = impuestosDeCondiciones([
		{ CondType: "Z303", Total: "65.30" },
		{ CondType: "Z302", Total: "65.30" },
		{ CondType: "ZIGV", Total: "11.75" },
		{ CondType: "ZISC", Total: "0.00" }
	]);
	assert.deepEqual(r, { igv: 11.75, isc: 0 });
});

test("impuestosDeCondiciones: sin condiciones de impuesto (cliente exonerado o sin base) da cero y varias filas del mismo tipo se suman", () => {
	assert.deepEqual(impuestosDeCondiciones([{ CondType: "Z303", Total: "65.30" }]), { igv: 0, isc: 0 });
	assert.deepEqual(impuestosDeCondiciones([{ CondType: "ZIGV", Total: "1.10" }, { CondType: "ZIGV", Total: 2.2 }, { CondType: "ZISC", Total: "5" }]), { igv: 3.3, isc: 5 });
	assert.deepEqual(impuestosDeCondiciones([]), { igv: 0, isc: 0 });
});

test("filtroPrecio agrega oficina y forma de pago cuando vienen", () => {
	const f = filtroPrecio({ ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(f, / and Vkbur eq '2001' and Zterm eq 'C000'$/);
	assert.doesNotMatch(filtroPrecio(consulta), /Vkbur|Zterm/);
});

const fila = [{ Moneda: "PEN", PrecioLista: "65.30", PrecioUnitario: "58.77", Neto: "49.81", Impuestos: "8.96", Respuesta: 0, Mensaje: "" }];

test("consultarPrecio manda oficina y forma de pago solo si el servicio ya publica esos campos", async () => {
	const publicado = crearModeloFalso({ precios: fila, camposPublicados: ["Precio/Vkbur", "Precio/Zterm"] });
	await consultarPrecio(como(publicado.modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(publicado.llamadas[0], /Vkbur eq '2001' and Zterm eq 'C000'/);

	const antiguo = crearModeloFalso({ precios: fila });
	await consultarPrecio(como(antiguo.modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.doesNotMatch(antiguo.llamadas[0], /Vkbur|Zterm/);
});

test("consultarPrecio manda solo el campo que el servicio publica", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: fila, camposPublicados: ["Precio/Vkbur"] });
	await consultarPrecio(como(modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(llamadas[0], /Vkbur eq '2001'/);
	assert.doesNotMatch(llamadas[0], /Zterm/);
});
