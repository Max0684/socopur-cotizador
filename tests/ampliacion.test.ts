import { test } from "node:test";
import assert from "node:assert/strict";
import { aEstadoAmpliacion, AmpliacionEnProcesoError, ampliarRetail, gruposDeTexto, leerAmpliacion } from "../webapp/model/AmpliacionService.ts";

const como = (m: unknown) => m as Parameters<typeof ampliarRetail>[0];
const sinPausa = { pausa: async () => undefined };

// Fila como la devuelve ClienteAmpliacion (YC_COTIZ_CLIAMPL) para 0100024840 en el mandante 130 (29/10/2026).
const pendiente24840 = {
	Kunnr: "0100024840",
	Pendiente: true,
	AreasPendientes: 13,
	AreasTexto: "1101/11: 19, 20; 1102/11: 19, 20; 1201/11: 19, 20; 1202/11: 19, 20, 52; 1301/11: 19, 20; 1302/11: 19, 20",
	Sociedades: "",
	Estado: "",
	Mensaje: ""
};

/** ClienteEdicion devuelve el cliente; ClienteAmpliacion devuelve las lecturas en orden (repite la ultima). */
function modeloAmpliacion(lecturas: Record<string, unknown>[], opciones: { sinCliente?: boolean; rechazo?: string } = {}) {
	const llamadas: string[] = [];
	const modelo = {
		bindList(ruta: string, _p?: unknown, _a?: unknown, _b?: unknown, parametros?: { $filter?: string }) {
			return {
				async requestContexts() {
					llamadas.push(`read ${ruta} ${parametros?.$filter ?? ""}`);
					if (ruta === "/ClienteEdicion") {
						return opciones.sinCliente ? [] : [{ getPath: () => "/ClienteEdicion('0100024840')" }];
					}
					const fila = lecturas.length > 1 ? lecturas.shift() : lecturas[0];
					return fila ? [{ getObject: () => fila }] : [];
				}
			};
		},
		bindContext(ruta: string, contexto?: { getPath(): string }) {
			return {
				async execute() {
					llamadas.push(`execute ${contexto?.getPath() ?? ""}/${ruta}`);
					if (opciones.rechazo) {
						throw new Error(opciones.rechazo);
					}
				}
			};
		}
	};
	return { modelo, llamadas };
}

test("gruposDeTexto: un grupo por organizacion y canal con sus sectores", () => {
	assert.deepEqual(gruposDeTexto("1101/11: 19, 20; 1202/11: 19, 20, 52"), [
		{ vkorg: "1101", vtweg: "11", sectores: ["19", "20"] },
		{ vkorg: "1202", vtweg: "11", sectores: ["19", "20", "52"] }
	]);
	assert.deepEqual(gruposDeTexto(""), []);
});

test("gruposDeTexto: el texto cortado por SAP (...) descarta el sector incompleto", () => {
	assert.deepEqual(gruposDeTexto("1303/11: 50, 51; 1303/15: 9..."), [
		{ vkorg: "1303", vtweg: "11", sectores: ["50", "51"] },
		{ vkorg: "1303", vtweg: "15", sectores: [] }
	]);
});

test("aEstadoAmpliacion: Pendiente booleano o X, numero y textos", () => {
	const e = aEstadoAmpliacion(pendiente24840);
	assert.equal(e.pendiente, true);
	assert.equal(e.areasPendientes, 13);
	assert.equal(e.grupos.length, 6);
	assert.equal(aEstadoAmpliacion({ ...pendiente24840, Pendiente: "X" }).pendiente, true);
	assert.equal(aEstadoAmpliacion({ Pendiente: "" }).pendiente, false);
	assert.equal(aEstadoAmpliacion({}).areasPendientes, 0);
});

test("leerAmpliacion: filtra por Kunnr y duplica comillas; sin fila devuelve null", async () => {
	const { modelo, llamadas } = modeloAmpliacion([]);
	assert.equal(await leerAmpliacion(como(modelo), "01'2"), null);
	assert.deepEqual(llamadas, ["read /ClienteAmpliacion Kunnr eq '01''2'"]);
});

test("ampliarRetail: ejecuta la accion sobre el cliente y espera al job hasta M", async () => {
	const { modelo, llamadas } = modeloAmpliacion([
		{ ...pendiente24840, Estado: "A" },
		{ ...pendiente24840, Estado: "A" },
		{ ...pendiente24840, Pendiente: false, AreasPendientes: 0, AreasTexto: "", Estado: "M", Mensaje: "Cliente ampliado 100024840: 13 area(s) retail" }
	]);
	const e = await ampliarRetail(como(modelo), "0100024840", sinPausa);
	assert.equal(e.estado, "M");
	assert.equal(e.pendiente, false);
	assert.equal(llamadas[0], "read /ClienteEdicion Kunnr eq '0100024840'");
	assert.equal(llamadas[1], "execute /ClienteEdicion('0100024840')/com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.ampliarRetail(...)");
	assert.equal(llamadas.filter((l) => l.startsWith("read /ClienteAmpliacion")).length, 3);
});

test("ampliarRetail: un error del job (E) se devuelve con su motivo, sin seguir esperando", async () => {
	const { modelo } = modeloAmpliacion([{ ...pendiente24840, Estado: "E", Mensaje: "No se pudo ampliar el cliente: zona no valida" }]);
	const e = await ampliarRetail(como(modelo), "0100024840", sinPausa);
	assert.equal(e.estado, "E");
	assert.match(e.mensaje, /zona no valida/);
});

test("ampliarRetail: si el job no termina a tiempo, AmpliacionEnProcesoError", async () => {
	const { modelo } = modeloAmpliacion([{ ...pendiente24840, Estado: "A" }]);
	await assert.rejects(ampliarRetail(como(modelo), "0100024840", { ...sinPausa, intervaloMs: 1000, maximoMs: 3000 }), AmpliacionEnProcesoError);
});

test("ampliarRetail: el rechazo de SAP llega como error y no se lee el estado", async () => {
	const { modelo, llamadas } = modeloAmpliacion([pendiente24840], { rechazo: "Ya hay una ampliacion de este cliente en curso" });
	await assert.rejects(ampliarRetail(como(modelo), "0100024840", sinPausa), /en curso/);
	assert.equal(llamadas.some((l) => l.startsWith("read /ClienteAmpliacion")), false);
});

test("ampliarRetail: sin el cliente en ClienteEdicion no ejecuta nada", async () => {
	const { modelo, llamadas } = modeloAmpliacion([pendiente24840], { sinCliente: true });
	await assert.rejects(ampliarRetail(como(modelo), "0100099999", sinPausa), /no encontro/);
	assert.equal(llamadas.some((l) => l.startsWith("execute")), false);
});
