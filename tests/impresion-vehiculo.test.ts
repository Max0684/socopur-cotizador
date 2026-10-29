import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaDdMmAaaa, htmlVehiculo, montoTexto, simboloMoneda, type DatosVehiculo } from "../webapp/model/ImpresionVehiculo.ts";
import { leerImpresion } from "../webapp/model/ImpresionService.ts";

const datos = (extra: Partial<DatosVehiculo> = {}): DatosVehiculo => ({
	empresa: "SOCOPUR S.A.C",
	dirFiscal: "AV. CENTENARIO NRO. 721",
	dirEmision: "Jr. Pedro Rodriguez Paiva 130",
	telefono: "5122860",
	impresoFecha: "28.10.2026",
	impresoHora: "20:35:09",
	numero: "95004071",
	fecha: "2026-10-28",
	validoHasta: "2026-11-04",
	cliente: "JYAS MOTORS E.I.R.L.",
	documento: "20393772841",
	correoCliente: "cliente@ejemplo.pe",
	celularCliente: "961021613",
	dirFactura: "JR. MAYA DE BRITTO NRO. 528",
	dirLlegada: "JR. MAYA DE BRITTO NRO. 528",
	vendedor: "VENDEDORA DE PRUEBA",
	correoVendedor: "vendedora@socopur.pe",
	celularVendedor: "",
	tienda: "1101 - PCP - CENTENARIO",
	condicionPago: "Contado",
	moneda: "PEN",
	transportista: "",
	observacion: "",
	valorVenta: 12044.86,
	isc: 1204.48,
	igv: 0,
	precioVenta: 13249.34,
	lineas: [
		{
			numero: 1,
			codigo: "DU200Z0",
			descripcion: "200 DUKE ANARANJADO 2025",
			marca: "KTM",
			unidad: "UN",
			cantidad: 1,
			ficha: [
				{ etiqueta: "PESO BRUTO (KG)", valor: "310" },
				{ etiqueta: "CAPACIDAD DE MOTOR (CC)", valor: "199.5" },
				{ etiqueta: "POTENCIA", valor: "19 KW/10000 RPM" }
			]
		}
	],
	cuentas: [{ banco: "BBVA", soles: "0011-0306-01-00001121", dolares: "0011-0306-01-00015971" }],
	...extra
});
const t = new Proxy({}, { get: (_o, clave) => `[${String(clave)}]` }) as Record<string, string>;

test("fechas, montos y simbolo de moneda como en el formato de Socopur", () => {
	assert.equal(fechaDdMmAaaa("2026-11-04"), "04/11/2026");
	assert.equal(fechaDdMmAaaa(""), "");
	assert.equal(montoTexto(13249.34), "13,249.34");
	assert.equal(simboloMoneda("PEN"), "S/");
	assert.equal(simboloMoneda("USD"), "US$");
});

test("htmlVehiculo lleva cabecera, cliente, la linea con su ficha tecnica, los totales y las cuentas", () => {
	const html = htmlVehiculo(datos(), t, "https://app/img/logo-scp.png");
	for (const texto of ["SOCOPUR S.A.C", "95004071", "28/10/2026", "04/11/2026", "JYAS MOTORS E.I.R.L.", "1101 - PCP - CENTENARIO", "200 DUKE ANARANJADO 2025", "KTM", "PESO BRUTO (KG)", "199.5", "19 KW/10000 RPM", "12,044.86", "1,204.48", "S/ 13,249.34", "0011-0306-01-00001121", "https://app/img/logo-scp.png"]) {
		assert.ok(html.includes(texto), `falta ${texto}`);
	}
});

test("htmlVehiculo escapa los datos y omite las cuentas si la oficina no tiene", () => {
	const html = htmlVehiculo(datos({ cliente: "A & B <S.A.C>", cuentas: [] }), t, "logo.png");
	assert.ok(html.includes("A &amp; B &lt;S.A.C&gt;"));
	assert.equal(html.includes("[cuentas]"), false);
});

test("leerImpresion: V trae los datos del formato; R va al PDF de SAP; un mensaje de SAP es error", async () => {
	const modelo = (fila: Record<string, unknown>) =>
		({ bindList: () => ({ async requestContexts() { return [{ getObject: () => fila }]; } }) }) as unknown as Parameters<typeof leerImpresion>[0];
	const v = await leerImpresion(modelo({ Tipo: "V", Datos: JSON.stringify(datos()) }), "95004071");
	assert.equal(v.tipo, "V");
	assert.equal(v.datos?.lineas[0].codigo, "DU200Z0");
	assert.deepEqual(await leerImpresion(modelo({ Tipo: "R", Datos: "" }), "3100007419"), { tipo: "R" });
	await assert.rejects(() => leerImpresion(modelo({ Mensaje: "No existe la oferta o pedido 1" }), "1"), /No existe/);
});
