import { test } from "node:test";
import assert from "node:assert/strict";
import { digitoVerificadorRuc, validarDocumento } from "../webapp/model/Documento.ts";

test("digitoVerificadorRuc: RUC conocidos (modulo 11 de SUNAT)", () => {
	assert.equal(digitoVerificadorRuc("2012345678"), 6);
	assert.equal(digitoVerificadorRuc("2051234567"), 1);
});

test("validarDocumento RUC: formato, prefijo y digito verificador", () => {
	assert.equal(validarDocumento("RUC", "20123456786"), null);
	assert.equal(validarDocumento("RUC", " 20123456786 "), null);
	assert.equal(validarDocumento("RUC", "20123456787"), "rucDigito");
	assert.equal(validarDocumento("RUC", "30123456786"), "rucFormato");
	assert.equal(validarDocumento("RUC", "2012345678"), "rucFormato");
	assert.equal(validarDocumento("RUC", "2012345678a"), "rucFormato");
});

test("validarDocumento RUC: sin modo estricto no exige el digito (RUC de ejemplo del prototipo)", () => {
	assert.equal(validarDocumento("RUC", "20512345678", false), null);
	assert.equal(validarDocumento("RUC", "20512345678", true), "rucDigito");
});

test("validarDocumento DNI: 8 digitos y sin valores obviamente falsos", () => {
	assert.equal(validarDocumento("DNI", "45219034"), null);
	assert.equal(validarDocumento("DNI", "4521903"), "dniFormato");
	assert.equal(validarDocumento("DNI", "452190345"), "dniFormato");
	assert.equal(validarDocumento("DNI", "4521903a"), "dniFormato");
	assert.equal(validarDocumento("DNI", "00000000"), "dniFalso");
	assert.equal(validarDocumento("DNI", "11111111"), "dniFalso");
});

test("validarDocumento: un tipo desconocido no se valida aqui", () => {
	assert.equal(validarDocumento("CE", "123"), null);
});
