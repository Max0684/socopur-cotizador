import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarMateriales, filaDeMaterial, filtroMateriales, materialesDisponibles } from "../webapp/model/MaterialesService.ts";

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
