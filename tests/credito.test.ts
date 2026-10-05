import { test } from "node:test";
import assert from "node:assert/strict";
import { aSaldo, aSegmento, fechaLocalISO, normalizarFecha, resumirCredito } from "../webapp/model/CreditoClienteService.ts";

const HOY = "2026-10-05";

test("normalizarFecha acepta AAAAMMDD y AAAA-MM-DD, y descarta lo demas", () => {
	assert.equal(normalizarFecha("20251231"), "2025-12-31");
	assert.equal(normalizarFecha("2025-12-31"), "2025-12-31");
	assert.equal(normalizarFecha("00000000"), "");
	assert.equal(normalizarFecha(undefined), "");
	assert.equal(normalizarFecha("31/12/2025"), "");
});

test("aSegmento: limite vencido (caso 0100024840: 30000, vencido al 31/12/2025)", () => {
	const s = aSegmento({ Kunnr: "0100024840", CreditSgmnt: "1102", CreditLimit: "30000.00", LimitValidDate: "20251231", RiskClass: "Z1" }, HOY);
	assert.equal(s.limite, 30000);
	assert.equal(s.vigente, false);
	assert.equal(s.bloqueado, false);
});

test("aSegmento: vigente sin vencimiento (99991231) y vigente el mismo dia del vencimiento", () => {
	assert.equal(aSegmento({ Kunnr: "1", CreditSgmnt: "1202", CreditLimit: 20000, LimitValidDate: "99991231" }, HOY).vigente, true);
	assert.equal(aSegmento({ Kunnr: "1", CreditSgmnt: "1202", CreditLimit: 20000, LimitValidDate: "20261005" }, HOY).vigente, true);
	assert.equal(aSegmento({ Kunnr: "1", CreditSgmnt: "1202", CreditLimit: 20000 }, HOY).vigente, true);
});

test("resumirCredito: cliente sin partidas ni limite = SinDatos", () => {
	const r = resumirCredito([], [], "PEN");
	assert.equal(r.estado, "SinDatos");
	assert.equal(r.disponible, null);
});

test("resumirCredito: limite vencido sin deuda vencida = LimiteVencido (0100024840 con el segmento 1102)", () => {
	const seg = [aSegmento({ Kunnr: "0100024840", CreditSgmnt: "1102", CreditLimit: 30000, LimitValidDate: "20251231" }, HOY)];
	const r = resumirCredito(seg, [], "PEN", "1102");
	assert.equal(r.estado, "LimiteVencido");
	assert.equal(r.disponible, 30000);
});

test("resumirCredito: varios segmentos; sin mapeo no se elige ninguno ni se calcula disponible", () => {
	const seg = [
		aSegmento({ Kunnr: "0100022835", CreditSgmnt: "1101", CreditLimit: 1000, LimitValidDate: "30001231" }, HOY),
		aSegmento({ Kunnr: "0100022835", CreditSgmnt: "1103", CreditLimit: 1000, LimitValidDate: "20251231" }, HOY)
	];
	const r = resumirCredito(seg, [], "PEN");
	assert.equal(r.segmentoElegido, null);
	assert.equal(r.disponible, null);
	assert.equal(r.estado, "AlDia");
	assert.equal(resumirCredito(seg, [], "PEN", "1103").estado, "LimiteVencido");
	assert.equal(resumirCredito(seg, [], "PEN", "1101").estado, "AlDia");
});

test("resumirCredito: saldo vencido manda sobre limite vencido; solo suma la moneda pedida", () => {
	const seg = [aSegmento({ Kunnr: "1", CreditSgmnt: "1101", CreditLimit: 1000, LimitValidDate: "20251231" }, HOY)];
	const saldos = [
		aSaldo({ Kunnr: "1", Bukrs: "1100", Waers: "PEN", SaldoAbierto: "700.50", Vencido: "150.00" }),
		aSaldo({ Kunnr: "1", Bukrs: "1100", Waers: "USD", SaldoAbierto: "99999", Vencido: "99999" })
	];
	const r = resumirCredito(seg, saldos, "PEN", "1101");
	assert.equal(r.estado, "Vencido");
	assert.equal(r.saldoTotal, 700.5);
	assert.equal(r.vencidoTotal, 150);
	assert.equal(r.disponible, 299.5);
});

test("resumirCredito: bloqueo del segmento elegido manda sobre todo; disponible nunca es negativo", () => {
	const seg = [aSegmento({ Kunnr: "1", CreditSgmnt: "1101", CreditLimit: 500, LimitValidDate: "99991231", Xblocked: "X", BlockReason: "01" }, HOY)];
	const saldos = [aSaldo({ Kunnr: "1", Bukrs: "1100", Waers: "PEN", SaldoAbierto: 800, Vencido: 100 })];
	const r = resumirCredito(seg, saldos, "PEN", "1101");
	assert.equal(r.estado, "Bloqueado");
	assert.equal(r.disponible, 0);
});

test("fechaLocalISO usa la fecha local, no UTC", () => {
	assert.equal(fechaLocalISO(new Date(2026, 9, 5, 23, 30)), "2026-10-05");
	assert.equal(fechaLocalISO(new Date(2026, 0, 3, 0, 5)), "2026-01-03");
});
