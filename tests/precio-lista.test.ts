import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirPrecioLista, filtroPrecioLista, preciosPorMaterial, textoPrecioLista, type PrecioListaSap } from "../webapp/model/PrecioListaService.ts";

const f = (o: Partial<PrecioListaSap>): PrecioListaSap => ({ Vkorg: "1203", Vtweg: "10", Matnr: "SFX-18X300-C051", Kschl: "Z300", Importe: "65.30", Moneda: "PEN", Por: 1, Datab: "2025-10-28", ...o });

test("elegirPrecioLista: Z300 gana sobre Z200", () => {
	const p = elegirPrecioLista([f({ Kschl: "Z200", Importe: "70" }), f({ Kschl: "Z300", Importe: "65.30" })]);
	assert.equal(p?.kschl, "Z300");
	assert.equal(p?.importe, 65.3);
});

test("elegirPrecioLista: Z200 solo si falta Z300", () => {
	assert.equal(elegirPrecioLista([f({ Kschl: "Z200", Importe: "70" })])?.importe, 70);
});

test("elegirPrecioLista: con dos registros vigentes de la misma condicion gana el de inicio mas reciente", () => {
	const p = elegirPrecioLista([f({ Importe: "64.00", Datab: "2025-07-14" }), f({ Importe: "65.30", Datab: "2025-10-28" })]);
	assert.equal(p?.importe, 65.3);
});

test("elegirPrecioLista: un precio 'por' varias unidades se lleva a 1 unidad; sin filas no hay precio", () => {
	assert.equal(elegirPrecioLista([f({ Importe: "100", Por: 10 })])?.importe, 10);
	assert.equal(elegirPrecioLista([]), undefined);
});

test("preciosPorMaterial: mayorista es el canal 10 y retail el 11; cada material con lo que tenga", () => {
	const r = preciosPorMaterial([
		f({ Matnr: "A", Vtweg: "10", Importe: "2.00" }),
		f({ Matnr: "A", Vtweg: "11", Importe: "2.40" }),
		f({ Matnr: "B", Vtweg: "10", Importe: "5", Moneda: "USD" }),
		f({ Matnr: "C", Vtweg: "11", Importe: "9" }),
		f({ Matnr: "D", Vtweg: "14", Importe: "9" })
	]);
	assert.equal(r.A.mayorista?.importe, 2);
	assert.equal(r.A.retail?.importe, 2.4);
	assert.equal(r.B.mayorista?.moneda, "USD");
	assert.equal(r.B.retail, undefined);
	assert.equal(r.C.mayorista, undefined);
	assert.equal(r.C.retail?.importe, 9);
	assert.equal(r.D, undefined);
});

test("textoPrecioLista: soles, dolares, otra moneda y sin precio", () => {
	assert.equal(textoPrecioLista({ importe: 65.3, moneda: "PEN", kschl: "Z300" }), "S/ 65.30");
	assert.equal(textoPrecioLista({ importe: 1234.5, moneda: "USD", kschl: "Z300" }), "US$ 1,234.50");
	assert.equal(textoPrecioLista({ importe: 3, moneda: "EUR", kschl: "Z300" }), "EUR 3.00");
	assert.equal(textoPrecioLista(undefined), "—");
});

test("filtroPrecioLista: organizacion, canales 10 y 11 y como maximo 50 materiales; las comillas se escapan", () => {
	const mats = Array.from({ length: 60 }, (_, i) => `M${i}`);
	const filtro = filtroPrecioLista("1203", mats);
	assert.ok(filtro.startsWith("Vkorg eq '1203' and (Vtweg eq '10' or Vtweg eq '11') and ("));
	assert.equal((filtro.match(/Matnr eq/g) ?? []).length, 50);
	assert.ok(filtroPrecioLista("1103", ["O'B"]).includes("O''B"));
});

test("elegirPrecioLista: un precio marcado para borrado solo se devuelve si no hay ninguno vigente, y avisa", () => {
	const soloBorrado = elegirPrecioLista([f({ Importe: "64.00", Borrado: "X" })]);
	assert.equal(soloBorrado?.importe, 64);
	assert.equal(soloBorrado?.borrado, true);
	const conVigente = elegirPrecioLista([f({ Importe: "64.00", Borrado: true }), f({ Importe: "65.30", Datab: "2025-01-01" })]);
	assert.equal(conVigente?.importe, 65.3);
	assert.equal(conVigente?.borrado, false);
	assert.equal(elegirPrecioLista([f({ Importe: "70" })])?.borrado, false);
});

test("preciosPorMaterial: el canal con solo un precio borrado queda marcado; el otro canal sigue vigente (SFX-18X300-C051 en 1203)", () => {
	const r = preciosPorMaterial([
		f({ Vtweg: "10", Importe: "65.30" }),
		f({ Vtweg: "11", Importe: "64.00", Borrado: "X" })
	]);
	assert.equal(r["SFX-18X300-C051"].mayorista?.borrado, false);
	assert.equal(r["SFX-18X300-C051"].retail?.borrado, true);
	assert.equal(textoPrecioLista(r["SFX-18X300-C051"].retail), "S/ 64.00");
});
