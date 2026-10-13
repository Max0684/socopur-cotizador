import { test } from "node:test";
import assert from "node:assert/strict";
import { aFilaTransportista, aSede, buscarTransportistasMock, filtroTransportistas, textoSede } from "../webapp/model/TransportistasService.ts";

test("filtroTransportistas: solo digitos busca por RUC o DNI; si no, por nombre en mayusculas; vacio no filtra", () => {
	assert.equal(filtroTransportistas("  "), undefined);
	assert.equal(filtroTransportistas("20512"), "startswith(Ruc,'20512') or startswith(Dni,'20512')");
	assert.equal(filtroTransportistas("shalom"), "contains(NombreMayus,'SHALOM')");
	assert.equal(filtroTransportistas("o'brien"), "contains(NombreMayus,'O''BRIEN')");
});

test("aFilaTransportista: documento RUC o DNI y rol SP solo si SAP lo dice", () => {
	assert.deepEqual(aFilaTransportista({ Id: "1", Nombre: "SHALOM", Ruc: "20512528458", RolPedido: "ZT", UsosZT: "413" }), { id: "1", nombre: "SHALOM", documento: "20512528458", rol: "ZT", usos: 413, kunnr: "", lifnr: "" });
	assert.equal(aFilaTransportista({ Id: "2", Nombre: "PERSONA", Dni: "42838535" }).documento, "42838535");
	assert.equal(aFilaTransportista({ Id: "3", RolPedido: "SP" }).rol, "SP");
	assert.deepEqual(
		[aFilaTransportista({ Id: "4", Kunnr: "0100000001", Lifnr: "0000200001" }).kunnr, aFilaTransportista({ Id: "4", Kunnr: "0100000001", Lifnr: "0000200001" }).lifnr],
		["0100000001", "0000200001"]
	);
});

test("textoSede y aSede: direccion completa con ubigeo, omite lo que falte", () => {
	assert.equal(textoSede({ Id: "1", Addrnumber: "10", Direccion: "Jr Luna Pizarro 701", Distrito: "La Victoria", Ubigeo: "150115" }), "Jr Luna Pizarro 701, La Victoria (150115)");
	assert.deepEqual(aSede({ Id: "1", Addrnumber: "10", Direccion: "Av. X" }), { key: "10", text: "Av. X", direccion: "Av. X" });
});

test("buscarTransportistasMock: filtra por texto y pagina", () => {
	const lista = Array.from({ length: 25 }, (_, i) => ({ key: `T${i}`, text: i % 2 ? `Cargas ${i}` : `Transportes ${i}`, sedes: [] }));
	const p2 = buscarTransportistasMock(lista, "", 2, 10);
	assert.equal(p2.total, 25);
	assert.equal(p2.filas.length, 10);
	assert.equal(p2.filas[0].id, "T10");
	const f = buscarTransportistasMock(lista, "cargas", 1, 10);
	assert.equal(f.total, 12);
});
