import { test } from "node:test";
import assert from "node:assert/strict";
import {
	almacenDeCentro,
	areasOrgCanal,
	canalDe,
	centroValidoParaArea,
	faltaAreaDeVentas,
	gruposParaGuardar,
	modalidadPorDefecto,
	oficinaDe,
	sectorDeCabecera,
	totalesDeOferta,
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

test("centroValidoParaArea: el 1103 no es valido en 1103/10 pero si en 1103/12 (TVKWZ)", () => {
	const mapa = { "1103/10": ["1101", "1201"], "1103/12": ["1101", "1103"] };
	assert.equal(centroValidoParaArea(mapa, "1103", "10", "1103"), false);
	assert.equal(centroValidoParaArea(mapa, "1103", "12", "1103"), true);
	assert.equal(centroValidoParaArea(mapa, "1103", "10", "1101"), true);
});

test("centroValidoParaArea: sin lista para el area no bloquea (p. ej. 1103/99)", () => {
	assert.equal(centroValidoParaArea({ "1103/10": ["1101"] }, "1103", "99", "9999"), true);
});

test("almacenDeCentro: 0001 por defecto y 0008 en el aduanero 1007", () => {
	assert.equal(almacenDeCentro("1101", { "1007": "0008" }), "0001");
	assert.equal(almacenDeCentro("1007", { "1007": "0008" }), "0008");
});

test("modalidadPorDefecto propone la modalidad del canal 10 y 11", () => {
	assert.equal(modalidadPorDefecto("repuestos", "10"), "rep_mayorista");
	assert.equal(modalidadPorDefecto("repuestos", "11"), "rep_mostrador");
	assert.equal(modalidadPorDefecto("vehiculos", "10"), "veh_mayorista");
	assert.equal(modalidadPorDefecto("repuestos", "14"), undefined);
});

test("gruposParaGuardar acepta una funcion de almacen por centro", () => {
	const grupo = { canal: "10 Mayorista", lineas: [{ orgVentas: "1103", sector: "50", material: "M", cantidad: 1, precio: 1 }] };
	const [g] = gruposParaGuardar([grupo], { oficina: "1101", centro: "1007" }, (c) => almacenDeCentro(c, { "1007": "0008" }));
	assert.equal(g.lineas[0].almacen, "0008");
	assert.equal(g.lineas[0].centro, "1007");
});

test("totalesDeOferta: con IGV de SAP el total es la suma de las lineas mas el impuesto (oferta de la org 1203, 18 %)", () => {
	const t = totalesDeOferta([{ total: 306.18, impuesto: 55.11 }]);
	assert.equal(t.igvConocido, true);
	assert.equal(t.igv, 55.11);
	assert.equal(t.total, 361.29);
});

test("totalesDeOferta: Pucallpa (exonerada, impuesto 0.00) -> IGV conocido en cero y total = neto", () => {
	const t = totalesDeOferta([
		{ total: 1750, impuesto: 0 },
		{ total: 0, impuesto: 0 }
	]);
	assert.deepEqual([t.igvConocido, t.igv, t.total], [true, 0, 1750]);
});

test("totalesDeOferta: antes de guardar el IGV es desconocido (no se inventa un 0.00)", () => {
	const t = totalesDeOferta([{ total: 1751 }]);
	assert.equal(t.igvConocido, false);
	assert.equal(t.igv, 0);
	assert.equal(t.total, 1751);
});

test("totalesDeOferta: si una sola linea no trae impuesto, el IGV sigue desconocido", () => {
	assert.equal(totalesDeOferta([{ total: 10, impuesto: 1.8 }, { total: 20 }]).igvConocido, false);
});

test("totalesDeOferta: sin lineas todo es cero y el IGV no esta conocido", () => {
	const t = totalesDeOferta([]);
	assert.deepEqual([t.subtotal, t.total, t.igvConocido], [0, 0, false]);
});

test("totalesDeOferta separa el ISC incluido sin cambiar el total", () => {
	const t = totalesDeOferta([{ total: 1100, iscPct: 10 }]);
	assert.equal(t.isc, 100);
	assert.equal(t.neto, 1000);
	assert.equal(t.total, 1100);
	assert.equal(t.hayIsc, true);
});

test("sectorDeCabecera: el canal 15 (Administrativo) solo admite sector 90", () => {
	assert.equal(sectorDeCabecera("15", "50"), "90");
	assert.equal(sectorDeCabecera("12", "54"), "54");
});

test("gruposParaGuardar: un vehiculo de SAP sale del centro y almacen donde esta, con su variante", () => {
	const g = gruposParaGuardar(
		[{ canal: "11 Retail", claseOferta: "Z100", clasePedido: "Z311", modalidad: "veh_retail", lineas: [{ orgVentas: "1101", sector: "16", material: "CAR200B", cantidad: 1, precio: 9533.39, variante: "CAR200BCBU2025AZU", centroVeh: "1008", almacenVeh: "0008" }] }],
		{ oficina: "1101", centro: "1001" },
		"0001"
	);
	assert.deepEqual(g[0].lineas[0], { material: "CAR200B", cantidad: 1, um: "UN", centro: "1008", almacen: "0008", precio: 9533.39, variante: "CAR200BCBU2025AZU" });
});

test("gruposParaGuardar: una linea de repuesto no lleva variante y usa el centro del perfil", () => {
	const g = gruposParaGuardar([grupoMayorista()], perfil, "0001");
	assert.equal("variante" in g[0].lineas[0], false);
	assert.equal(g[0].lineas[0].centro, "1101");
});
