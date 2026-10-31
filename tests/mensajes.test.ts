import { test } from "node:test";
import assert from "node:assert/strict";
import { motivoDeError } from "../webapp/model/Mensajes.ts";

// Mensaje que quedo en el modelo de un intento anterior (31/10/2026: el dump del primer intento de pedido).
const viejos = () => [{ type: "Error", message: "ABAP Runtime error 'BEHAVIOR_ILLEGAL_STATEMENT'" }];

test("un error propio (motivo que SAP dejo en la cotizacion) se muestra tal cual, sin los mensajes viejos del modelo", () => {
	const motivo = "[Pedido grupo 01] Material 12N7BL-BS-SI-SF posición 000020 no tiene stock disponible. Solo se cuenta con 1.000 Und.";
	assert.equal(motivoDeError(new Error(motivo), viejos), motivo);
});

test("un error del servicio usa su causa o, si no la trae, los mensajes de error del modelo", () => {
	const conCausa = Object.assign(new Error("HTTP request failed"), { status: 400, cause: new Error("No value for mandatory parameter 'Sesion'") });
	assert.equal(motivoDeError(conCausa, viejos), "No value for mandatory parameter 'Sesion'");
	const lote = new Error("HTTP request failed because the $batch failed");
	assert.equal(motivoDeError(lote, viejos), "ABAP Runtime error 'BEHAVIOR_ILLEGAL_STATEMENT'");
	const sinNada = Object.assign(new Error("Bad Request"), { status: 400 });
	assert.equal(motivoDeError(sinNada, () => []), "Bad Request");
});
