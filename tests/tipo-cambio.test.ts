import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTipoCambio, tipoCambioTexto } from "../webapp/model/TipoCambioService.ts";

const modelo = (fila: Record<string, unknown>, filtros: string[] = []) =>
	({
		bindList: (_ruta: string, _c: unknown, _s: unknown, _f: unknown, p: { $filter: string }) => {
			filtros.push(p.$filter);
			return { async requestContexts() { return [{ getObject: () => fila }]; } };
		}
	}) as unknown as Parameters<typeof leerTipoCambio>[0];

test("leerTipoCambio devuelve el tipo de SAP y la fecha desde la que vale", async () => {
	const filtros: string[] = [];
	const tc = await leerTipoCambio(modelo({ Cambio: "3.40600", VigenteDesde: "2026-10-01" }, filtros));
	assert.deepEqual(tc, { cambio: 3.406, desde: "2026-10-01" });
	assert.equal(filtros[0], "Moneda eq 'USD' and MonedaLocal eq 'PEN'");
});

test("leerTipoCambio filtra por la fecha de la oferta cuando se la pasan", async () => {
	const filtros: string[] = [];
	await leerTipoCambio(modelo({ Cambio: 3.385, VigenteDesde: "2026-09-24" }, filtros), "2026-09-24");
	assert.equal(filtros[0], "Moneda eq 'USD' and MonedaLocal eq 'PEN' and Fecha eq 2026-09-24");
});

test("leerTipoCambio falla con el mensaje de SAP si no hay tipo", async () => {
	await assert.rejects(() => leerTipoCambio(modelo({ Cambio: "0", Mensaje: "SAP no tiene tipo de cambio M de USD a PEN" })), /no tiene tipo de cambio/);
});

test("tipoCambioTexto quita los ceros de relleno", () => {
	assert.equal(tipoCambioTexto(3.406), "3.406");
	assert.equal(tipoCambioTexto(3.38512), "3.3851");
});
