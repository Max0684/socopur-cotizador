import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiarEntregaCotizacion, datosGuardadosDe, entregaDeGuardados, ENVIO_UNICO, mismaEntrega, parametrosEntrega, type EntregaParaGuardar } from "../webapp/model/CotizacionesService.ts";
import { firmaLineas } from "../webapp/model/Reglas.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

// Historia 1.10: cambiar la entrega de una oferta ya guardada (accion cambiarEntrega).

const como = (m: unknown) => m as Parameters<typeof cambiarEntregaCotizacion>[0];
const RUTA = "/Cotizacion(CotizId=COT-1,IsActiveEntity=true)/com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.cambiarEntrega(...)";
const VACIOS = { DirecName1: "", DirecStreet: "", KunnrZt: "", AddrnumberZt: "", LifnrSp: "" };

test("parametrosEntrega: con recojo viajan todos los parametros, vacios salvo el tipo (SAP los trata como obligatorios)", () => {
	assert.deepEqual(parametrosEntrega({ tipo: "02", kunnrWe: "0100025848", addrnumberWe: "0000012345" }), { TipoEntrega: "02", KunnrWe: "", AddrnumberWe: "", ...VACIOS });
});

test("parametrosEntrega: envio a una direccion de un solo uso con un transportista que solo es proveedor", () => {
	const e: EntregaParaGuardar = { tipo: "01", kunnrWe: "0100024840", addrnumberWe: ENVIO_UNICO, direccionUnica: { nombre: "JYAS MOTORS", calle: "Av. Centenario 123" }, lifnrSp: "0000300123" };
	assert.deepEqual(parametrosEntrega(e), { ...VACIOS, TipoEntrega: "01", KunnrWe: "0100024840", AddrnumberWe: "$", DirecName1: "JYAS MOTORS", DirecStreet: "Av. Centenario 123", LifnrSp: "0000300123" });
});

test("parametrosEntrega: con una direccion del cliente no viaja texto de direccion, y con transportista ZT no viaja el SP", () => {
	const p = parametrosEntrega({ tipo: "01", kunnrWe: "0100024840", addrnumberWe: "0000045678", direccionUnica: { nombre: "X", calle: "Y" }, kunnrZt: "0100000777", addrnumberZt: "0000099999", lifnrSp: "0000300123" });
	assert.equal(p.DirecStreet, "");
	assert.equal(p.KunnrZt, "0100000777");
	assert.equal(p.AddrnumberZt, "0000099999");
	assert.equal(p.LifnrSp, "");
});

test("mismaEntrega: la entrega guardada, reabierta sin tocar, no cuenta como cambio aunque los numeros vengan sin ceros", () => {
	const guardada = entregaDeGuardados(datosGuardadosDe({ TipoEntrega: "01", KunnrWe: "0100024840", AddrnumberWe: "0000045678", KunnrZt: "0100000777", AddrnumberZt: "0000099999" }));
	assert.equal(mismaEntrega(guardada, { tipo: "01", kunnrWe: "100024840", addrnumberWe: "45678", kunnrZt: "0100000777", addrnumberZt: "0000099999" }), true);
	assert.equal(mismaEntrega({ tipo: "02" }, entregaDeGuardados(datosGuardadosDe({ TipoEntrega: "02" }))), true);
});

test("mismaEntrega: pasar de recojo a envio, cambiar la direccion o poner transportista si son cambios", () => {
	const base: EntregaParaGuardar = { tipo: "01", kunnrWe: "0100024840", addrnumberWe: "0000045678" };
	assert.equal(mismaEntrega({ tipo: "02" }, base), false);
	assert.equal(mismaEntrega(base, { ...base, addrnumberWe: "0000045679" }), false);
	assert.equal(mismaEntrega(base, { ...base, lifnrSp: "0000300123" }), false);
});

test("mismaEntrega: en la direccion de un solo uso cuenta la calle, no el nombre", () => {
	const guardada = entregaDeGuardados(datosGuardadosDe({ TipoEntrega: "01", KunnrWe: "0100024840", AddrnumberWe: ENVIO_UNICO, _Direc: [{ PartnRole: "WE", Street: "Av. Centenario 123" }] }));
	const pantalla: EntregaParaGuardar = { tipo: "01", kunnrWe: "0100024840", addrnumberWe: ENVIO_UNICO, direccionUnica: { nombre: "JYAS MOTORS", calle: "Av. Centenario 123" } };
	assert.equal(mismaEntrega(guardada, pantalla), true);
	assert.equal(mismaEntrega(guardada, { ...pantalla, direccionUnica: { nombre: "JYAS MOTORS", calle: "Jr. Ucayali 9" } }), false);
});

test("cambiarEntregaCotizacion llama la accion sobre la cotizacion activa con todos los parametros de entrega", async () => {
	const { modelo, llamadas, parametros } = crearModeloFalso({ comentario: "" });
	const r = await cambiarEntregaCotizacion(como(modelo), "COT-1", { tipo: "01", kunnrWe: "0100024840", addrnumberWe: "0000045678" });
	assert.equal(llamadas[0], `execute ${RUTA}`);
	assert.deepEqual(parametros[RUTA], { ...VACIOS, TipoEntrega: "01", KunnrWe: "0100024840", AddrnumberWe: "0000045678" });
	assert.equal(r.error, "");
});

test("cambiarEntregaCotizacion devuelve el motivo si SAP no acepto el cambio en una de las ofertas", async () => {
	const { modelo } = crearModeloFalso({ comentario: "[Entrega grupo 01] El interlocutor 300123 no esta definido" });
	const r = await cambiarEntregaCotizacion(como(modelo), "COT-1", { tipo: "02" });
	assert.equal(r.error, "[Entrega grupo 01] El interlocutor 300123 no esta definido");
});

test("cambiarEntregaCotizacion: el comentario del vendedor no es un error", async () => {
	const { modelo } = crearModeloFalso({ comentario: "Llamar antes de entregar" });
	assert.equal((await cambiarEntregaCotizacion(como(modelo), "COT-1", { tipo: "02" })).error, "");
});

test("cambiarEntregaCotizacion propaga el rechazo de la accion (grupo con pedido o en proceso)", async () => {
	const { modelo } = crearModeloFalso({ fallaExecute: ["cambiarEntrega"] });
	await assert.rejects(() => cambiarEntregaCotizacion(como(modelo), "COT-1", { tipo: "02" }), /rechazado/);
});

test("firmaLineas: solo cuentan material y cantidad de las lineas que no son regalo (lo recalculado al abrir no cuenta)", () => {
	const abierta = [
		{ material: "12N5L-BS-SI-SF", cantidad: 2, total: 100 },
		{ material: "REGALO-01", cantidad: 1, bonificacion: true }
	];
	const recalculada = [{ material: "12N5L-BS-SI-SF", cantidad: 2, total: 118 }];
	const otraCantidad = [{ material: "12N5L-BS-SI-SF", cantidad: 3 }];
	assert.equal(firmaLineas(abierta), firmaLineas(recalculada));
	assert.notEqual(firmaLineas(abierta), firmaLineas(otraCantidad));
});
