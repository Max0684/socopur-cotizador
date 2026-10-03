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
	assert.equal(filaDeMaterial({ ...m, SpartCabecera: "55" }, "1103", "11", regla).sectorOferta, "55");
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
