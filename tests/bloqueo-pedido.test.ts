import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluarBloqueoPedido } from "../webapp/model/BloqueoPedido.ts";
import type { GrupoEstado } from "../webapp/model/odata/Entidades.ts";

const estado = (parcial: Partial<GrupoEstado>): GrupoEstado => ({
	CotizId: "1", GrupoNo: "01", VbelnPedido: "100", EstadoCredito: "", BloqueoEntrega: "", BloqueoFactura: "", Liberado: "",
	MonedaPedido: "PEN", NetoPedido: "0", ImpuestoPedido: "0", TotalPedido: "0", ...parcial
});

test("sin estado leido no se inventa bloqueo", () => {
	assert.equal(evaluarBloqueoPedido(null, "Z311", "C000"), null);
});

test("contado con Z1 de facturacion: Bandeja Caja, sin aviso de credito", () => {
	const b = evaluarBloqueoPedido(estado({ BloqueoFactura: "Z1" }), "Z311", "C000")!;
	assert.deepEqual(b.destinos, ["caja"]);
	assert.deepEqual(b.fila, [{ clave: "pedidoZ1CajaFactura", parametros: ["Z1"] }]);
	assert.deepEqual(b.avisos, ["pedidoAvisoCaja"]);
	assert.equal(b.discrepancia, "");
});

test("contado Z310: bloqueo de entrega en Caja", () => {
	const b = evaluarBloqueoPedido(estado({ BloqueoEntrega: "Z1" }), "Z310", "C000")!;
	assert.deepEqual(b.fila, [{ clave: "pedidoZ1CajaEntrega", parametros: ["Z1"] }]);
	assert.equal(b.discrepancia, "");
});

test("credito Retail: Z1 en Bandeja de Credito aunque el cliente tenga linea", () => {
	const b = evaluarBloqueoPedido(estado({ BloqueoFactura: "Z1" }), "Z116", "C030")!;
	assert.deepEqual(b.destinos, ["creditos"]);
	assert.deepEqual(b.avisos, ["pedidoAvisoCreditos"]);
	assert.equal(b.discrepancia, "");
});

test("credito mayorista con CMGST B: Case Management", () => {
	const b = evaluarBloqueoPedido(estado({ EstadoCredito: "B" }), "Z323", "C030")!;
	assert.deepEqual(b.destinos, ["caseManagement"]);
	assert.deepEqual(b.avisos, ["pedidoAvisoCaseManagement"]);
	assert.equal(b.discrepancia, "");
});

test("credito mayorista sin bloqueo: sin siguiente paso", () => {
	const b = evaluarBloqueoPedido(estado({}), "Z112", "C030")!;
	assert.deepEqual(b.destinos, []);
	assert.deepEqual(b.fila, [{ clave: "pedidoSinBloqueo", parametros: [] }]);
	assert.deepEqual(b.avisos, []);
	assert.equal(b.discrepancia, "");
});

test("si SAP no coincide con la matriz se muestra lo real y se marca la discrepancia", () => {
	const contadoSinZ1 = evaluarBloqueoPedido(estado({}), "Z311", "C000")!;
	assert.deepEqual(contadoSinZ1.fila, [{ clave: "pedidoSinBloqueo", parametros: [] }]);
	assert.match(contadoSinZ1.discrepancia, /contado sin Z1/);
	assert.match(evaluarBloqueoPedido(estado({ BloqueoFactura: "Z1", EstadoCredito: "B" }), "Z311", "C000")!.discrepancia, /Credit Management/);
	assert.match(evaluarBloqueoPedido(estado({ BloqueoFactura: "Z1" }), "Z310", "C000")!.discrepancia, /Z310/);
	assert.match(evaluarBloqueoPedido(estado({}), "Z311", "C030")!.discrepancia, /credito Retail/);
});

test("celdas por confirmar no generan discrepancia (Itinerante, clase desconocida)", () => {
	assert.equal(evaluarBloqueoPedido(estado({}), "Z319", "C000")!.discrepancia, "");
	assert.equal(evaluarBloqueoPedido(estado({ BloqueoFactura: "Z1" }), "Z319", "C030")!.discrepancia, "");
});
