import { test } from "node:test";
import assert from "node:assert/strict";
import { crearPedidoGrupo, guardarCotizacion, leerEstadoPedido, type GrupoParaGuardar, type OfertaParaGuardar } from "../webapp/model/CotizacionesService.ts";
import { crearModeloFalso } from "./helpers/modeloFalso.ts";

function grupo(extra: Partial<GrupoParaGuardar> = {}): GrupoParaGuardar {
	return {
		vkorg: "1103",
		vtweg: "10",
		spart: "50",
		vkbur: "1101",
		claseOferta: "Z300",
		clasePedido: "Z323",
		modalidad: "rep_mayorista",
		lineas: [{ material: "SFX428H-150-MTK", cantidad: 100, um: "UN", centro: "1101", almacen: "0001", precio: 17.5 }],
		...extra
	};
}

function oferta(grupos: GrupoParaGuardar[] = [grupo()]): OfertaParaGuardar {
	return { kunnr: "0100024840", moneda: "PEN", comentario: "prueba", grupos };
}

// El modelo falso no es un ODataModel real: se convierte para el tipo del servicio.
const como = (m: unknown) => m as Parameters<typeof guardarCotizacion>[0];

test("guardarCotizacion sigue el orden verificado: cabecera, grupo, linea, Activate, generarOfertas, lectura", async () => {
	const { modelo, llamadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	const r = await guardarCotizacion(como(modelo), oferta());
	assert.deepEqual(llamadas.map((l) => l.split("(")[0]), [
		"create /Cotizacion",
		"create _Grupo",
		"create _Item",
		"execute com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.Activate",
		"execute /Cotizacion",
		"read /Cotizacion"
	]);
	assert.match(llamadas[4], /IsActiveEntity=true\)\/com\.sap\.gateway\.srvd_a2x\.yui_cotiz_srv\.v0001\.generarOfertas/);
	assert.deepEqual(r, { cotizId: "COT-1", ofertas: [{ grupoNo: "01", vbelnOferta: "3100007390" }] });
});

test("guardarCotizacion envia los decimales como texto y la moneda en cabecera y linea", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(modelo), oferta());
	assert.deepEqual(creadas[0].datos, { Kunnr: "0100024840", Waers: "PEN", Comentario: "prueba" });
	assert.deepEqual(creadas[1].datos, {
		Vkorg: "1103",
		Vtweg: "10",
		Spart: "50",
		Vkbur: "1101",
		AuartOferta: "Z300",
		AuartPedido: "Z323",
		Modalidad: "rep_mayorista"
	});
	assert.deepEqual(creadas[2].datos, {
		GrupoNo: "01",
		Matnr: "SFX428H-150-MTK",
		Cantidad: "100",
		Meins: "UN",
		Werks: "1101",
		Lgort: "0001",
		PrecioLista: "17.5",
		Waers: "PEN"
	});
});

test("guardarCotizacion: cada linea queda ligada al numero de grupo que SAP asigno", async () => {
	const dos = [grupo(), grupo({ vtweg: "12", lineas: [{ material: "OTRO", cantidad: 1, um: "UN", centro: "1101", almacen: "0001", precio: 5 }] })];
	const { modelo, creadas } = crearModeloFalso({
		gruposLeidos: [
			{ GrupoNo: "01", VbelnOferta: "3100007391" },
			{ GrupoNo: "02", VbelnOferta: "3100007392" }
		]
	});
	const r = await guardarCotizacion(como(modelo), oferta(dos));
	const items = creadas.filter((c) => c.ruta === "_Item");
	assert.deepEqual(items.map((i) => i.datos.GrupoNo), ["01", "02"]);
	assert.deepEqual(r.ofertas.map((o) => o.vbelnOferta), ["3100007391", "3100007392"]);
});

test("guardarCotizacion: si falla una linea descarta el borrador y no activa ni genera ofertas", async () => {
	const { modelo, llamadas } = crearModeloFalso({ fallaCreate: ["_Item"] });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta()), /rechazado/);
	assert.equal(llamadas.some((l) => l.includes("Discard")), true);
	assert.equal(llamadas.some((l) => l.includes("Activate")), false);
	assert.equal(llamadas.some((l) => l.includes("generarOfertas")), false);
});

test("guardarCotizacion: si falla Activate tambien descarta el borrador", async () => {
	const { modelo, llamadas } = crearModeloFalso({ fallaExecute: ["Activate"] });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta()), /Activate/);
	assert.equal(llamadas.some((l) => l.includes("Discard")), true);
	assert.equal(llamadas.some((l) => l.includes("generarOfertas")), false);
});

test("guardarCotizacion: si SAP rechaza la oferta (grupo sin numero) lanza el motivo del Comentario", async () => {
	const motivo = "Ventas de org.de ventas 1103, canal distr.10, centro 1103 no estan definidas";
	const { modelo } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "", Estado: "E" }], comentario: motivo });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta()), { message: motivo });
});

test("guardarCotizacion: sin numero y sin comentario usa un mensaje generico, nunca exito vacio", async () => {
	const { modelo } = crearModeloFalso({ gruposLeidos: [] });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta()), { message: "SAP no genero la oferta" });
});

test("crearPedidoGrupo llama la accion sobre el grupo activo y devuelve el pedido real", async () => {
	const { modelo, llamadas } = crearModeloFalso({ grupoDePedido: { VbelnPedido: "3300008230", Estado: "P", Liberacion: "" } });
	const r = await crearPedidoGrupo(como(modelo), "COT-1", "01");
	assert.match(llamadas[0], /^execute \/Grupo\(CotizId=COT-1,GrupoNo='01',IsActiveEntity=true\)\/.*crearPedido/);
	assert.deepEqual(r, { vbelnPedido: "3300008230", estado: "P", liberacion: "" });
});

test("crearPedidoGrupo: si SAP no genera pedido lanza el motivo de la cotizacion", async () => {
	const { modelo } = crearModeloFalso({ grupoDePedido: { VbelnPedido: "" }, comentario: "clase de pedido no prevista" });
	await assert.rejects(() => crearPedidoGrupo(como(modelo), "COT-1", "01"), { message: "clase de pedido no prevista" });
});

test("leerEstadoPedido devuelve el estado real de SAP", async () => {
	const estado = { CotizId: "COT-1", GrupoNo: "01", VbelnPedido: "3300008223", EstadoCredito: "B", BloqueoEntrega: "", BloqueoFactura: "", Liberado: "" };
	const { modelo, llamadas } = crearModeloFalso({ estado });
	assert.deepEqual(await leerEstadoPedido(como(modelo), "COT-1", "01"), estado);
	assert.match(llamadas[0], /^read \/GrupoEstado\(CotizId=COT-1,GrupoNo='01'\)$/);
});

test("leerEstadoPedido devuelve null si no se puede leer (no inventa un estado)", async () => {
	const { modelo } = crearModeloFalso({ estado: null });
	assert.equal(await leerEstadoPedido(como(modelo), "COT-1", "01"), null);
});

test("guardarCotizacion envia la forma de pago elegida en la cabecera", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(modelo), { ...oferta(), zterm: "C000" });
	assert.equal(creadas[0].datos.Zterm, "C000");
});

test("guardarCotizacion sin forma de pago no envia Zterm (SAP usa la del cliente)", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(modelo), { ...oferta(), zterm: "" });
	assert.equal("Zterm" in creadas[0].datos, false);
});
