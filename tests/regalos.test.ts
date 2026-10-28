import { test } from "node:test";
import assert from "node:assert/strict";
import { cantidadTxt, claveRegalos, consultarRegalos, filtroRegalo, promoDeFila, regalosQueAplican, type ConsultaRegalo } from "../webapp/model/RegalosService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const consulta: ConsultaRegalo = { kunnr: "0100025848", vkorg: "1103", vtweg: "10", matnr: "SFX428H-150-MTK", spart: "50", vkbur: "1101", cantidad: 200 };

// Filas reales de la entidad Regalo en el 130 (28/10/2026): SFX428H-150-MTK en 1103/10/1101 con 200 UN.
const filas200 = [
	{ Mecanismo: "ZNA0", Promocion: "0000000022", Escala: "0001", Desde: "100.000", PorCada: "100.000", RegaloPorCada: "10.000", Unidad: "UN", MatnrRegalo: "PM-13008-C", DescRegalo: "FILTRO COMB CB125/CG125", UnidadRegalo: "UN", Tipo: "2", Estado: "A", CantidadRegalo: "20.000", Mensaje: "" },
	{ Mecanismo: "ZNA0", Promocion: "0000000022", Escala: "0002", Desde: "640.000", PorCada: "100.000", RegaloPorCada: "1.000", Unidad: "UN", MatnrRegalo: "12N7A-3A-AGM-SFX", DescRegalo: "BATERIA 12N7A-3A AGM", UnidadRegalo: "UN", Tipo: "2", Estado: "N", CantidadRegalo: "0.000", Mensaje: "La cantidad no alcanza el mínimo de esta escala." },
	{ Mecanismo: "ZETA", Promocion: "0000000195", Escala: "0001", Desde: "50.000", PorCada: "50.000", RegaloPorCada: "1.000", Unidad: "UN", MatnrRegalo: "CANDADO-DURO-001", DescRegalo: "CANDADO FRENO C/ALARMA DURO", UnidadRegalo: "UN", Tipo: "2", Estado: "E", CantidadRegalo: "0.000", Mensaje: "No se evalúa: el material tiene una promoción ZNA0 y SAP le da prioridad." }
];

test("filtroRegalo arma el $filter con el area de ventas, la oficina y la cantidad", () => {
	assert.equal(filtroRegalo(consulta), "Kunnr eq '0100025848' and Vkorg eq '1103' and Vtweg eq '10' and Matnr eq 'SFX428H-150-MTK' and Spart eq '50' and Vkbur eq '1101' and Cantidad eq 200");
});

test("filtroRegalo sin cantidad solo lista las promociones y duplica las comillas", () => {
	const f = filtroRegalo({ kunnr: "1", vkorg: "1103", vtweg: "10", matnr: "A'B" });
	assert.equal(f, "Kunnr eq '1' and Vkorg eq '1103' and Vtweg eq '10' and Matnr eq 'A''B'");
});

test("promoDeFila convierte la fila de SAP: numeros, promocion sin ceros y estado", () => {
	const p = promoDeFila(filas200[0]);
	assert.deepEqual(p, {
		mecanismo: "ZNA0",
		promocion: "22",
		escala: "0001",
		desde: 100,
		porCada: 100,
		regaloPorCada: 10,
		unidad: "UN",
		matnrRegalo: "PM-13008-C",
		descRegalo: "FILTRO COMB CB125/CG125",
		unidadRegalo: "UN",
		spartRegalo: "",
		tipo: "2",
		estado: "A",
		cantidadRegalo: 20,
		mensaje: ""
	});
	assert.equal(promoDeFila(filas200[2]).mecanismo, "ZETA");
	assert.equal(promoDeFila({ Estado: "X" }).estado, "");
});

test("promoDeFila lee el sector del material de regalo (lapicero de venta cruzada: sector 90)", () => {
	assert.equal(promoDeFila({ Mecanismo: "ZETA", MatnrRegalo: "MPPA-ARP-HI-00001", SpartRegalo: "90" }).spartRegalo, "90");
});

test("regalosQueAplican: con 200 UN solo el filtro (la bateria no alcanza y el candado Zeta queda excluido)", () => {
	const aplican = regalosQueAplican(filas200.map(promoDeFila));
	assert.deepEqual(
		aplican.map((p) => [p.matnrRegalo, p.cantidadRegalo]),
		[["PM-13008-C", 20]]
	);
});

test("claveRegalos cambia solo si cambia lo que se regala", () => {
	const promos = filas200.map(promoDeFila);
	assert.equal(claveRegalos(promos), "ZNA0:PM-13008-C:20");
	assert.equal(claveRegalos(promos.map((p) => ({ ...p, estado: "N" as const }))), "");
});

test("cantidadTxt quita los decimales que sobran", () => {
	assert.equal(cantidadTxt(20), "20");
	assert.equal(cantidadTxt(2.5), "2.5");
	assert.equal(cantidadTxt(Number("100.000")), "100");
});

test("consultarRegalos lee la entidad Regalo con el filtro y devuelve las promociones", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: filas200 });
	const promos = await consultarRegalos(modelo as unknown as Parameters<typeof consultarRegalos>[0], consulta);
	assert.equal(promos.length, 3);
	assert.match(llamadas[0], /^read \/Regalo Kunnr eq '0100025848'/);
});
