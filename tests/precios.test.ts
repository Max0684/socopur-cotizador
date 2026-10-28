import { test } from "node:test";
import assert from "node:assert/strict";
import { consultarEscalas, consultarPrecio, filtroEscala, filtroPrecio, impuestosDeCondiciones, siguienteTramo, tramosDeEscalas, tramoVigente, type ConsultaPrecio, type EscalaSap } from "../webapp/model/PreciosService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const consulta: ConsultaPrecio = {
	kunnr: "0100024840",
	vkorg: "1103",
	vtweg: "10",
	spart: "50",
	auart: "Z300",
	matnr: "SFX428H-150-MTK",
	werks: "1101",
	cantidad: 100,
	waers: "PEN"
};

const como = (m: unknown) => m as Parameters<typeof consultarPrecio>[0];

test("filtroPrecio arma el $filter con eq en todos los campos y la cantidad numerica", () => {
	assert.equal(
		filtroPrecio(consulta),
		"Kunnr eq '0100024840' and Vkorg eq '1103' and Vtweg eq '10' and Spart eq '50' and Auart eq 'Z300' and Matnr eq 'SFX428H-150-MTK' and Werks eq '1101' and Cantidad eq 100 and Waers eq 'PEN'"
	);
});

test("filtroPrecio duplica las comillas y agrega la fecha si viene", () => {
	const f = filtroPrecio({ ...consulta, matnr: "A'B", fecha: "2026-10-03" });
	assert.match(f, /Matnr eq 'A''B'/);
	assert.match(f, /Fecha eq 2026-10-03$/);
});

test("consultarPrecio devuelve el precio de SAP (PEN 17.50, verificado por OData)", async () => {
	const { modelo, llamadas } = crearModeloFalso({
		precios: [{ Moneda: "PEN", PrecioLista: "1750.00", PrecioUnitario: "17.50", Neto: "1750.00", Impuestos: "0.00", Respuesta: 0, Mensaje: "" }]
	});
	const p = await consultarPrecio(como(modelo), consulta);
	assert.deepEqual(p, { moneda: "PEN", precioLista: 1750, precioUnitario: 17.5, neto: 1750, impuestos: 0 });
	assert.match(llamadas[0], /^read \/Precio Kunnr eq '0100024840'/);
});

test("consultarPrecio en USD usa el precio convertido por SAP (5.14)", async () => {
	const { modelo } = crearModeloFalso({
		precios: [{ Moneda: "USD", PrecioLista: 514, PrecioUnitario: 5.14, Neto: 514, Impuestos: 0, Respuesta: 0, Mensaje: "" }]
	});
	const p = await consultarPrecio(como(modelo), { ...consulta, waers: "USD" });
	assert.equal(p.precioUnitario, 5.14);
	assert.equal(p.moneda, "USD");
});

test("consultarPrecio lanza el mensaje de SAP si no hay precio (no inventa uno)", async () => {
	const { modelo } = crearModeloFalso({ precios: [{ Respuesta: 1, Mensaje: "Sin precio para X" }] });
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), { message: "Sin precio para X" });
});

test("consultarPrecio lanza error si el servicio no devuelve filas", async () => {
	const { modelo } = crearModeloFalso({ precios: [] });
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), { message: "SAP no devolvio precio" });
});

test("filtroPrecio agrega Varcond solo si es un vehiculo", () => {
	const base = { kunnr: "1", vkorg: "1101", vtweg: "10", spart: "10", auart: "Z100", matnr: "DU200Z0", werks: "1101", cantidad: 1, waers: "PEN" as const };
	assert.ok(!filtroPrecio(base).includes("Varcond"));
	assert.ok(filtroPrecio({ ...base, varcond: "DU200Z0CBU2025ANA" }).endsWith("and Varcond eq 'DU200Z0CBU2025ANA'"));
});

test("consultarPrecio: un precio unitario de 0 es 'sin precio vigente' y lanza error (caso 1203/11 con el Z300 borrado)", async () => {
	const { modelo } = crearModeloFalso({
		precios: [{ Moneda: "PEN", PrecioLista: "0.00", PrecioUnitario: "0.00", Neto: "0.00", Impuestos: "0.00", Respuesta: 0, Mensaje: "" }]
	});
	await assert.rejects(() => consultarPrecio(como(modelo), consulta), /precio vigente/);
});

test("impuestosDeCondiciones: suma el Total de ZIGV y de ZISC por separado e ignora las demas condiciones (caso 65.30 con IGV 18 %)", () => {
	const r = impuestosDeCondiciones([
		{ CondType: "Z303", Total: "65.30" },
		{ CondType: "Z302", Total: "65.30" },
		{ CondType: "ZIGV", Total: "11.75" },
		{ CondType: "ZISC", Total: "0.00" }
	]);
	assert.deepEqual(r, { igv: 11.75, isc: 0 });
});

test("impuestosDeCondiciones: sin condiciones de impuesto (cliente exonerado o sin base) da cero y varias filas del mismo tipo se suman", () => {
	assert.deepEqual(impuestosDeCondiciones([{ CondType: "Z303", Total: "65.30" }]), { igv: 0, isc: 0 });
	assert.deepEqual(impuestosDeCondiciones([{ CondType: "ZIGV", Total: "1.10" }, { CondType: "ZIGV", Total: 2.2 }, { CondType: "ZISC", Total: "5" }]), { igv: 3.3, isc: 5 });
	assert.deepEqual(impuestosDeCondiciones([]), { igv: 0, isc: 0 });
});

test("filtroPrecio agrega oficina y forma de pago cuando vienen", () => {
	const f = filtroPrecio({ ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(f, / and Vkbur eq '2001' and Zterm eq 'C000'$/);
	assert.doesNotMatch(filtroPrecio(consulta), /Vkbur|Zterm/);
});

const fila = [{ Moneda: "PEN", PrecioLista: "65.30", PrecioUnitario: "58.77", Neto: "49.81", Impuestos: "8.96", Respuesta: 0, Mensaje: "" }];

test("consultarPrecio manda oficina y forma de pago solo si el servicio ya publica esos campos", async () => {
	const publicado = crearModeloFalso({ precios: fila, camposPublicados: ["Precio/Vkbur", "Precio/Zterm"] });
	await consultarPrecio(como(publicado.modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(publicado.llamadas[0], /Vkbur eq '2001' and Zterm eq 'C000'/);

	const antiguo = crearModeloFalso({ precios: fila });
	await consultarPrecio(como(antiguo.modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.doesNotMatch(antiguo.llamadas[0], /Vkbur|Zterm/);
});

test("consultarPrecio manda solo el campo que el servicio publica", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: fila, camposPublicados: ["Precio/Vkbur"] });
	await consultarPrecio(como(modelo), { ...consulta, vkbur: "2001", zterm: "C000" });
	assert.match(llamadas[0], /Vkbur eq '2001'/);
	assert.doesNotMatch(llamadas[0], /Zterm/);
});


// Filas reales de la entidad Escala en el 130 (28/10/2026): MOT112999, JYAS MOTORS 1103/10/55, contado (C000), en PEN.
const filaEscala = (CondType: string, Descripcion: string, Desde: number, Valor: number, Moneda: string, PrecioDesde: number) => ({ CondType, Descripcion, Desde, Unidad: "UN", Valor, Moneda, PrecioDesde, MonedaPrecio: "PEN" });
const filasMot = [
	filaEscala("Z300", "Precio Lista", 1, 10, "USD", 34.06),
	filaEscala("Z323", "Dsc.Pos Contado %", 1, 0, "%", 34.06),
	filaEscala("Z324", "Dsc.Pos Contado Mont", 1, 0, "USD", 34.06),
	filaEscala("Z300", "Precio Lista", 12, 8.7, "USD", 29.63),
	filaEscala("Z300", "Precio Lista", 24, 7.7, "USD", 25.45),
	filaEscala("Z323", "Dsc.Pos Contado %", 24, -3, "%", 25.45),
	filaEscala("Z324", "Dsc.Pos Contado Mont", 24, -0.23, "USD", 25.45)
];
const escalasMot: EscalaSap[] = filasMot.map((f) => ({ condicion: f.CondType, descripcion: f.Descripcion, desde: f.Desde, unidad: f.Unidad, valor: f.Valor, moneda: f.Moneda, precioDesde: f.PrecioDesde, monedaPrecio: f.MonedaPrecio }));

test("filtroEscala es el filtro de Precio sin la cantidad", () => {
	const { cantidad: _c, ...sinCantidad } = consulta;
	assert.equal(filtroEscala(sinCantidad), "Kunnr eq '0100024840' and Vkorg eq '1103' and Vtweg eq '10' and Spart eq '50' and Auart eq 'Z300' and Matnr eq 'SFX428H-150-MTK' and Werks eq '1101' and Waers eq 'PEN'");
});

test("consultarEscalas lee la entidad Escala y convierte las filas", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: filasMot });
	const { cantidad: _c, ...sinCantidad } = consulta;
	const escalas = await consultarEscalas(como(modelo), sinCantidad);
	assert.equal(escalas.length, 7);
	assert.deepEqual(escalas[5], { condicion: "Z323", descripcion: "Dsc.Pos Contado %", desde: 24, unidad: "UN", valor: -3, moneda: "%", precioDesde: 25.45, monedaPrecio: "PEN" });
	assert.match(llamadas[0], /^read \/Escala Kunnr eq '0100024840'/);
});

test("tramosDeEscalas: un tramo por cantidad, sin los descuentos en 0, con el precio que da SAP", () => {
	const tramos = tramosDeEscalas(escalasMot);
	assert.deepEqual(
		tramos.map((t) => [t.desde, t.condiciones.map((c) => c.condicion).join("+"), t.precio]),
		[
			[1, "Z300", 34.06],
			[12, "Z300", 29.63],
			[24, "Z300+Z323+Z324", 25.45]
		]
	);
});

test("tramoVigente y siguienteTramo: con 10 UN vale el de 1 y el siguiente es el de 12; con 30 no hay siguiente", () => {
	const tramos = tramosDeEscalas(escalasMot);
	assert.equal(tramoVigente(tramos, 10)?.desde, 1);
	assert.equal(siguienteTramo(tramos, 10)?.desde, 12);
	assert.equal(tramoVigente(tramos, 12)?.desde, 12);
	assert.equal(siguienteTramo(tramos, 12)?.precio, 25.45);
	assert.equal(siguienteTramo(tramos, 30), undefined);
	assert.equal(tramoVigente([], 5), undefined);
});
