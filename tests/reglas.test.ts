import { test } from "node:test";
import assert from "node:assert/strict";
import {
	areasOrgCanal,
	canalDe,
	faltaAreaDeVentas,
	gruposParaGuardar,
	oficinaDe,
	sectorDeCabecera,
	type GrupoCarrito
} from "../webapp/model/Reglas.ts";

test("canalDe toma los dos digitos iniciales", () => {
	assert.equal(canalDe("11 Retail"), "11");
	assert.equal(canalDe("10 Mayorista"), "10");
	assert.equal(canalDe("—"), "");
	assert.equal(canalDe(undefined), "");
});

test("oficinaDe toma los cuatro digitos iniciales", () => {
	assert.equal(oficinaDe("1101 PCP - Centenario"), "1101");
	assert.equal(oficinaDe(""), "");
	assert.equal(oficinaDe(undefined), "");
});

test("sectorDeCabecera: canales 11, 14 y 99 solo existen con sector 99 (TVAKZ, org. 1103)", () => {
	assert.equal(sectorDeCabecera("11", "50"), "99");
	assert.equal(sectorDeCabecera("14", "50"), "99");
	assert.equal(sectorDeCabecera("99", "55"), "99");
});

test("sectorDeCabecera: canales 10 y 12 usan el sector del material", () => {
	assert.equal(sectorDeCabecera("10", "50"), "50");
	assert.equal(sectorDeCabecera("12", "54"), "54");
});

test("areasOrgCanal recorta organizacion/canal/sector a organizacion/canal", () => {
	assert.deepEqual(areasOrgCanal(["1103/10/50", "1101/11", "1103/11/99"]), ["1103/10", "1101/11", "1103/11"]);
});

test("faltaAreaDeVentas: el cliente de SAP con 1103/10/50 SI esta en 1103/10 (caso real JYAS MOTORS)", () => {
	assert.equal(faltaAreaDeVentas(["1103/10/50", "1103/11/99"], "1103", "10"), false);
});

test("faltaAreaDeVentas: detecta un area realmente faltante", () => {
	assert.equal(faltaAreaDeVentas(["1103/11/99"], "1103", "10"), true);
});

test("faltaAreaDeVentas: sin areas conocidas usa las del prototipo (1101/11 y 1103/11)", () => {
	assert.equal(faltaAreaDeVentas(undefined, "1103", "11"), false);
	assert.equal(faltaAreaDeVentas(undefined, "1103", "10"), true);
});

test("faltaAreaDeVentas: sin organizacion o sin canal no decide", () => {
	assert.equal(faltaAreaDeVentas(["1103/10/50"], undefined, "10"), false);
	assert.equal(faltaAreaDeVentas(["1103/10/50"], "1103", ""), false);
});

const perfil = { oficina: "1101 PCP - Centenario", centro: "1101" };

function grupoMayorista(): GrupoCarrito {
	return {
		canal: "10 Mayorista",
		claseOferta: "Z300",
		clasePedido: "Z323",
		modalidad: "rep_mayorista",
		lineas: [
			{ orgVentas: "1103", sector: "50", material: "SFX428H-150-MTK", cantidad: 100, precio: 17.5 },
			{ orgVentas: "1103", sector: "50", material: "REGALO", cantidad: 10, precio: 0, bonificacion: true }
		]
	};
}

test("gruposParaGuardar arma el grupo mayorista como la prueba verificada (1103/10/50, Z300/Z323)", () => {
	const [g] = gruposParaGuardar([grupoMayorista()], perfil, "0001");
	assert.deepEqual(g, {
		vkorg: "1103",
		vtweg: "10",
		spart: "50",
		vkbur: "1101",
		claseOferta: "Z300",
		clasePedido: "Z323",
		modalidad: "rep_mayorista",
		lineas: [{ material: "SFX428H-150-MTK", cantidad: 100, um: "UN", centro: "1101", almacen: "0001", precio: 17.5 }]
	});
});

test("gruposParaGuardar NO envia los regalos: SAP los genera y se duplicarian", () => {
	const [g] = gruposParaGuardar([grupoMayorista()], perfil, "0001");
	assert.equal(g.lineas.some((l) => l.material === "REGALO"), false);
});

test("gruposParaGuardar: mostrador (canal 11) usa sector de cabecera 99", () => {
	const grupo = { ...grupoMayorista(), canal: "11 Retail", clasePedido: "Z311", modalidad: "rep_mostrador" };
	const [g] = gruposParaGuardar([grupo], perfil, "0001");
	assert.equal(g.vtweg, "11");
	assert.equal(g.spart, "99");
	assert.equal(g.clasePedido, "Z311");
});

test("gruposParaGuardar: un grupo por oferta y datos faltantes quedan vacios, no undefined", () => {
	const grupos = gruposParaGuardar([grupoMayorista(), { lineas: [] }], {}, "0001");
	assert.equal(grupos.length, 2);
	assert.deepEqual(grupos[1], {
		vkorg: "",
		vtweg: "",
		spart: "",
		vkbur: "",
		claseOferta: "",
		clasePedido: "",
		modalidad: "",
		lineas: []
	});
});
