import { test } from "node:test";
import assert from "node:assert/strict";
import { aBloqueo, aCambio, arbolUbigeo, crearClienteSap, cuerpoAlta, cuerpoEdicion, leerBloqueoEdicion, serviciosDeCliente, type DatosAlta } from "../webapp/model/ClienteEscrituraService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

const como = (m: unknown) => m as Parameters<typeof crearClienteSap>[0];

const alta: DatosAlta = {
	tipoDoc: "RUC",
	doc: " 20600467949 ",
	razon1: "BM3 SAC",
	razon2: "",
	razon3: "",
	dir1: "Av. Prueba 123",
	dir2: "",
	dir3: "",
	dep: "Lima",
	prov: "Lima",
	dist: "Miraflores",
	celular: "987 654 321",
	email: "ventas@bm3.pe"
};

test("cuerpoAlta: recorta, quita espacios del celular y respeta el largo de los campos de SAP", () => {
	const c = cuerpoAlta({ ...alta, razon1: "X".repeat(50), email: "a@b.pe" });
	assert.equal(c.Doc, "20600467949");
	assert.equal(c.Celular, "987654321");
	assert.equal(c.Razon1.length, 35);
	assert.equal(c.Email, "a@b.pe");
	assert.deepEqual(Object.keys(c).sort(), ["Celular", "Dep", "Dir1", "Dir2", "Dir3", "Dist", "Doc", "Email", "Prov", "Razon1", "Razon2", "Razon3", "TipoDoc"]);
});

test("cuerpoEdicion: solo viajan los campos que cambiaron, con el nombre del servicio", () => {
	assert.deepEqual(cuerpoEdicion({ razon1: " Nuevo SAC ", celular: "912345678" }), { Razon1: "Nuevo SAC", Celular: "912345678" });
	assert.deepEqual(cuerpoEdicion({}), {});
});

test("aBloqueo y aCambio: pasan la fila del servicio a lo que muestra la pantalla", () => {
	assert.deepEqual(aBloqueo({ NombreBloqueado: "X", NombreMotivo: "Tiene un anticipo abierto" }), {
		nombreBloqueado: true,
		nombreMotivo: "Tiene un anticipo abierto",
		direccionBloqueada: false,
		direccionMotivo: ""
	});
	assert.deepEqual(aCambio({ Fecha: "2026-10-13T10:00:00Z", Usuario: "ARNALDO", Campo: "Telefono", ValorAntes: "1", ValorDespues: "2" }), {
		fecha: "2026-10-13",
		usuario: "ARNALDO",
		campo: "Telefono",
		antes: "1",
		despues: "2"
	});
});

test("serviciosDeCliente: solo marca lo que el $metadata ya publica", async () => {
	const nada = crearModeloFalso();
	assert.deepEqual(await serviciosDeCliente(como(nada.modelo)), { alta: false, edicion: false, bloqueo: false, historial: false, ubigeo: false });
	const parcial = crearModeloFalso({ camposPublicados: ["ClienteAlta/Doc", "ClienteEdicionBloqueo/NombreBloqueado"] });
	assert.deepEqual(await serviciosDeCliente(como(parcial.modelo)), { alta: true, edicion: false, bloqueo: true, historial: false, ubigeo: false });
});

test("crearClienteSap: crea en ClienteAlta con el cuerpo recortado", async () => {
	const { modelo, creadas } = crearModeloFalso();
	await crearClienteSap(como(modelo), alta).catch(() => undefined);
	assert.equal(creadas[0]?.ruta, "/ClienteAlta");
	assert.equal(creadas[0]?.datos.Doc, "20600467949");
});

test("leerBloqueoEdicion: si la lectura falla no inventa un bloqueo", async () => {
	const modelo = {
		bindList() {
			return {
				async requestContexts() {
					throw new Error("sin entidad");
				}
			};
		}
	};
	assert.equal(await leerBloqueoEdicion(como(modelo), "0100000001"), null);
});

test("arbolUbigeo: agrupa departamento, provincia y distritos, ordenados y sin repetidos", () => {
	const arbol = arbolUbigeo([
		{ Dep: "Lima", Prov: "Lima", Dist: "Miraflores" },
		{ Dep: "Lima", Prov: "Lima", Dist: "Barranco" },
		{ Dep: "Lima", Prov: "Lima", Dist: "Barranco" },
		{ Dep: "Amazonas", Prov: "Chachapoyas", Dist: "Asunci\u00f3n" },
		{ Dep: "Lima", Prov: "", Dist: "X" }
	]);
	assert.deepEqual(arbol, [
		{ dep: "Amazonas", provincias: [{ prov: "Chachapoyas", distritos: ["Asunci\u00f3n"] }] },
		{ dep: "Lima", provincias: [{ prov: "Lima", distritos: ["Barranco", "Miraflores"] }] }
	]);
});
