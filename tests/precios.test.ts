import { test } from "node:test";
import assert from "node:assert/strict";
import { consultarPrecio, filtroPrecio, type ConsultaPrecio } from "../webapp/model/PreciosService.ts";
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
