import { test } from "node:test";
import assert from "node:assert/strict";
import { descuentosAplicados, filaDeCondicion, filasDeCondiciones, importeVisible, type CondicionServicio } from "../webapp/model/Condiciones.ts";
import { consultarCondiciones } from "../webapp/model/PreciosService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

// Condiciones reales de la linea 10 del pedido 3300008237 (DS4/130), desordenadas a proposito.
const pedido: CondicionServicio[] = [
	{ CondType: "ZIGV", Descripcion: "Impuesto IGV", Valor: 1.8, TipoCalculo: "A", Base: 58.77, Total: 8.96, Paso: "290", Contador: "000" },
	{ CondType: "Z339", Descripcion: "Dsc.Pos100%ICBP Bols", Valor: 0, Moneda: "PEN", UmPrecio: 1, Unidad: "UN", Base: 1, Total: 0, TipoCalculo: "C", Paso: "380" },
	{ CondType: "Z300", Descripcion: "Precio Lista", Valor: 65.3, Moneda: "PEN", UmPrecio: 1, Unidad: "UN", Base: 1, Total: 65.3, MonedaDoc: "PEN", TipoCalculo: "C", Paso: "010" },
	{ CondType: "Z320", Descripcion: "Dsc.Pos %", Valor: -1, TipoCalculo: "A", Base: 65.3, Total: -6.53, MonedaDoc: "PEN", Paso: "040" },
	{ CondType: "Z309", Descripcion: "Precio Mix", Valor: 0, Moneda: "PEN", Total: 0, TipoCalculo: "C", Inactiva: "X", Paso: "011" },
	{ CondType: "Z303", Descripcion: "Precio Final", Valor: 58.77, Moneda: "PEN", UmPrecio: 1, Unidad: "UN", Base: 1, Total: 58.77, TipoCalculo: "G", Paso: "280" }
];

test("filasDeCondiciones ordena por paso y oculta las de valor cero e inactivas", () => {
	const filas = filasDeCondiciones(pedido);
	assert.deepEqual(filas.map((f) => f.tipo), ["Z300", "Z320", "Z303", "ZIGV"]);
});

test("filasDeCondiciones con verTodas muestra tambien las de valor cero e inactivas, en orden", () => {
	assert.deepEqual(filasDeCondiciones(pedido, true).map((f) => f.tipo), ["Z300", "Z309", "Z320", "Z303", "ZIGV", "Z339"]);
});

test("el porcentaje toma la escala que cuadra con el importe de la linea: dividido por 10 (antes) o directo (hoy)", () => {
	// Escala anterior (18 % como 1.8): pedido 3300008237.
	assert.equal(importeVisible({ CondType: "ZIGV", Valor: 1.8, TipoCalculo: "A", Base: 58.77, Total: 8.96 }), "18.00 %");
	assert.equal(importeVisible({ CondType: "Z320", Valor: -1, TipoCalculo: "A", Base: 65.3, Total: -6.53 }), "-10.00 %");
	// Escala directa, PrecioCond del 30/10/2026 (GLD-100/90X17-001, 1203/10, cliente de grupo 26): antes se mostraba -100 % y 180 %.
	assert.equal(importeVisible({ CondType: "Z320", Valor: -10, TipoCalculo: "A", Base: 88, Total: -8.8 }), "-10.00 %");
	assert.equal(importeVisible({ CondType: "ZIGV", Valor: 18, TipoCalculo: "A", Base: 79.2, Total: 12.08 }), "18.00 %");
	assert.equal(importeVisible({ CondType: "Z323", Valor: -2.5, TipoCalculo: "A", Base: 35.6, Total: -0.89 }), "-2.50 %");
	assert.equal(importeVisible({ CondType: "Z300", Valor: 65.3, TipoCalculo: "C" }), "65.30");
});

test("sin base ni importe (condicion de la oferta guardada) el porcentaje se muestra tal cual", () => {
	assert.equal(importeVisible({ CondType: "ZIGV", Valor: 18, TipoCalculo: "A" }), "18.00 %");
	assert.equal(importeVisible({ CondType: "Z320", Valor: -10, TipoCalculo: "A", Total: -6.53 }), "-10.00 %");
});

test("cada fila trae descripcion, valor de la linea, unidades y moneda del documento", () => {
	const lista = filasDeCondiciones(pedido);
	const z300 = lista[0];
	assert.equal(z300.descripcion, "Precio Lista");
	assert.equal(z300.valor, "65.30");
	assert.equal(z300.umPrecio, "1");
	assert.equal(z300.umCondicion, "UN");
	assert.equal(z300.monedaDoc, "PEN");
	const z320 = lista[1];
	assert.equal(z320.valor, "-6.53");
	assert.equal(z320.valorNum, -6.53);
	assert.equal(z320.moneda, "");
});

test("sin descripcion (servicio anterior) se muestra el codigo y la marca manual se detecta", () => {
	const [fila] = filasDeCondiciones([{ CondType: "Z320", Valor: -1, TipoCalculo: "A", Total: -6.53, Manual: "X" }]);
	assert.equal(fila.descripcion, "Z320");
	assert.equal(fila.manual, true);
});

test("consultarCondiciones lee PrecioCond con oficina y forma de pago si el servicio los publica", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: pedido as unknown as Record<string, unknown>[], camposPublicados: ["PrecioCond/Vkbur", "PrecioCond/Zterm"] });
	const c = { kunnr: "0100005387", vkorg: "1203", vtweg: "10", spart: "50", auart: "Z300", matnr: "SFX-18X300-C051", werks: "1201", cantidad: 1, waers: "PEN" as const, vkbur: "2001", zterm: "C000" };
	const filas = await consultarCondiciones(modelo as unknown as Parameters<typeof consultarCondiciones>[0], c);
	assert.equal(filas.length, pedido.length);
	assert.match(llamadas[0], /^read \/PrecioCond .*Vkbur eq '2001' and Zterm eq 'C000'$/);
});

test("la fila trae la presentacion de Elementos de precio: importe con su unidad, UM de precio, valor con moneda y subtotal sin codigo", () => {
	const lista = filasDeCondiciones(pedido, true);
	const z300 = lista.find((f) => f.tipo === "Z300");
	assert.ok(z300);
	assert.equal(z300.importeNum, "65.30");
	assert.equal(z300.importeUnidad, "PEN");
	assert.equal(z300.umPrecioTxt, "1 UN");
	assert.equal(z300.valorMoneda, "PEN");
	assert.equal(z300.subtotal, false);
	const igv = lista.find((f) => f.tipo === "ZIGV");
	assert.equal(igv?.importeNum, "18.00");
	assert.equal(igv?.importeUnidad, "%");
	assert.equal(igv?.valorMoneda, "");
	assert.equal(lista.find((f) => f.tipo === "Z303")?.subtotal, true);
});

test("la marca de estadistica y la modificacion manual se leen del servicio", () => {
	const [f] = filasDeCondiciones([{ CondType: "DCD1", Valor: 0, Total: 0, Estadistica: "X", Manual: "X" }], true);
	assert.equal(f.estadistica, true);
	assert.equal(f.manual, true);
});

test("filaDeCondicion acepta los indicadores como booleano o como texto (el servicio de la oferta guardada los entrega distinto)", () => {
	const f = filaDeCondicion({ CondType: "Z320", Valor: 1, TipoCalculo: "A", Total: -10, Estadistica: true as unknown as string, Manual: "X", Inactiva: false as unknown as string });
	assert.equal(f.estadistica, true);
	assert.equal(f.manual, true);
	assert.equal(f.relevante, true);
	const g = filaDeCondicion({ CondType: "ZIGV", Valor: 0, Total: 0, Estadistica: false as unknown as string, Manual: "", Inactiva: true as unknown as string });
	assert.equal(g.estadistica, false);
	assert.equal(g.manual, false);
	assert.equal(g.relevante, false);
});

test("el beneficio de la promocion sale con el porcentaje real (PU27: Z320 del 10 % se mostraba -100 %)", () => {
	const filas = filasDeCondiciones([
		{ CondType: "Z300", Descripcion: "Precio Lista", Valor: 88, Moneda: "PEN", Base: 1, Total: 88, TipoCalculo: "C", Paso: "010" },
		{ CondType: "Z320", Descripcion: "Dsc.Pos %", Valor: -10, Base: 88, Total: -8.8, TipoCalculo: "A", Paso: "040" }
	]);
	assert.deepEqual(descuentosAplicados(filas), [{ nombre: "Dsc.Pos % (Z320)", beneficio: "-10.00 %", monto: "-8.80" }]);
});
