import { test } from "node:test";
import assert from "node:assert/strict";
import { leerPlantilla, validarContraSap, type RepuestoExcel, type VehiculoExcel } from "../webapp/model/CargaExcel.ts";
import { filtroVehiculos } from "../webapp/model/VehiculosService.ts";

// Textos: la clave y sus argumentos, para comprobar que mensaje sale sin depender del i18n.
const t = (clave: string, args?: (string | number)[]): string => (args?.length ? `${clave}:${args.join("|")}` : clave);

test("la plantilla simplificada se lee por encabezado, sin importar el orden ni las tildes", () => {
	const filas = leerPlantilla([
		["Cantidad", "Material", "Año", "Condición", "Color"],
		[2, "MOT107251", "", "", ""],
		[1, "du200z0", 2025, "CBU", "Anaranjado"],
		[3, "", "", "", ""]
	]);
	assert.deepEqual(filas, [
		{ fila: 2, material: "MOT107251", tipo: "", cantidad: 2, color: "", condicion: "", anio: "" },
		{ fila: 3, material: "du200z0", tipo: "", cantidad: 1, color: "Anaranjado", condicion: "CBU", anio: "2025" }
	]);
});

test("la plantilla de ZSDP009 se sigue aceptando: por encabezado y, sin encabezado reconocible, por posicion", () => {
	const zsdp = [["Material", "Tipo", "Cantidad", "Color", "Condicion", "Modelo", "Marca", "Anio"], ["DU200Z0", "V", 1, "ANA", "CBU", "200 DUKE", "KTM", 2025]];
	const esperado = [{ fila: 2, material: "DU200Z0", tipo: "V", cantidad: 1, color: "ANA", condicion: "CBU", anio: "2025" }];
	assert.deepEqual(leerPlantilla(zsdp), esperado);
	assert.deepEqual(leerPlantilla([["A", "B", "C", "D", "E", "F", "G", "H"], zsdp[1]]), esperado);
});

const repuestos: Record<string, RepuestoExcel> = {
	MOT107251: { material: "MOT107251", denominacion: "8100 ECO LITE 5W30 4L FS", disponible: 144 },
	"SFX428H-150-MTK": { material: "SFX428H-150-MTK", denominacion: "CADENA ARRASTRE 428H-150L MTK PRUEBA", disponible: 5 }
};
const vehiculos: VehiculoExcel[] = [
	{ material: "DU200Z0", denominacion: "200 DUKE", variante: "DU200Z0CBU2025ANA", color: "ANA", colorTxt: "ANARANJADO", anio: 2025, condicion: "CBU", stockMio: 3 },
	{ material: "CHE1100", denominacion: "LF110-7A", variante: "CHE1100CKD2025NEG", color: "NEG", colorTxt: "NEGRO", anio: 2025, condicion: "CKD", stockMio: 85 },
	{ material: "CHE1100", denominacion: "LF110-7A", variante: "CHE1100CBU2025ROJ", color: "ROJ", colorTxt: "ROJO", anio: 2025, condicion: "CBU", stockMio: 1 }
];
const fila = (material: string, cantidad: number, extra: Partial<{ tipo: string; color: string; condicion: string; anio: string }> = {}, n = 2) => ({
	fila: n,
	material,
	tipo: "",
	cantidad,
	color: "",
	condicion: "",
	anio: "",
	...extra
});

test("un repuesto que existe en SAP queda listo; uno que no existe es error (antes se validaba contra el catalogo de ejemplo)", () => {
	const r = validarContraSap([fila("mot107251", 2), fila("LUB-1040", 2, {}, 3)], repuestos, vehiculos, t);
	assert.equal(r[0].estado, "Success");
	assert.equal(r[0].mat, "MOT107251");
	assert.equal(r[1].estado, "Error");
	assert.equal(r[1].mensaje, "excelNoExiste:LUB-1040|3");
});

test("repuesto repetido suma la cantidad en la primera fila y mas que el disponible se avisa sin bloquear", () => {
	const r = validarContraSap([fila("SFX428H-150-MTK", 3), fila("SFX428H-150-MTK", 4, {}, 3)], repuestos, vehiculos, t);
	assert.equal(r[0].cantidad, 7);
	assert.equal(r[0].estado, "Warning");
	assert.equal(r[0].mensaje, "excelSupera:5");
	assert.equal(r[1].mensaje, "excelRepetido");
	assert.equal(r[1].mat, undefined);
});

test("vehiculo con una sola variante en el centro no necesita atributos; el color se acepta por codigo o por nombre", () => {
	const r = validarContraSap([fila("DU200Z0", 1), fila("CHE1100", 1, { color: "rojo" }, 3)], repuestos, vehiculos, t);
	assert.equal(r[0].estado, "Success");
	assert.equal(r[0].variante, "DU200Z0CBU2025ANA");
	assert.equal(r[0].esVeh, true);
	assert.equal(r[1].variante, "CHE1100CBU2025ROJ");
});

test("vehiculo con varias variantes y sin atributos, o con atributos que no existen, es error y dice que variantes hay", () => {
	const r = validarContraSap([fila("CHE1100", 1), fila("CHE1100", 1, { color: "AZUL" }, 3)], repuestos, vehiculos, t);
	assert.equal(r[0].estado, "Error");
	assert.equal(r[0].mensaje, "excelVehiculoElige:NEGRO · 2025 · CKD; ROJO · 2025 · CBU");
	assert.equal(r[1].mensaje, "excelVehiculoSinVariante:NEGRO · 2025 · CKD; ROJO · 2025 · CBU");
});

test("mas vehiculos que unidades en el centro se avisa; cantidad invalida es error", () => {
	const r = validarContraSap([fila("DU200Z0", 4), fila("MOT107251", 1.5, {}, 3)], repuestos, vehiculos, t);
	assert.equal(r[0].estado, "Warning");
	assert.equal(r[0].mensaje, "excelSuperaVeh:3");
	assert.equal(r[1].estado, "Error");
	assert.equal(r[1].mensaje, "excelCantidadInvalida");
});

test("el filtro de vehiculos acepta modelos exactos para la carga desde Excel", () => {
	assert.equal(
		filtroVehiculos({ vkorg: "1101", vtweg: "10", werks: "1101", matnrs: ["du200z0", "CHE1100"] }),
		"Vkorg eq '1101' and Vtweg eq '10' and Werks eq '1101' and (Matnr eq 'DU200Z0' or Matnr eq 'CHE1100')"
	);
});
