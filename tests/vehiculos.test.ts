import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarVehiculos, filaDeVehiculo, filtrarVehiculos, filtroVehiculos, agruparVehiculos, type FilaVehiculoSap , textoDetalleVehiculo } from "../webapp/model/VehiculosService.ts";

const fila = (extra: Partial<FilaVehiculoSap> = {}): FilaVehiculoSap => ({
	Vkorg: "1101", Vtweg: "10", Vhcle: "1000006683", Vhvin: "LF3HCM0X9SG004459", Matnr: "CAR200B", Maktx: "LF200ZH-X", Werks: "1101",
	Avail: "D1", AvailTxt: "Disponible", Sdsta: "S000", Mmsta: "M100", Color: "AZU", AnoModelo: "2025", Condicion: "CKD", VersionModelo: "",
	Variante: "CAR200BCKD2025AZU", StockLote: 1, Segmento1: "VE", Segmento2: "ME", Marca: "Lifan", Spart: "16", SpartCabecera: "16", ...extra
});

test("filtroVehiculos arma los eq y omite los vacios", () => {
	assert.equal(filtroVehiculos({ vkorg: "1101", vtweg: "10" }), "Vkorg eq '1101' and Vtweg eq '10'");
	assert.equal(
		filtroVehiculos({ vkorg: "1101", vtweg: "10", werks: "1101", color: "azu", anio: "2025", condicion: "ckd" }),
		"Vkorg eq '1101' and Vtweg eq '10' and Werks eq '1101' and Color eq 'AZU' and AnoModelo eq '2025' and Condicion eq 'CKD'"
	);
});

test("filaDeVehiculo conserva modelo, variante, centro y VIN, y usa SpartCabecera del servicio", () => {
	const v = filaDeVehiculo(fila({ SpartCabecera: "90" }));
	assert.equal(v.material, "CAR200B");
	assert.equal(v.variante, "CAR200BCKD2025AZU");
	assert.equal(v.vin, "LF3HCM0X9SG004459");
	assert.equal(v.centro, "1101");
	assert.equal(v.anio, 2025);
	assert.equal(v.stockMio, 1);
	assert.equal(v.sectorOferta, "90");
	assert.equal(v.sinPrecio, true);
});

test("filtrarVehiculos busca por codigo, descripcion y texto libre (VIN incluido)", () => {
	const filas = [filaDeVehiculo(fila()), filaDeVehiculo(fila({ Vhvin: "OTRO", Matnr: "DU200Z0", Maktx: "DUKE 200", Segmento2: "LI" }))];
	assert.equal(filtrarVehiculos(filas, { codigo: "du2" }).length, 1);
	assert.equal(filtrarVehiculos(filas, { descripcion: "duke" })[0].material, "DU200Z0");
	assert.equal(filtrarVehiculos(filas, { texto: "g004459" })[0].material, "CAR200B");
	assert.equal(filtrarVehiculos(filas, { clase: "LI" }).length, 1);
	assert.equal(filtrarVehiculos(filas, {}).length, 2);
});

test("buscarVehiculos consulta la entidad Vehiculo", async () => {
	const pedidos: { ruta: string; p?: { $filter?: string } }[] = [];
	const modelo = {
		bindList(ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: { $filter?: string }) {
			pedidos.push({ ruta, p });
			return { async requestContexts() { return [{ getObject: () => fila() }]; } };
		}
	};
	const r = await buscarVehiculos(modelo as unknown as Parameters<typeof buscarVehiculos>[0], { vkorg: "1101", vtweg: "10", werks: "1101" });
	assert.equal(r.length, 1);
	assert.equal(pedidos[0].ruta, "/Vehiculo");
	assert.equal(pedidos[0].p?.$filter, "Vkorg eq '1101' and Vtweg eq '10' and Werks eq '1101'");
});

test("agruparVehiculos junta las unidades iguales y suma la cantidad", () => {
	const filas = [
		filaDeVehiculo(fila()),
		filaDeVehiculo(fila({ Vhcle: "1000006685", Vhvin: "VIN2" })),
		filaDeVehiculo(fila({ Vhvin: "VIN3", Color: "ROJ", Variante: "CAR200BCKD2025ROJ" })),
		filaDeVehiculo(fila({ Vhvin: "VIN4", Werks: "1102" }))
	];
	const g = agruparVehiculos(filas);
	assert.equal(g.length, 3);
	assert.equal(g[0].stockMio, 2);
	assert.deepEqual(g[0].vins, ["LF3HCM0X9SG004459", "VIN2"]);
	assert.equal(g[0].vin, "");
});

test("filaDeVehiculo guarda el nombre del color y la busqueda libre lo encuentra", () => {
	const v = filaDeVehiculo(fila({ ColorTxt: "AZUL" }));
	assert.equal(v.colorTxt, "AZUL");
	assert.equal(filtrarVehiculos([v], { texto: "azul" }).length, 1);
	assert.equal(filaDeVehiculo(fila()).colorTxt, "");
});

test("textoDetalleVehiculo omite color, ano y VIN que no existen (antes salia \"· 0 · CBU\")", () => {
	assert.equal(textoDetalleVehiculo({ colorTxt: "", color: "", anio: 0, condicion: "CBU" }), "CBU");
	assert.equal(textoDetalleVehiculo({ colorTxt: "AZUL", anio: 2025, condicion: "CBU", vin: "VBKJ" }), "AZUL \u00b7 2025 \u00b7 CBU \u00b7 VBKJ");
	assert.equal(textoDetalleVehiculo({ color: "NEG", anio: "2024", condicion: "CKD" }), "NEG \u00b7 2024 \u00b7 CKD");
});
