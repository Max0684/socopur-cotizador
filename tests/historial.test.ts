import { test } from "node:test";
import assert from "node:assert/strict";
import { filaHistorial, historialPublicado, leerHistorial, ordenarHistorial, textoDetalle, textoLugar, textoOperacion, type FilaHistorial } from "../webapp/model/HistorialService.ts";

// Textos de prueba: "clave[param1|param2]" para ver que clave y parametros se piden.
const t = (clave: string, p?: string[]) => (p?.length ? `${clave}[${p.join("|")}]` : clave);
const fila = (extra: Partial<FilaHistorial>): FilaHistorial => ({ fecha: "", usuario: "", conCorreo: true, vendedor: "", operacion: "", entidad: "", referencia: "", campo: "", antes: "", despues: "", ...extra });
const como = (m: unknown) => m as Parameters<typeof leerHistorial>[0];

test("filaHistorial usa el correo BTP y, si no viajo, el usuario SAP; el vendedor va sin ceros", () => {
	const f = filaHistorial({ CotizId: "C", LogId: "L", CreadoEn: "2026-10-28T20:15:00Z", UsuarioBtp: "ana@socopur.pe", UsuarioSap: "STA_AROJAS", Pernr: "00000406", Operacion: "CREAR", Entidad: "ITEM", Referencia: "10", Campo: "MATNR", ValorDespues: "MOT112999 x 2 UN" });
	assert.equal(f.usuario, "ana@socopur.pe");
	assert.equal(f.conCorreo, true);
	assert.equal(f.vendedor, "406");
	const sin = filaHistorial({ CotizId: "C", LogId: "L", UsuarioBtp: "", UsuarioSap: "STA_AROJAS" });
	assert.equal(sin.usuario, "STA_AROJAS");
	assert.equal(sin.conCorreo, false);
});

test("ordenarHistorial: lo mas reciente primero y, a igual hora, el orden de SAP", () => {
	const filas = [fila({ fecha: "2026-10-28T10:00:00Z", campo: "A" }), fila({ fecha: "2026-10-28T11:00:00Z", campo: "B" }), fila({ fecha: "2026-10-28T10:00:00Z", campo: "C" })];
	assert.deepEqual(ordenarHistorial(filas).map((f) => f.campo), ["B", "A", "C"]);
});

test("textoDetalle: alta y baja muestran un solo valor, un cambio muestra antes y despues", () => {
	assert.equal(textoDetalle(fila({ operacion: "CREAR", campo: "MATNR", despues: "MOT112999 x 2 UN" }), t), "historialCampoMaterial: MOT112999 x 2 UN");
	assert.equal(textoDetalle(fila({ operacion: "BORRAR", campo: "MATNR", antes: "MOT112999 x 2 UN" }), t), "historialCampoMaterial: MOT112999 x 2 UN");
	assert.equal(textoDetalle(fila({ operacion: "MODIFICAR", campo: "CANTIDAD", antes: "2", despues: "5" }), t), "historialCampoCantidad: 2 → 5");
	assert.equal(textoDetalle(fila({ operacion: "MODIFICAR", campo: "ZZOTRO", antes: "", despues: "X" }), t), "ZZOTRO: — → X");
	assert.equal(textoDetalle(fila({ operacion: "ANULAR", campo: "ESTADO", despues: "Cliente desistio" }), t), "historialMotivo[Cliente desistio]");
	assert.equal(textoDetalle(fila({ operacion: "PEDIDO_CREADO", campo: "VBELNPEDIDO", despues: "3300008269" }), t), "historialCampoPedido: 3300008269");
	assert.equal(textoDetalle(fila({ operacion: "CREAR_PEDIDO", campo: "ESTADO", antes: "O", despues: "P" }), t), "");
});

test("textoLugar y textoOperacion: lugar por entidad y operacion desconocida tal cual", () => {
	assert.equal(textoLugar(fila({ entidad: "GRUPO", referencia: "01" }), t), "historialLugarGrupo[01]");
	assert.equal(textoLugar(fila({ entidad: "ITEM", referencia: "10" }), t), "historialLugarLinea[10]");
	assert.equal(textoLugar(fila({ entidad: "COTIZACION" }), t), "historialLugarCotizacion");
	assert.equal(textoOperacion("ASIGNAR_VIN", t), "historialOp_ASIGNAR_VIN");
	assert.equal(textoOperacion("OTRA", t), "OTRA");
});

test("VIN_VENCIDO (job de reservas vencidas): nombre propio y el VIN que se libero", () => {
	assert.equal(textoOperacion("VIN_VENCIDO", t), "historialOp_VIN_VENCIDO");
	assert.equal(textoDetalle(fila({ operacion: "VIN_VENCIDO", campo: "VHCLE", antes: "VBKJPDU200Z010421 (1000017334)" }), t), "historialCampoVin: VBKJPDU200Z010421 (1000017334)");
});

test("leerHistorial filtra por la cotizacion (Guid sin comillas) y ordena por fecha", async () => {
	let pedido: { ruta: string; p?: Record<string, unknown> } | undefined;
	const modelo = {
		bindList(ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: Record<string, unknown>) {
			pedido = { ruta, p };
			return {
				async requestContexts() {
					return [{ getObject: () => ({ CotizId: "C", LogId: "1", CreadoEn: "2026-10-28T10:00:00Z", Operacion: "CREAR", UsuarioBtp: "ana@socopur.pe" }) }];
				}
			};
		}
	};
	const filas = await leerHistorial(como(modelo), "0a1b2c3d-0000-0000-0000-000000000001");
	assert.equal(pedido?.ruta, "/CotizCambio");
	assert.equal(pedido?.p?.$filter, "CotizId eq 0a1b2c3d-0000-0000-0000-000000000001");
	assert.equal(pedido?.p?.$orderby, "CreadoEn desc");
	assert.equal(filas[0].usuario, "ana@socopur.pe");
});

test("historialPublicado mira CotizCambio/LogId en el $metadata", async () => {
	const con = { getMetaModel: () => ({ requestObject: async (r: string) => (r === "/CotizCambio/LogId" ? {} : undefined) }) };
	const sin = { getMetaModel: () => ({ requestObject: async () => undefined }) };
	assert.equal(await historialPublicado(como(con)), true);
	assert.equal(await historialPublicado(como(sin)), false);
});
