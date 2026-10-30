import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarVendedores, fijarPin, guardarVendedor, hashPin, identificar, normalizarPernr, recordarSesion, recordarVendedor, sesionDelVendedorRecordado, sesionVigente, type Vendedor } from "../webapp/model/VendedoresService.ts";

const v = (pernr: string, nombre: string, pinHash = ""): Vendedor => ({
	pernr, nombre, tipo: "repuestos", vkorg: "1103", vkbur: "1101", werks: "1101", lgort: "0001", vtweg: "11",
	zterm: "C000", vsbed: "02", waers: "PEN", vigenciaDias: 7, rol: "V", conPin: pinHash !== "", pinHash, activo: true
});

test("normalizarPernr completa a 8 digitos y deja intacto lo que no es numerico", () => {
	assert.equal(normalizarPernr(" 406 "), "00000406");
	assert.equal(normalizarPernr("99000406"), "99000406");
	assert.equal(normalizarPernr("ab1"), "ab1");
});

test("buscarVendedores busca por nombre sin tildes ni mayusculas y por PERNR", () => {
	const lista = [v("99000406", "María Pérez"), v("99000354", "Juan Soto")];
	assert.deepEqual(buscarVendedores(lista, "maria").map((x) => x.pernr), ["99000406"]);
	assert.deepEqual(buscarVendedores(lista, "354").map((x) => x.pernr), ["99000354"]);
	assert.equal(buscarVendedores(lista, "").length, 2);
	assert.equal(buscarVendedores(lista, "zzz").length, 0);
});

test("identificar sin SAP (prototipo): sin PIN guardado entra; con PIN compara el hash; nunca hay sesion", async () => {
	assert.deepEqual(await identificar(undefined, v("1", "A"), ""), { ok: true, sesion: "" });
	const conPin = v("2", "B", await hashPin("1234"));
	assert.deepEqual(await identificar(undefined, conPin, "1234"), { ok: true, sesion: "" });
	assert.equal((await identificar(undefined, conPin, "9999")).ok, false);
	assert.equal((await identificar(undefined, conPin, "")).ok, false);
});

/** Modelo minimo: registra la ruta y los parametros de cada accion; resultado = lo que devuelve la accion, error = la rechaza. */
function modeloAccion(resultado: unknown = {}, error = "") {
	const llamadas: { ruta: string; parametros: Record<string, unknown> }[] = [];
	const modelo = {
		bindContext(ruta: string) {
			const parametros: Record<string, unknown> = {};
			llamadas.push({ ruta, parametros });
			return {
				setParameter(n: string, valor: unknown) { parametros[n] = valor; },
				async execute() { if (error) { throw new Error(error); } },
				getBoundContext() { return { getObject: () => resultado }; }
			};
		}
	};
	return { modelo: modelo as unknown as Parameters<typeof identificar>[0], llamadas };
}

const SESION = "99000298.1103.R.20261030080000.ABCDEF";

test("identificar con SAP: verificarPin devuelve la sesion firmada; un rechazo de SAP es PIN incorrecto", async () => {
	const ok = modeloAccion({ Sesion: SESION });
	assert.deepEqual(await identificar(ok.modelo, v("99000298", "A"), "1234"), { ok: true, sesion: SESION });
	assert.equal(ok.llamadas[0].ruta, "/Vendedor(Pernr='99000298',Vkorg='1103',TipoVenta='R')/com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.verificarPin(...)");
	assert.deepEqual(ok.llamadas[0].parametros, { Pin: "1234" });
	const mal = modeloAccion({}, "PIN incorrecto o vendedor inactivo");
	assert.deepEqual(await identificar(mal.modelo, v("99000298", "A"), "0000"), { ok: false, sesion: "" });
});

test("sesionVigente: de esa fila de vendedor y antes del vencimiento (UTC); la firma solo la mira SAP", () => {
	const fila = v("99000298", "A");
	const antes = new Date(Date.UTC(2026, 9, 30, 7, 59, 59));
	const despues = new Date(Date.UTC(2026, 9, 30, 8, 0, 1));
	assert.equal(sesionVigente(SESION, fila, antes), true);
	assert.equal(sesionVigente(SESION, fila, despues), false);
	assert.equal(sesionVigente(SESION, { ...fila, vkorg: "1203" }, antes), false);
	assert.equal(sesionVigente(SESION, { ...fila, tipo: "vehiculos" }, antes), false);
	assert.equal(sesionVigente(SESION, v("99000258", "B"), antes), false);
	assert.equal(sesionVigente("", fila, antes), false);
	assert.equal(sesionVigente("99000298.1103.R.mañana.ABCDEF", fila, antes), false);
});

test("sesionDelVendedorRecordado: la sesion guardada en la pestana tiene que ser del vendedor recordado y estar vigente", () => {
	const datos = new Map<string, string>();
	const global = globalThis as Record<string, unknown>;
	global.sessionStorage = { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, x: string) => datos.set(k, x), removeItem: (k: string) => datos.delete(k) };
	const hoy = new Date(Date.UTC(2026, 9, 30, 7, 0, 0));
	try {
		assert.equal(sesionDelVendedorRecordado(hoy), false);
		recordarVendedor("99000298|1103|repuestos");
		recordarSesion(SESION);
		assert.equal(sesionDelVendedorRecordado(hoy), true);
		assert.equal(sesionDelVendedorRecordado(new Date(Date.UTC(2026, 9, 30, 9, 0, 0))), false);
		recordarVendedor("99000258|1103|repuestos");
		assert.equal(sesionDelVendedorRecordado(hoy), false);
		recordarVendedor("99000298|1103|repuestos");
		recordarSesion("");
		assert.equal(sesionDelVendedorRecordado(hoy), false);
	} finally {
		delete global.sessionStorage;
	}
});

test("fijarPin manda la sesion del administrador; la del primer PIN va vacia", async () => {
	const { modelo, llamadas } = modeloAccion();
	const conPin = await fijarPin(modelo, v("99000298", "A"), "4321", SESION);
	assert.equal(conPin.conPin, true);
	assert.deepEqual(llamadas[0].parametros, { Pin: "4321", Sesion: SESION });
	await fijarPin(modelo, v("99000298", "A"), "4321", "");
	assert.deepEqual(llamadas[1].parametros, { Pin: "4321", Sesion: "" });
});

test("guardarVendedor: alta y cambio por la accion estatica guardar, con todos los campos, Nuevo y la sesion", async () => {
	const { modelo, llamadas } = modeloAccion();
	const fila = v("99000298", "PEPE");
	const lista = await guardarVendedor(modelo, [], fila, true, SESION);
	assert.equal(lista.length, 1);
	assert.equal(llamadas[0].ruta, "/Vendedor/com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.guardar(...)");
	assert.deepEqual(llamadas[0].parametros, {
		Pernr: "99000298", Nombre: "PEPE", TipoVenta: "R", Vkorg: "1103", Vkbur: "1101", Werks: "1101", Lgort: "0001", Vtweg: "11",
		Zterm: "C000", Vsbed: "02", Waers: "PEN", VigenciaDias: "007", Rol: "V", Bukrs: "", Activo: "X", Nuevo: true, Sesion: SESION
	});
	await guardarVendedor(modelo, lista, { ...fila, nombre: "PEPE 2" }, false, SESION);
	assert.equal(llamadas[1].parametros.Nuevo, false);
	assert.equal(llamadas[1].parametros.Nombre, "PEPE 2");
	// Un rechazo de SAP (sin sesion de administrador) llega como error y la lista no cambia.
	const rechazo = modeloAccion({}, "Solo un administrador del Cotizador, identificado con su PIN, puede hacer esto");
	await assert.rejects(guardarVendedor(rechazo.modelo, lista, fila, false, ""), /Solo un administrador/);
});

test("filtroEmpleado: solo digitos = PERNR exacto de 8; texto = nombre contiene en mayusculas y con comillas escapadas", async () => {
	const { filtroEmpleado } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(filtroEmpleado("406"), "Pernr eq '00000406'");
	assert.equal(filtroEmpleado("99000354"), "Pernr eq '99000354'");
	assert.equal(filtroEmpleado("  ana o'neil "), "contains(Nombre,'ANA O''NEIL')");
});

test("claveVendedor distingue las filas de un mismo PERNR por organizacion y tipo de venta", async () => {
	const { claveVendedor } = await import("../webapp/model/VendedoresService.ts");
	const a = claveVendedor({ pernr: "99000298", vkorg: "1103", tipo: "repuestos" });
	const b = claveVendedor({ pernr: "99000298", vkorg: "1303", tipo: "repuestos" });
	assert.notEqual(a, b);
	assert.equal(a, "99000298|1103|repuestos");
});

test("filtroEmpleado con sociedad suma el filtro Bukrs; sociedadesDe saca las distintas, ordenadas y con nombre", async () => {
	const { filtroEmpleado, sociedadesDe, textoSociedad } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(filtroEmpleado("406"), "Pernr eq '00000406'");
	assert.equal(filtroEmpleado("406", "1200"), "Pernr eq '00000406' and Bukrs eq '1200'");
	assert.equal(filtroEmpleado("garay", "1100"), "contains(Nombre,'GARAY') and Bukrs eq '1100'");
	assert.deepEqual(sociedadesDe([{ Bukrs: "1200" }, { Bukrs: "1100" }, { Bukrs: "1200" }, {}, { Bukrs: "9999" }]).map((o) => o.key), ["1100", "1200", "9999"]);
	assert.equal(textoSociedad("1300"), "1300 Socopur Selva");
	assert.equal(textoSociedad("9999"), "9999");
});

test("organizacionesDeSociedad: cada sociedad ofrece sus tres organizaciones (vehiculos, taller, repuestos)", async () => {
	const { organizacionesDeSociedad, orgPorDefecto } = await import("../webapp/model/VendedoresService.ts");
	assert.deepEqual(organizacionesDeSociedad("1100").map((o) => o.key), ["1101", "1102", "1103"]);
	assert.deepEqual(organizacionesDeSociedad("1200").map((o) => o.key), ["1201", "1202", "1203"]);
	assert.deepEqual(organizacionesDeSociedad("1300").map((o) => o.key), ["1301", "1302", "1303"]);
	assert.equal(organizacionesDeSociedad("").length, 9);
	assert.match(organizacionesDeSociedad("1200")[2].text, /1203 Repuestos Promogesa/);
	assert.equal(orgPorDefecto("repuestos", "1200"), "1203");
	assert.equal(orgPorDefecto("vehiculos", "1300"), "1301");
	assert.equal(orgPorDefecto("repuestos", ""), "1103");
});

test("textoOrganizacion: descripcion de las organizaciones conocidas; una desconocida queda con su codigo", async () => {
	const { textoOrganizacion } = await import("../webapp/model/VendedoresService.ts");
	assert.equal(textoOrganizacion("1203"), "1203 Repuestos Promogesa");
	assert.equal(textoOrganizacion("1101"), "1101 Vehículos Socopur");
	assert.equal(textoOrganizacion("1302"), "1302 Taller Socopur Selva");
	assert.equal(textoOrganizacion("9999"), "9999");
});
