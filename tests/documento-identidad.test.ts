import { test } from "node:test";
import assert from "node:assert/strict";
import { conAdvertencia, consultarDocumento, datosDeFila, documentoPublicado, filtroDocumento, tipoDeDocumento } from "../webapp/model/DocumentoService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

type Modelo = Parameters<typeof consultarDocumento>[0];

// Fila como la devuelve DocumentoIdentidad (YC_COTIZ_DOCID) para JYAS: ubigeo ya traducido a los nombres del catalogo de SAP.
const jyas = {
	TipoDoc: "RUC",
	Numero: "20393772841",
	Ok: true,
	Mensaje: "Datos de SUNAT",
	Nombre: "JYAS MOTORS E.I.R.L.",
	Direccion: "JR. MAYA DE BRITTO NRO. 528",
	Departamento: "Ucayali",
	Provincia: "CORONEL PORTILLO",
	Distrito: "CALLERIA",
	Ubigeo: "250101",
	Estado: "ACTIVO",
	Condicion: "HABIDO"
};

test("tipoDeDocumento: el elegido manda; si no, 11 digitos es RUC y el resto DNI", () => {
	assert.equal(tipoDeDocumento("20393772841", "DNI"), "DNI");
	assert.equal(tipoDeDocumento("20393772841"), "RUC");
	assert.equal(tipoDeDocumento("45678912"), "DNI");
});

test("filtroDocumento arma el $filter y duplica las comillas", () => {
	assert.equal(filtroDocumento("RUC", " 20393772841 "), "TipoDoc eq 'RUC' and Numero eq '20393772841'");
	assert.equal(filtroDocumento("DNI", "1'2"), "TipoDoc eq 'DNI' and Numero eq '1''2'");
});

test("datosDeFila: Ok booleano o X y textos sin espacios", () => {
	assert.equal(datosDeFila(jyas).ok, true);
	assert.equal(datosDeFila({ ...jyas, Ok: "X" }).ok, true);
	assert.equal(datosDeFila({ Ok: false, Mensaje: " No hay conexion " }).mensaje, "No hay conexion");
});

test("conAdvertencia: solo si el RUC no esta ACTIVO o HABIDO", () => {
	assert.equal(conAdvertencia(datosDeFila(jyas)), false);
	assert.equal(conAdvertencia(datosDeFila({ ...jyas, Condicion: "NO HABIDO" })), true);
	assert.equal(conAdvertencia(datosDeFila({ ...jyas, Estado: "BAJA DE OFICIO" })), true);
	assert.equal(conAdvertencia(datosDeFila({ Ok: true, Nombre: "ANA PEREZ RIOS" })), false);
});

test("consultarDocumento lee DocumentoIdentidad con el filtro y devuelve los datos", async () => {
	const { modelo, llamadas } = crearModeloFalso({ precios: [jyas] });
	const d = await consultarDocumento(modelo as unknown as Modelo, "RUC", "20393772841");
	assert.equal(d.nombre, "JYAS MOTORS E.I.R.L.");
	assert.equal(d.distrito, "CALLERIA");
	assert.match(llamadas[0], /^read \/DocumentoIdentidad TipoDoc eq 'RUC' and Numero eq '20393772841'/);
});

test("consultarDocumento sin fila: no ok, con motivo", async () => {
	const { modelo } = crearModeloFalso({ precios: [] });
	const d = await consultarDocumento(modelo as unknown as Modelo, "DNI", "45678912");
	assert.equal(d.ok, false);
	assert.match(d.mensaje, /no respondio/);
});

test("documentoPublicado mira el campo Nombre de DocumentoIdentidad en el $metadata", async () => {
	assert.equal(await documentoPublicado(crearModeloFalso({ camposPublicados: ["DocumentoIdentidad/Nombre"] }).modelo as unknown as Modelo), true);
	assert.equal(await documentoPublicado(crearModeloFalso().modelo as unknown as Modelo), false);
});
