import { test } from "node:test";
import assert from "node:assert/strict";
import { aBloqueo, aCambio, AltaEnProcesoError, arbolUbigeo, crearClienteSap, cuerpoAlta, cuerpoEdicion, esPersona, leerBloqueoEdicion, partirNombres, serviciosDeCliente, tiposClientePara, type DatosAlta } from "../webapp/model/ClienteEscrituraService.ts";
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
	assert.deepEqual(await serviciosDeCliente(como(nada.modelo)), { alta: false, edicion: false, bloqueo: false, historial: false, ubigeo: false, persona: false });
	const parcial = crearModeloFalso({ camposPublicados: ["ClienteAlta/Doc", "ClienteAlta/Nombres", "ClienteEdicionBloqueo/NombreBloqueado"] });
	assert.deepEqual(await serviciosDeCliente(como(parcial.modelo)), { alta: true, edicion: false, bloqueo: true, historial: false, ubigeo: false, persona: true });
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
		{ Departamento: "Lima", Provincia: "Lima", Distrito: "Miraflores" },
		{ Departamento: "Lima", Provincia: "Lima", Distrito: "Barranco" },
		{ Departamento: "Lima", Provincia: "Lima", Distrito: "Barranco" },
		{ Departamento: "Amazonas", Provincia: "Chachapoyas", Distrito: "Asunci\u00f3n" },
		{ Departamento: "Lima", Provincia: "", Distrito: "X" }
	]);
	assert.deepEqual(arbol, [
		{ dep: "Amazonas", provincias: [{ prov: "Chachapoyas", distritos: ["Asunci\u00f3n"] }] },
		{ dep: "Lima", provincias: [{ prov: "Lima", distritos: ["Barranco", "Miraflores"] }] }
	]);
});

function modeloAlta(inicial: Record<string, unknown>, lecturas: Record<string, unknown>[]) {
	const rutas: string[] = [];
	let n = 0;
	const modelo = {
		bindList() {
			return {
				create() {
					return { created: async () => undefined, getObject: () => inicial, getPath: () => "/ClienteAlta(Id=abc)" };
				}
			};
		},
		bindContext(ruta: string) {
			rutas.push(ruta);
			return { requestObject: async () => lecturas[Math.min(n++, lecturas.length - 1)] };
		}
	};
	return { modelo, rutas };
}

const sinPausa = { pausa: async () => undefined };

test("crearClienteSap: la creacion corre en segundo plano y se lee la solicitud hasta que trae el Kunnr", async () => {
	const { modelo, rutas } = modeloAlta({ Id: "abc", Creado: false, Mensaje: "Solicitud en proceso" }, [{ Creado: false, Mensaje: "Solicitud en proceso" }, { Creado: true, Kunnr: "0100031000", Mensaje: "" }]);
	const r = await crearClienteSap(como(modelo), alta, sinPausa);
	assert.deepEqual(r, { kunnr: "0100031000", creado: true, mensaje: "" });
	assert.deepEqual(rutas, ["/ClienteAlta(Id=abc)", "/ClienteAlta(Id=abc)"]);
});

test("crearClienteSap: un documento repetido devuelve el Kunnr existente sin esperar", async () => {
	const { modelo, rutas } = modeloAlta({ Id: "abc", Creado: false, Kunnr: "0100019193", Mensaje: "El documento ya existe" }, []);
	const r = await crearClienteSap(como(modelo), alta, sinPausa);
	assert.deepEqual(r, { kunnr: "0100019193", creado: false, mensaje: "El documento ya existe" });
	assert.equal(rutas.length, 0);
});

test("crearClienteSap: un mensaje de error sin Kunnr es un rechazo y no se sigue esperando", async () => {
	const { modelo } = modeloAlta({ Id: "abc", Creado: false, Mensaje: "Solicitud en proceso" }, [{ Creado: false, Mensaje: "Ubigeo no reconocido: Lima/Lima/Xyz" }]);
	const r = await crearClienteSap(como(modelo), alta, sinPausa);
	assert.equal(r.kunnr, "");
	assert.match(r.mensaje, /Ubigeo no reconocido/);
});

test("crearClienteSap: si no termina en el tiempo de espera avisa que sigue en proceso", async () => {
	const { modelo } = modeloAlta({ Id: "abc", Creado: false, Mensaje: "Solicitud en proceso" }, [{ Creado: false, Mensaje: "Solicitud en proceso" }]);
	await assert.rejects(() => crearClienteSap(como(modelo), alta, { ...sinPausa, intervaloMs: 1000, maximoMs: 3000 }), AltaEnProcesoError);
});

test("partirRazon: un solo campo se reparte entre palabras en partes de 35 (SAP las une con un espacio)", async () => {
	const { partirRazon } = await import("../webapp/model/ClienteEscrituraService.ts");
	assert.deepEqual(partirRazon("SOCIEDAD GASTRO AQP"), ["SOCIEDAD GASTRO AQP"]);
	assert.deepEqual(partirRazon("  IMPORTADORA   Y DISTRIBUIDORA DE REPUESTOS DEL ORIENTE S.A.C. "), ["IMPORTADORA Y DISTRIBUIDORA DE", "REPUESTOS DEL ORIENTE S.A.C."]);
	assert.deepEqual(partirRazon(""), []);
});

test("partirRazon: una palabra de mas de 35 se corta donde cae; mas de 3 partes es que no entra en SAP", async () => {
	const { partirRazon } = await import("../webapp/model/ClienteEscrituraService.ts");
	assert.deepEqual(partirRazon(`${"A".repeat(40)} SAC`), ["A".repeat(35), "AAAAA SAC"]);
	const doce = Array.from({ length: 12 }, () => "PALABRA").join(" ");
	assert.equal(partirRazon(doce).length, 3);
	assert.equal(partirRazon(`${doce} OTRA MAS`).length, 4);
});

test("cuerpoAlta: una persona manda tratamiento, nombres y apellidos, y la razon social vacia", () => {
	const c = cuerpoAlta({ ...alta, tipoDoc: "DNI", doc: "72467726", titulo: "0002", nombres: " Christian   Stephano ", apePat: " Salas ", apeMat: "Anco" });
	assert.equal(c.Titulo, "0002");
	assert.equal(c.Nombres, "Christian Stephano");
	assert.equal(c.ApePaterno, "Salas");
	assert.equal(c.ApeMaterno, "Anco");
	assert.equal(c.Razon1, "");
	assert.equal(c.Doc, "72467726");
});

test("cuerpoAlta: una empresa manda solo el tratamiento 0003; sin tratamiento no se manda ningun campo nuevo", () => {
	const empresa = cuerpoAlta({ ...alta, titulo: "0003", nombres: "No va" });
	assert.equal(empresa.Titulo, "0003");
	assert.equal(empresa.Nombres, undefined);
	assert.equal(empresa.Razon1, "BM3 SAC");
	const anterior = cuerpoAlta(alta);
	assert.equal("Titulo" in anterior, false);
	assert.equal("Nombres" in anterior, false);
});

test("tiposClientePara: DNI solo persona, RUC 20 solo empresa, RUC 10 cualquiera", () => {
	assert.deepEqual(tiposClientePara("DNI", "72467726"), ["0001", "0002"]);
	assert.deepEqual(tiposClientePara("RUC", "20393772841"), ["0003"]);
	assert.deepEqual(tiposClientePara("RUC", "10731269233"), ["0001", "0002", "0003"]);
	assert.equal(esPersona("0001"), true);
	assert.equal(esPersona("0003"), false);
	assert.equal(esPersona(undefined), false);
});

test("partirNombres: el primero y el resto, hasta 40 letras cada uno", () => {
	assert.deepEqual(partirNombres(" Juan  Carlos Alberto "), { nombre: "Juan", segundo: "Carlos Alberto" });
	assert.deepEqual(partirNombres("Wendy"), { nombre: "Wendy", segundo: "" });
	assert.equal(partirNombres("X".repeat(41)), null);
	assert.equal(partirNombres(`Ana ${"Y".repeat(41)}`), null);
});
