import { test } from "node:test";
import assert from "node:assert/strict";
import { aContacto, aDirecciones, aMovimiento, estadoPartida, fechaPantalla, textoDireccion } from "../webapp/model/ClienteDetalleService.ts";

test("fechaPantalla pasa AAAA-MM-DD a DD/MM/AAAA y descarta lo invalido", () => {
	assert.equal(fechaPantalla("2026-09-23"), "23/09/2026");
	assert.equal(fechaPantalla(""), "");
	assert.equal(fechaPantalla(undefined), "");
});

test("estadoPartida: compensada, vencida o pendiente (casos reales de 0100022835)", () => {
	assert.equal(estadoPartida({ Abierta: false, Vencida: false }), "Compensada");
	assert.equal(estadoPartida({ Abierta: true, Vencida: true }), "Vencida");
	assert.equal(estadoPartida({ Abierta: true, Vencida: false }), "Pendiente");
	assert.equal(estadoPartida({ Abierta: "X", Vencida: "X" }), "Vencida");
});

test("aMovimiento: ND abierta vencida y NC abierta con importe negativo", () => {
	const nd = aMovimiento({ Kunnr: "0100022835", Belnr: "1200000642", Blart: "D8", BlartTexto: "ND Factura Deudor", Budat: "2026-09-23", Waers: "PEN", Wrbtr: "150.00", Abierta: true, Vencida: true });
	assert.equal(nd.estado, "Vencida");
	assert.equal(nd.fecha, "23/09/2026");
	assert.equal(nd.tipo, "ND Factura Deudor");
	assert.match(nd.monto, /150[.,]00/);
	const nc = aMovimiento({ Kunnr: "0100022835", Belnr: "1200000635", Blart: "D7", Budat: "2026-09-12", Wrbtr: "-1395.50", Abierta: true, Vencida: false });
	assert.equal(nc.estado, "Pendiente");
	assert.equal(nc.tipo, "D7");
	assert.ok(nc.monto.startsWith("-"));
	assert.equal(nc.moneda, "PEN");
});

test("textoDireccion arma la direccion con el ubigeo y omite lo que falte", () => {
	assert.equal(
		textoDireccion({ Kunnr: "0100024840", Tipo: "FISCAL", Kunn2: "0100024840", Calle: "JR. MAYA DE BRITTO NRO. 528", Distrito: "CALLERIA", Provincia: "CORONEL PORTILLO", RegionTexto: "Ucayali", Ubigeo: "250101" }),
		"JR. MAYA DE BRITTO NRO. 528, CALLERIA, CORONEL PORTILLO, Ucayali (250101)"
	);
	assert.equal(textoDireccion({ Kunnr: "1", Tipo: "WE", Kunn2: "2", Calle: "AV. X", Numero: "10" }), "AV. X 10");
});

test("aDirecciones: la fiscal va primero y los destinatarios WE se identifican por su cliente", () => {
	const r = aDirecciones(
		[
			{ Kunnr: "1", Tipo: "WE", Kunn2: "0100099999", Nombre: "OBRA NORTE", Calle: "Mz B" },
			{ Kunnr: "1", Tipo: "FISCAL", Kunn2: "1", Calle: "Av. Principal" }
		],
		"Fiscal / Facturacion"
	);
	assert.deepEqual(r.map((d) => [d.id, d.tipo, d.alias]), [
		["FISCAL", "Fiscal", "Fiscal / Facturacion"],
		["WE-0100099999", "Envio", "OBRA NORTE"]
	]);
});

test("aContacto: toma el predeterminado; sin predeterminado prefiere el movil; vacio si no hay", () => {
	const r = aContacto([
		{ Tipo: "MAIL", Seq: 1, Valor: "otro@x.pe" },
		{ Tipo: "MAIL", Seq: 2, Valor: "principal@x.pe", EsDefault: "X" },
		{ Tipo: "TEL", Seq: 1, Valor: "014000000" },
		{ Tipo: "TEL", Seq: 2, Valor: "961021613", EsMovil: "X" }
	]);
	assert.equal(r.correo, "principal@x.pe");
	assert.equal(r.telefono, "961021613");
	assert.deepEqual(aContacto([]), { correo: "", telefono: "" });
});
