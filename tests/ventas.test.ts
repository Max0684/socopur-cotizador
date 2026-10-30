import { test } from "node:test";
import assert from "node:assert/strict";
import { aFilaVenta, csvVentas, fechaIso, filtroVentas, leerVentas, periodoDelMes, resumirVentas, ventasPublicadas } from "../webapp/model/VentasService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const como = (m: unknown) => m as Parameters<typeof leerVentas>[0];

// Filas como las devuelve VentaVendedor (YC_COTIZ_VENTAVEND) en el 130.
const filas = [
	{ Tipo: "FACTURA", Documento: "9000012345", Pernr: "99000354", Fecha: "2026-10-15", Clase: "Z301", Kunnr: "0100024840", Cliente: "JYAS MOTORS E.I.R.L.", Vkorg: "1103", ValorNeto: "1200.50", Moneda: "PEN" },
	{ Tipo: "OFERTA", Documento: "3100007401", Pernr: "99000354", Fecha: "2026-10-14", Clase: "Z300", Kunnr: "0100024840", Cliente: "JYAS; MOTORS", Vkorg: "1103", ValorNeto: 100, Moneda: "USD" },
	{ Tipo: "OFERTA", Documento: "3100007402", Pernr: "99000354", Fecha: "2026-10-13", Clase: "Z300", Kunnr: "0100022844", Cliente: "OSANTRAK", Vkorg: "1103", ValorNeto: 50.25, Moneda: "PEN" },
	{ Tipo: "PEDIDO", Documento: "3300008269", Pernr: "99000354", Fecha: "2026-10-13", Clase: "Z310", Kunnr: "0100024840", Cliente: "JYAS", Vkorg: "1103", ValorNeto: 300, Moneda: "PEN" },
	{ Tipo: "OFERTA", Documento: "3100007403", Pernr: "99000354", Fecha: "2026-10-12", Clase: "Z300", Kunnr: "0100022844", Cliente: "OSANTRAK", Vkorg: "1103", ValorNeto: 49.75, Moneda: "PEN" }
].map(aFilaVenta);

test("periodoDelMes y fechaIso: del primero del mes a hoy, como literal Edm.Date", () => {
	const { desde, hasta } = periodoDelMes(new Date(2026, 9, 29, 18, 30));
	assert.equal(fechaIso(desde), "2026-10-01");
	assert.equal(fechaIso(hasta), "2026-10-29");
});

test("filtroVentas: PERNR entre comillas y fechas sin comillas", () => {
	assert.equal(filtroVentas("99000354", new Date(2026, 9, 1), new Date(2026, 9, 29)), "Pernr eq '99000354' and Fecha ge 2026-10-01 and Fecha le 2026-10-29");
});

test("aFilaVenta: valor numerico aunque SAP lo mande como texto", () => {
	assert.equal(filas[0].valor, 1200.5);
	assert.equal(filas[0].tipo, "FACTURA");
});

test("resumirVentas: por tipo (oferta, pedido, factura) y moneda, soles primero", () => {
	assert.deepEqual(resumirVentas(filas), [
		{ tipo: "OFERTA", moneda: "PEN", cantidad: 2, total: 100 },
		{ tipo: "OFERTA", moneda: "USD", cantidad: 1, total: 100 },
		{ tipo: "PEDIDO", moneda: "PEN", cantidad: 1, total: 300 },
		{ tipo: "FACTURA", moneda: "PEN", cantidad: 1, total: 1200.5 }
	]);
});

test("csvVentas: BOM, separador ; y comillas donde hace falta", () => {
	const csv = csvVentas(filas.slice(0, 2), ["Fecha", "Tipo", "Doc", "Clase", "N", "Cliente", "Org", "Valor", "Moneda"], (t) => (t === "OFERTA" ? "Oferta" : "Factura"));
	const lineas = csv.replace("﻿", "").trim().split("\r\n");
	assert.ok(csv.startsWith("﻿"));
	assert.equal(lineas[0], "Fecha;Tipo;Doc;Clase;N;Cliente;Org;Valor;Moneda");
	assert.equal(lineas[1], "2026-10-15;Factura;9000012345;Z301;0100024840;JYAS MOTORS E.I.R.L.;1103;1200.50;PEN");
	assert.equal(lineas[2], '2026-10-14;Oferta;3100007401;Z300;0100024840;"JYAS; MOTORS";1103;100.00;USD');
});

test("ventasPublicadas y leerVentas: solo con la entidad publicada; pide el periodo y el orden", async () => {
	const sin = crearModeloFalso();
	assert.equal(await ventasPublicadas(como(sin.modelo)), false);
	const con = crearModeloFalso({ camposPublicados: ["VentaVendedor/Pernr"], precios: [filas[0]].map((f) => ({ Tipo: f.tipo, Documento: f.documento, ValorNeto: f.valor })) });
	assert.equal(await ventasPublicadas(como(con.modelo)), true);
	const leidas = await leerVentas(como(con.modelo), "99000354", new Date(2026, 9, 1), new Date(2026, 9, 29));
	assert.equal(leidas[0].documento, "9000012345");
	assert.ok(con.llamadas.includes("read /VentaVendedor Pernr eq '99000354' and Fecha ge 2026-10-01 and Fecha le 2026-10-29"));
});
