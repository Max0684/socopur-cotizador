import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarMateriales, disponibilidadDeFilas, disponibilidadPorCentro, construirSegmentos, filaDeMaterial, filtroMateriales, filtroStock, materialesDisponibles, stockPorCentro } from "../webapp/model/MaterialesService.ts";

const como = (m: unknown) => m as Parameters<typeof buscarMateriales>[0];

test("filtroMateriales: organizacion y canal siempre; el resto solo si viene informado", () => {
	assert.equal(filtroMateriales({ vkorg: "1103", vtweg: "10" }), "Vkorg eq '1103' and Vtweg eq '10'");
	assert.equal(
		filtroMateriales({ vkorg: "1103", vtweg: "10", linea: "M", clase: "01", familia: "03", codigo: "sfx", descripcion: "cadena" }),
		"Vkorg eq '1103' and Vtweg eq '10' and Segmento1 eq 'M' and Segmento2 eq '01' and Segmento3 eq '03' and contains(Matnr,'SFX') and contains(Maktx,'CADENA')"
	);
});

test("filtroMateriales duplica las comillas", () => {
	assert.match(filtroMateriales({ vkorg: "1103", vtweg: "10", descripcion: "o'brien" }), /contains\(Maktx,'O''BRIEN'\)/);
});

test("filaDeMaterial arma la fila de la tabla; el sector de cabecera sale del servicio o de la regla", () => {
	const m = { Matnr: "SFX428H-150-MTK", Maktx: "CADENA", Meins: "UN", Spart: "50", Segmento1: "P", Marca: "SFX" };
	const regla = (canal: string, sector: string) => (canal === "11" ? "99" : sector);
	assert.equal(filaDeMaterial(m, "1103", "11", regla).sectorOferta, "99");
	assert.equal(filaDeMaterial(m, "1103", "10", regla).sectorOferta, "50");
	// Con regla, la regla manda sobre el SpartCabecera del servicio (que solo esta calculado para 1103).
	assert.equal(filaDeMaterial({ ...m, SpartCabecera: "55" }, "1103", "11", regla).sectorOferta, "99");
	// Sin regla se usa lo que traiga el servicio.
	assert.equal(filaDeMaterial({ ...m, SpartCabecera: "55" }, "1103", "11").sectorOferta, "55");
	assert.equal(filaDeMaterial(m, "1103", "11").sectorOferta, m.Spart);
	const f = filaDeMaterial(m, "1103", "10");
	assert.deepEqual([f.material, f.denominacion, f.marca, f.linea, f.um, f.origen], ["SFX428H-150-MTK", "CADENA", "SFX", "P", "UN", "sap"]);
});

test("materialesDisponibles: true si la entidad Material esta en el metadata, false si no o si falla", async () => {
	const con = { getMetaModel: () => ({ requestObject: async () => ({ $kind: "EntitySet" }) }) };
	const sin = { getMetaModel: () => ({ requestObject: async () => undefined }) };
	const roto = { getMetaModel: () => ({ requestObject: async () => Promise.reject(new Error("x")) }) };
	assert.equal(await materialesDisponibles(como(con)), true);
	assert.equal(await materialesDisponibles(como(sin)), false);
	assert.equal(await materialesDisponibles(como(roto)), false);
});

test("buscarMateriales pide /Material con filtro, orden y paginacion de 50", async () => {
	let ruta = "";
	let params: Record<string, unknown> = {};
	let rango: number[] = [];
	const modelo = {
		bindList(r: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: Record<string, unknown>) {
			ruta = r;
			params = p ?? {};
			return {
				async requestContexts(desde: number, cuantos: number) {
					rango = [desde, cuantos];
					return [{ getObject: () => ({ Matnr: "M1", Maktx: "UNO", Meins: "UN", Spart: "50" }) }];
				}
			};
		}
	};
	const filas = await buscarMateriales(como(modelo), { vkorg: "1103", vtweg: "10", texto: "cadena" }, undefined, 2);
	assert.equal(ruta, "/Material");
	assert.equal(params.$orderby, "Matnr");
	assert.equal(params.$search, "cadena");
	assert.deepEqual(rango, [100, 50]);
	assert.equal(filas[0].material, "M1");
	assert.equal(filas[0].sectorOferta, "50");
});

test("filtroMateriales agrega sector y marca si vienen", () => {
	assert.equal(filtroMateriales({ vkorg: "1103", vtweg: "10", sector: "50", marca: "SFX" }), "Vkorg eq '1103' and Vtweg eq '10' and Spart eq '50' and Marca eq 'SFX'");
});

test("construirSegmentos arma los combos en cascada con codigo y descripcion, ordenados", () => {
	const s = construirSegmentos(
		[{ Segmento1: "P", Descripcion: "REPUESTOS" }, { Segmento1: "G", Descripcion: "GENERAL" }],
		[{ Segmento1: "P", Segmento2: "04", Descripcion: "ARRASTRE" }, { Segmento1: "P", Segmento2: "01", Descripcion: "MOTOR" }],
		[{ Segmento1: "P", Segmento2: "04", Segmento3: "01", Descripcion: "CADENAS" }]
	);
	assert.deepEqual(s.lineas.map((l) => l.key), ["G", "P"]);
	assert.equal(s.lineas[1].text, "P \u00b7 REPUESTOS");
	assert.deepEqual(s.clases.P.map((c) => c.key), ["01", "04"]);
	assert.equal(s.familias["P-04"][0].text, "01 \u00b7 CADENAS");
});

test("filtroStock arma los OR de materiales para un centro", () => {
	assert.equal(filtroStock("1103", "10", "1101", ["A", "B'C"]), "Vkorg eq '1103' and Vtweg eq '10' and Werks eq '1101' and (Matnr eq 'A' or Matnr eq 'B''C')");
});

test("stockPorCentro devuelve el mayor stock por material y no consulta sin materiales", async () => {
	let llamadas = 0;
	const modelo = {
		bindList() {
			llamadas++;
			return {
				async requestContexts() {
					return [
						{ getObject: () => ({ Matnr: "A", StockLibre: 10 }) },
						{ getObject: () => ({ Matnr: "A", StockLibre: "30" }) },
						{ getObject: () => ({ Matnr: "B", StockLibre: 5 }) }
					];
				}
			};
		}
	};
	assert.deepEqual(await stockPorCentro(como(modelo), "1103", "10", "1101", []), {});
	assert.equal(llamadas, 0);
	assert.deepEqual(await stockPorCentro(como(modelo), "1103", "10", "1101", ["A", "B"]), { A: 30, B: 5 });
});

test("disponibilidadDeFilas toma el almacen de mayor stock y omite filas con Respuesta distinta de 0", () => {
	const d = disponibilidadDeFilas([
		{ Matnr: "A", StockLibre: 10, Disponible: 8, Comprometido: 2, Respuesta: 0 },
		{ Matnr: "A", StockLibre: "30", Disponible: "25", Comprometido: "5", Respuesta: 0 },
		{ Matnr: "B", StockLibre: 0, Disponible: 0, Comprometido: 0, Respuesta: 1 }
	]);
	assert.deepEqual(d, { A: { fisico: 30, disponible: 25, comprometido: 5 } });
});

test("disponibilidadPorCentro consulta MaterialAtp y no consulta sin materiales", async () => {
	const rutas: string[] = [];
	const modelo = {
		bindList(ruta: string) {
			rutas.push(ruta);
			return { async requestContexts() { return [{ getObject: () => ({ Matnr: "A", StockLibre: 38228, Disponible: 34594, Comprometido: 3634, Respuesta: 0 }) }]; } };
		}
	};
	assert.deepEqual(await disponibilidadPorCentro(como(modelo), "1103", "10", "1101", []), {});
	assert.deepEqual(await disponibilidadPorCentro(como(modelo), "1103", "10", "1101", ["A"]), { A: { fisico: 38228, disponible: 34594, comprometido: 3634 } });
	assert.deepEqual(rutas, ["/MaterialAtp"]);
});

test("motivoVacio distingue 'sin coincidencias' de 'sin stock en el centro'", async () => {
	const { motivoVacio } = await import("../webapp/model/MaterialesService.ts");
	assert.equal(motivoVacio(0, 0, true), "sinCoincidencias");
	assert.equal(motivoVacio(0, 0, false), "sinCoincidencias");
	assert.equal(motivoVacio(12, 0, true), "sinStock");
	assert.equal(motivoVacio(12, 0, false), "");
	assert.equal(motivoVacio(12, 3, true), "");
});

/** Modelo OData falso: 120 materiales M001..M120 de la linea O; solo M101..M110 tienen stock en el centro; el ATP falla para M105. */
function modeloFalso(opciones: { atpFalla?: boolean } = {}): Parameters<typeof import("../webapp/model/MaterialesService.ts").buscarRepuestosConStock>[0] {
	const todos = Array.from({ length: 120 }, (_, i) => `M${String(i + 1).padStart(3, "0")}`);
	const conStock = new Set(Array.from({ length: 10 }, (_, i) => `M${String(101 + i).padStart(3, "0")}`));
	const ctx = (o: unknown) => ({ getObject: () => o });
	return {
		bindList: (ruta: string, _a: unknown, _b: unknown, _c: unknown, p: { $filter: string }) => ({
			requestContexts: async (desde: number, n: number) => {
				if (ruta === "/Material") {
					return todos.slice(desde, desde + n).map((m) => ctx({ Matnr: m, Maktx: `MATERIAL ${m}`, Meins: "UN", Spart: "50" }));
				}
				const pedidos = [...p.$filter.matchAll(/Matnr eq '([^']+)'/g)].map((x) => x[1]);
				if (ruta === "/MaterialCentro") {
					return pedidos.filter((m) => conStock.has(m)).map((m) => ctx({ Matnr: m, StockLibre: "100.000" }));
				}
				if (opciones.atpFalla) {
					throw new Error("ATP caido");
				}
				return pedidos.filter((m) => conStock.has(m)).map((m) => ctx({ Matnr: m, StockLibre: "100.000", Disponible: m === "M105" ? "0" : "90.000", Comprometido: "10.000", Respuesta: m === "M105" ? 1 : 0 }));
			}
		})
	} as never;
}

test("buscarRepuestosConStock con stock: recorre paginas hasta hallar los materiales con stock (no solo los 50 primeros)", async () => {
	const { buscarRepuestosConStock } = await import("../webapp/model/MaterialesService.ts");
	const r = await buscarRepuestosConStock(modeloFalso(), { vkorg: "1103", vtweg: "11", linea: "O" }, "1101", true);
	assert.deepEqual(r.filas.map((f) => f.material), Array.from({ length: 10 }, (_, i) => `M${String(101 + i).padStart(3, "0")}`));
	assert.equal(r.coinciden, 120);
	assert.equal(r.parcial, false);
});

test("buscarRepuestosConStock: un material con stock no se pierde si el ATP falla (usa el stock libre)", async () => {
	const { buscarRepuestosConStock } = await import("../webapp/model/MaterialesService.ts");
	const r = await buscarRepuestosConStock(modeloFalso(), { vkorg: "1103", vtweg: "11", linea: "O" }, "1101", true);
	const m105 = r.filas.find((f) => f.material === "M105");
	assert.ok(m105, "M105 debe aparecer aunque su ATP sea 0 o falle");
	const sinAtp = await buscarRepuestosConStock(modeloFalso({ atpFalla: true }), { vkorg: "1103", vtweg: "11", linea: "O" }, "1101", true);
	assert.equal(sinAtp.filas.length, 10);
	assert.equal(sinAtp.filas[0].disponible, 100);
	assert.equal(sinAtp.filas[0].comprometido, "\u2014");
});

test("buscarRepuestosConStock sin filtro de stock: solo la primera pagina, con su stock", async () => {
	const { buscarRepuestosConStock } = await import("../webapp/model/MaterialesService.ts");
	const r = await buscarRepuestosConStock(modeloFalso(), { vkorg: "1103", vtweg: "11", linea: "O" }, "1101", false);
	assert.equal(r.filas.length, 50);
	assert.equal(r.filas[0].total, 0);
});

test("filtroMateriales: la descripcion busca cada palabra por separado, en cualquier orden y en mayusculas", async () => {
	const { filtroMateriales } = await import("../webapp/model/MaterialesService.ts");
	const f = filtroMateriales({ vkorg: "1103", vtweg: "11", descripcion: "  rodaje   6202 " });
	assert.ok(f.includes("contains(Maktx,'RODAJE')"));
	assert.ok(f.includes("contains(Maktx,'6202')"));
	assert.ok(!f.includes("RODAJE 6202"));
	assert.ok(f.startsWith("Vkorg eq '1103' and Vtweg eq '11'"));
	assert.ok(!filtroMateriales({ vkorg: "1103", vtweg: "11", descripcion: "   " }).includes("Maktx"));
});

test("sector de cabecera con la regla real en Promogesa y Selva: 1203/11/50 y 1303/11/50 salen con 99 aunque el servicio devuelva 50", async () => {
	const { sectorDeCabecera } = await import("../webapp/model/Reglas.ts");
	const m = { Matnr: "SFX-18X300-C051", Maktx: "LLANTA", Meins: "UN", Spart: "50", SpartCabecera: "50" };
	for (const org of ["1103", "1203", "1303"]) {
		assert.equal(filaDeMaterial(m, org, "11", sectorDeCabecera).sectorOferta, "99", `${org}/11`);
		assert.equal(filaDeMaterial(m, org, "14", sectorDeCabecera).sectorOferta, "99", `${org}/14`);
		assert.equal(filaDeMaterial(m, org, "10", sectorDeCabecera).sectorOferta, "50", `${org}/10`);
		assert.equal(filaDeMaterial({ ...m, Spart: "55" }, org, "12", sectorDeCabecera).sectorOferta, "55", `${org}/12`);
	}
	// Vehiculos y taller no cambian: el sector del material.
	assert.equal(filaDeMaterial({ ...m, Spart: "16" }, "1101", "11", sectorDeCabecera).sectorOferta, "16");
});

test("disponibilidadPorAlmacenDeFilas: por almacen, solo el material pedido y sin las filas que SAP no pudo calcular (caso 2001: 0001 con 150 y 0004 con 1 fisico y 0 disponible)", async () => {
	const { disponibilidadPorAlmacenDeFilas } = await import("../webapp/model/MaterialesService.ts");
	const r = disponibilidadPorAlmacenDeFilas(
		[
			{ Matnr: "SFX-18X300-C051", Lgort: "0004", StockLibre: "1.000", Disponible: "0.000", Respuesta: 0 },
			{ Matnr: "SFX-18X300-C051", Lgort: "0001", StockLibre: "150.000", Disponible: "149.000", Respuesta: 0 },
			{ Matnr: "SFX-18X300-C051", Lgort: "0005", StockLibre: "0", Disponible: "0", Respuesta: 1 },
			{ Matnr: "OTRO", Lgort: "0001", StockLibre: "9", Disponible: "9", Respuesta: 0 }
		],
		"SFX-18X300-C051"
	);
	assert.deepEqual(r, [
		{ lgort: "0001", libre: 150, disponible: 149 },
		{ lgort: "0004", libre: 1, disponible: 0 }
	]);
});

test("disponibilidadDeFilas con almacen: solo cuenta el del perfil (0004 con 1 fisico y 0 disponible aunque el 0001 tenga 150)", () => {
	const filas = [
		{ Matnr: "M", Lgort: "0001", StockLibre: "150.000", Disponible: "149.000", Comprometido: "1.000", Respuesta: 0 },
		{ Matnr: "M", Lgort: "0004", StockLibre: "1.000", Disponible: "0.000", Comprometido: "1.000", Respuesta: 0 }
	];
	assert.equal(disponibilidadDeFilas(filas, "0004").M.disponible, 0);
	assert.equal(disponibilidadDeFilas(filas, "0001").M.disponible, 149);
	// Sin almacen se toma el de mayor stock, como antes.
	assert.equal(disponibilidadDeFilas(filas).M.disponible, 149);
	// Un almacen sin fila: el material no aparece (sin stock en ese almacen).
	assert.equal(disponibilidadDeFilas(filas, "0009").M, undefined);
});
