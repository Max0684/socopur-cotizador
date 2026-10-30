import { test } from "node:test";
import assert from "node:assert/strict";
import { filtroClientes, palabrasDeNombre } from "../webapp/model/FiltrosCliente.ts";

test("filtroClientes: texto vacio no genera filtro", () => {
	assert.equal(filtroClientes("   ", "1103"), "");
});

test("filtroClientes: sin organizacion busca en todas; con una o varias, solo en ellas", () => {
	assert.ok(!filtroClientes("jyas").includes("Vkorg"));
	assert.ok(filtroClientes("jyas").startsWith("(Stcd1 eq 'jyas'"));
	assert.ok(filtroClientes("jyas", "1103").startsWith("Vkorg eq '1103' and ("));
	const f = filtroClientes("jyas", ["1103", "1101", "1103"]);
	assert.ok(f.startsWith("(Vkorg eq '1103' or Vkorg eq '1101') and ("));
});

test("filtroClientes: el nombre busca cada palabra en Name1 o Name2, en mayusculas y en cualquier orden", () => {
	const f = filtroClientes("racing motors", ["1101", "1103"]);
	assert.ok(f.includes("(contains(Name1,'RACING') or contains(Name2,'RACING'))"));
	assert.ok(f.includes("(contains(Name1,'MOTOR') or contains(Name2,'MOTOR'))"));
	assert.ok(f.includes(" and (contains(Name1,'MOTOR')"));
});

test("filtroClientes: documento y numero de cliente siguen siendo exactos; las comillas se escapan", () => {
	const f = filtroClientes("20100070970", "1103");
	assert.ok(f.includes("Stcd1 eq '20100070970'"));
	// Un RUC de 11 digitos no puede ser un numero de cliente (10 caracteres): no se manda ese filtro.
	assert.ok(!f.includes("Kunnr eq"));
	assert.ok(f.includes("Stcd2 eq '20100070970'"));
	assert.ok(filtroClientes("45211870", "1103").includes("Kunnr eq '0045211870'"));
	assert.ok(filtroClientes("100005387").includes("Kunnr eq '0100005387'"));
	// El apostrofo del texto no rompe el filtro: se quita al armar las palabras.
	assert.ok(!filtroClientes("o'brien", "1103").includes("O'BRIEN"));
	assert.ok(filtroClientes("o'brien", "1103").includes("OBRIEN"));
});

test("palabrasDeNombre: 'Racing Motors' y \"RACING MOTOR'S S.A.C.\" buscan lo mismo (RACING + MOTOR)", () => {
	assert.deepEqual(palabrasDeNombre("Racing Motors"), ["RACING", "MOTOR"]);
	assert.deepEqual(palabrasDeNombre("RACING MOTOR'S S.A.C."), ["RACING", "MOTOR"]);
	assert.deepEqual(palabrasDeNombre("racing   motor’s"), ["RACING", "MOTOR"]);
});

test("palabrasDeNombre: quita signos y letras sueltas; no recorta palabras cortas ni las que no terminan en S", () => {
	assert.deepEqual(palabrasDeNombre("S.A.C. - Los Olivos"), ["LOS", "OLIVO"]);
	assert.deepEqual(palabrasDeNombre("Gas"), ["GAS"]);
	assert.deepEqual(palabrasDeNombre("20275657604"), ["20275657604"]);
	assert.deepEqual(palabrasDeNombre("  ' . "), []);
});

test("filtroClientes con solo signos no filtra por nombre", () => {
	assert.ok(filtroClientes("'.", "1103").includes("or false)"));
});

test("filtroClientes: con otrosDocs busca tambien por carnet (Stcd3) y pasaporte (Stcd5, en mayusculas)", () => {
	const f = filtroClientes("aw064153", [], true);
	assert.ok(f.includes("Stcd3 eq 'aw064153'"));
	assert.ok(f.includes("Stcd5 eq 'AW064153'"));
	assert.ok(!filtroClientes("aw064153").includes("Stcd3"));
});
