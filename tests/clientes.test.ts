import { test } from "node:test";
import assert from "node:assert/strict";
import { filtroClientes } from "../webapp/model/FiltrosCliente.ts";

test("filtroClientes: texto vacio no genera filtro", () => {
	assert.equal(filtroClientes("   ", "1103"), "");
});

test("filtroClientes: una organizacion, o varias con 'or'", () => {
	assert.ok(filtroClientes("jyas", "1103").startsWith("Vkorg eq '1103' and ("));
	const f = filtroClientes("jyas", ["1103", "1101", "1103"]);
	assert.ok(f.startsWith("(Vkorg eq '1103' or Vkorg eq '1101') and ("));
});

test("filtroClientes: el nombre busca cada palabra en Name1 o Name2, en mayusculas y en cualquier orden", () => {
	const f = filtroClientes("racing motors", ["1101", "1103"]);
	assert.ok(f.includes("(contains(Name1,'RACING') or contains(Name2,'RACING'))"));
	assert.ok(f.includes("(contains(Name1,'MOTORS') or contains(Name2,'MOTORS'))"));
	assert.ok(f.includes(" and (contains(Name1,'MOTORS')"));
});

test("filtroClientes: documento y numero de cliente siguen siendo exactos; las comillas se escapan", () => {
	const f = filtroClientes("20100070970", "1103");
	assert.ok(f.includes("Stcd1 eq '20100070970'"));
	assert.ok(f.includes("Kunnr eq '20100070970'"));
	assert.ok(filtroClientes("o'brien", "1103").includes("O''BRIEN"));
});
