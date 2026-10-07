import { test } from "node:test";
import assert from "node:assert/strict";
import {
	condicionDeArea,
	opcionesAreaCliente,
	textoSolicitudAmpliacion,
	valoresDistintos,
	unirAreas,
	orgVehiculosDe,
	puedeVenderOtroCentro,
	faltaSectorDeVentas,
	almacenDeCentro,
	areasOrgCanal,
	canalDe,
	centroValidoParaArea,
	faltaAreaDeVentas,
	gruposParaGuardar,
	modalidadPorDefecto,
	oficinaDe,
	sectorDeCabecera,
	igvExonerado,
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

test("sectorDeCabecera: 1203 y 1303 siguen la misma regla que 1103 (TVAKZ: canal 11 y 14 solo sector 99); vehiculos no", () => {
	for (const org of ["1103", "1203", "1303"]) {
		assert.equal(sectorDeCabecera("11", "50", org), "99", org);
		assert.equal(sectorDeCabecera("14", "50", org), "99", org);
		assert.equal(sectorDeCabecera("10", "50", org), "50", org);
		assert.equal(sectorDeCabecera("12", "56", org), "56", org);
	}
	assert.equal(sectorDeCabecera("11", "16", "1101"), "16");
	assert.equal(sectorDeCabecera("11", "16", "1201"), "16");
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

test("sectorDeCabecera: fuera de la org 1103 (vehiculos 1101) el sector es el del material en el canal 11; el 15 sigue en 90", () => {
	assert.equal(sectorDeCabecera("11", "16", "1101"), "16");
	assert.equal(sectorDeCabecera("10", "10", "1101"), "10");
	assert.equal(sectorDeCabecera("15", "16", "1101"), "90");
	assert.equal(sectorDeCabecera("11", "50", "1103"), "99");
});

test("gruposParaGuardar: un vehiculo de la org 1101 en canal 11 sale con el sector del material, no con 99", () => {
	const g = gruposParaGuardar(
		[{ canal: "11 Retail", claseOferta: "Z100", clasePedido: "Z311", modalidad: "veh_retail", lineas: [{ orgVentas: "1101", sector: "16", material: "CAR200B", cantidad: 1, precio: 1 }] }],
		{ oficina: "1101", centro: "1101" },
		"0001"
	);
	assert.equal(g[0].spart, "16");
});

test("unirAreas suma las areas leidas a las conocidas sin repetir (un cliente de 1103 tambien vende vehiculos en 1101)", () => {
	const r = unirAreas(["1103/10/50"], [{ Vkorg: "1103", Vtweg: "10", Spart: "50" }, { Vkorg: "1101", Vtweg: "11", Spart: "10" }]);
	assert.deepEqual(r, ["1103/10/50", "1101/11/10"]);
	assert.equal(faltaAreaDeVentas(r, "1101", "11"), false);
});

test("totalesDeOferta: con ISC e IGV de SAP por separado el total es neto + ISC + IGV (vehiculo exonerado de IGV)", () => {
	const t = totalesDeOferta([{ total: 12044.86, impuesto: 1204.48, isc: 1204.48, igvImporte: 0 }]);
	assert.equal(t.desglose, true);
	assert.deepEqual([t.neto, t.isc, t.hayIsc, t.igv, t.igvConocido, t.total], [12044.86, 1204.48, true, 0, true, 13249.34]);
});

test("totalesDeOferta: sin desglose de SAP se mantiene el calculo anterior", () => {
	const t = totalesDeOferta([{ total: 306.18, impuesto: 55.11 }]);
	assert.equal(t.desglose, false);
	assert.equal(t.total, 361.29);
});

test("almacenDeCentro: el almacen del perfil manda solo en el centro del perfil; en otro, la regla practica", () => {
	assert.equal(almacenDeCentro("2001", {}), "0001");
	assert.equal(almacenDeCentro("2001", {}, "0004", "2001"), "0004");
	assert.equal(almacenDeCentro("1101", {}, "0004", "2001"), "0001");
	assert.equal(almacenDeCentro("1007", { "1007": "0008" }, "", "2001"), "0008");
});

test("igvExonerado: solo con base mayor que cero; un documento en cero no es una exoneracion (caso 3300008230: IGV 18 % sobre base 0)", () => {
	assert.equal(igvExonerado({ desglose: true, igv: 0, subtotal: 0 }), false);
	assert.equal(igvExonerado({ desglose: true, igv: 0, subtotal: 100 }), true);
	assert.equal(igvExonerado({ desglose: true, igv: 18, subtotal: 100 }), false);
	assert.equal(igvExonerado({ desglose: false, igv: 0, subtotal: 100 }), false);
});

test("totalesDeOferta con impuesto INCLUIDO en el precio (lista Z300): neto 55.34 + IGV 9.96 = total 65.30, sin sumar el IGV otra vez", () => {
	const t = totalesDeOferta([{ total: 65.3, isc: 0, igvImporte: 9.96, impuestoIncluido: true }]);
	assert.equal(t.total, 65.3);
	assert.equal(t.neto, 55.34);
	assert.equal(t.subtotal, 55.34);
	assert.equal(t.igv, 9.96);
	assert.equal(t.igvConocido, true);
	assert.equal(t.desglose, true);
});

test("totalesDeOferta con impuesto incluido: varias lineas y con ISC; un cliente exonerado (IGV 0) deja neto = total", () => {
	const dos = totalesDeOferta([
		{ total: 65.3, isc: 0, igvImporte: 9.96, impuestoIncluido: true },
		{ total: 118, isc: 0, igvImporte: 18, impuestoIncluido: true }
	]);
	assert.equal(dos.total, 183.3);
	assert.equal(dos.neto, 155.34);
	assert.equal(dos.igv, 27.96);
	const exonerado = totalesDeOferta([{ total: 2, isc: 0, igvImporte: 0, impuestoIncluido: true }]);
	assert.equal(exonerado.neto, 2);
	assert.equal(exonerado.total, 2);
});

test("totalesDeOferta de un documento SAP guardado (sin impuesto incluido) sigue sumando neto + ISC + IGV", () => {
	const t = totalesDeOferta([{ total: 55.34, isc: 0, igvImporte: 9.96 }]);
	assert.equal(t.total, 65.3);
	assert.equal(t.neto, 55.34);
});

test("gruposParaGuardar: el sector de cabecera se recalcula con el sector del material y el canal de la modalidad (canal 10 -> 50, canal 11 -> 99)", () => {
	const linea = { orgVentas: "1203", sector: "99", sectorMaterial: "50", material: "SFX-18X300-C051", cantidad: 1, precio: 65.3 };
	const mayorista = gruposParaGuardar([{ canal: "10 Mayorista", claseOferta: "Z300", clasePedido: "Z323", modalidad: "rep_mayorista", lineas: [linea] }], { oficina: "2001", centro: "2001" }, () => "0004");
	const mostrador = gruposParaGuardar([{ canal: "11 Retail", claseOferta: "Z300", clasePedido: "Z311", modalidad: "rep_mostrador", lineas: [linea] }], { oficina: "2001", centro: "2001" }, () => "0004");
	assert.equal(mayorista[0].spart, "50");
	assert.equal(mostrador[0].spart, "99");
});

test("orgVehiculosDe lleva la org de repuestos a la de vehiculos de la misma sede", () => {
	assert.equal(orgVehiculosDe("1103"), "1101");
	assert.equal(orgVehiculosDe("1203"), "1201");
	assert.equal(orgVehiculosDe("1303"), "1301");
	assert.equal(orgVehiculosDe("1102"), "1101");
	assert.equal(orgVehiculosDe("1202"), "1201");
	assert.equal(orgVehiculosDe("1302"), "1301");
	assert.equal(orgVehiculosDe("9999"), undefined);
});

test("puedeVenderOtroCentro solo para el rol administrador", () => {
	assert.equal(puedeVenderOtroCentro("A"), true);
	assert.equal(puedeVenderOtroCentro("V"), false);
	assert.equal(puedeVenderOtroCentro(undefined), false);
});

test("faltaSectorDeVentas avisa si el cliente esta en la organizacion y el canal pero no en el sector de la cabecera", () => {
	const areas = ["1201/10/10", "1201/11/10"];
	assert.equal(faltaSectorDeVentas(areas, "1201", "10", "16"), true);
	assert.equal(faltaSectorDeVentas(areas, "1201", "10", "10"), false);
	assert.equal(faltaSectorDeVentas(["1201/10/10", "1201/10/16"], "1201", "10", "16"), false);
});

test("faltaSectorDeVentas no decide sin datos y trata el area sin sector como valida para cualquier sector", () => {
	assert.equal(faltaSectorDeVentas(undefined, "1201", "10", "16"), false);
	assert.equal(faltaSectorDeVentas(["1201/10"], "1201", "10", "16"), false);
	assert.equal(faltaSectorDeVentas(["1201/10/10"], "1201", "10", undefined), false);
	// Sin el area org/canal el aviso es el de area completa (faltaAreaDeVentas), no este.
	assert.equal(faltaSectorDeVentas(["1103/11/10"], "1201", "10", "16"), false);
});

test("condicionDeArea toma la fila exacta (organizacion, canal y sector); valoresDistintos detecta monedas mezcladas", () => {
	const fila = (vkorg: string, vtweg: string, spart: string, zterm: string, waers: string) => ({ vkorg, vtweg, spart, zterm, ztermTexto: "", waers, grupo: "", grupoTexto: "" });
	// BM3 IMPORT (leido en el 130): en 1201 los sectores 10 y 11 van en USD y el 15 en PEN con otra condicion de pago.
	const areas = [fila("1201", "10", "10", "C000", "USD"), fila("1201", "10", "15", "C030", "PEN"), fila("1201", "11", "15", "C030", "PEN")];
	assert.equal(condicionDeArea(areas, "1201", "10", "10")?.waers, "USD");
	assert.equal(condicionDeArea(areas, "1201", "10", "15")?.zterm, "C030");
	assert.equal(condicionDeArea(areas, "1201", "10", "99"), undefined);
	assert.equal(condicionDeArea(undefined, "1201", "10", "10"), undefined);
	assert.deepEqual(valoresDistintos([areas[0], areas[1], undefined], "waers"), ["USD", "PEN"]);
	assert.deepEqual(valoresDistintos([areas[1], areas[2]], "waers"), ["PEN"]);
});

test("opcionesAreaCliente junta los sectores con la misma condicion y separa los que cambian de moneda o pago", () => {
	const fila = (vkorg: string, vtweg: string, spart: string, zterm: string, waers: string) => ({ vkorg, vtweg, spart, zterm, ztermTexto: "", waers, grupo: "03", grupoTexto: "" });
	const areas = [fila("1201", "10", "10", "C000", "USD"), fila("1201", "10", "11", "C000", "USD"), fila("1201", "10", "15", "C030", "PEN"), fila("1201", "11", "15", "C030", "PEN"), fila("1103", "11", "50", "C000", "PEN")];
	const r = opcionesAreaCliente(areas, ["1201"]);
	assert.equal(r.length, 3);
	assert.deepEqual(r[0].sectores, ["10", "11"]);
	assert.deepEqual([r[0].waers, r[1].waers, r[2].waers], ["USD", "PEN", "PEN"]);
	assert.deepEqual(opcionesAreaCliente(areas, []), []);
	assert.deepEqual(opcionesAreaCliente(undefined, ["1201"]), []);
});

test("textoSolicitudAmpliacion arma el asunto y el cuerpo con cliente, area pedida, referencia y solicitante", () => {
	const r = textoSolicitudAmpliacion({ cliente: "LUPITA DE ORO E.I.R.L.", kunnr: "0100025753", documento: "RUC 20608598970", areaNueva: "1203 Repuestos Promogesa · 10 Mayorista", areaReferencia: "1101 · pago C030", vendedor: "99000258 — INCA", motivo: "" });
	assert.equal(r.asunto, "Ampliar cliente 0100025753 a 1203 Repuestos Promogesa · 10 Mayorista");
	assert.ok(r.cuerpo.includes("Cliente: LUPITA DE ORO E.I.R.L. (N° 0100025753, RUC 20608598970)"));
	assert.ok(r.cuerpo.includes("Copiar condiciones de: 1101 · pago C030"));
	assert.ok(r.cuerpo.includes("Solicitante: 99000258"));
	assert.ok(!textoSolicitudAmpliacion({ cliente: "X", kunnr: "1", documento: "", areaNueva: "A", vendedor: "V", motivo: "" }).cuerpo.includes("Copiar condiciones"));
});
