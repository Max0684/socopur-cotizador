import { test } from "node:test";
import assert from "node:assert/strict";
import { asignarVinItem, ATNAM_VARIANTE, crearPedidoGrupo, guardarCotizacion, leerEstadoPedido, leerVinsGrupo, liberarVinItem, renovarCotizacion, type GrupoParaGuardar, type OfertaParaGuardar } from "../webapp/model/CotizacionesService.ts";
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

test("guardarCotizacion: un vehiculo guarda su variante como caracteristica ZVARIANTE de la posicion", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001" }] });
	const g = grupo({ lineas: [{ material: "CAR200B", cantidad: 1, um: "UN", centro: "1008", almacen: "0008", precio: 9533.39, variante: "CAR200BCBU2025AZU" }] });
	await guardarCotizacion(como(modelo), oferta([g]));
	const car = creadas.find((c) => c.ruta === "_Car");
	assert.ok(car);
	assert.equal(car.datos.Atnam, ATNAM_VARIANTE);
	assert.equal(car.datos.Atwrt, "CAR200BCBU2025AZU");
	assert.equal("Posnr" in car.datos || "CotizId" in car.datos, false);
	assert.equal(ATNAM_VARIANTE, "ZVARIANTE");
	assert.equal(creadas.find((c) => c.ruta === "_Item")?.datos.Werks, "1008");
});

test("guardarCotizacion: una linea sin variante no crea caracteristicas", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001" }] });
	await guardarCotizacion(como(modelo), oferta());
	assert.equal(creadas.some((c) => c.ruta === "_Car"), false);
});

function modeloVin(item: Record<string, unknown>, filas: Record<string, unknown>[] = []) {
	const llamadas: string[] = [];
	const parametros: Record<string, unknown> = {};
	return {
		llamadas,
		parametros,
		modelo: {
			bindList(ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: { $filter?: string }) {
				llamadas.push(`list ${ruta} ${p?.$filter ?? ""}`);
				return { async requestContexts() { return filas.map((o) => ({ getObject: () => o })); } };
			},
			bindContext(ruta: string) {
				return {
					setParameter(n: string, v: unknown) { parametros[n] = v; },
					async execute() { llamadas.push(`execute ${ruta}`); },
					getBoundContext() { return { getObject: () => item }; }
				};
			}
		}
	};
}

test("asignarVinItem llama la accion con cuerpo (vacio si no se elige VIN) y devuelve el VIN asignado", async () => {
	const { modelo, llamadas, parametros } = modeloVin({ Posnr: "000010", Matnr: "CAR200B", Vhcle: "1000006683", Vhvin: "LF3HCM0X9SG004459", Color: "AZU", ColorTxt: "AZUL", Variante: "CAR200BCKD2025AZU" });
	const r = await asignarVinItem(como(modelo), "COT-1", "000010");
	assert.deepEqual(parametros, { Vhcle: "" });
	assert.ok(llamadas[0].startsWith("execute /Item(CotizId=COT-1,Posnr='000010',IsActiveEntity=true)/"));
	assert.ok(llamadas[0].endsWith(".asignarVin(...)"));
	assert.deepEqual(r, { posnr: "000010", material: "CAR200B", vhcle: "1000006683", vin: "LF3HCM0X9SG004459", color: "AZUL", variante: "CAR200BCKD2025AZU" });
	await asignarVinItem(como(modelo), "COT-1", "000010", "1000006685");
	assert.equal(parametros.Vhcle, "1000006685");
});

test("asignarVinItem propaga el rechazo de SAP", async () => {
	const { modelo } = modeloVin({});
	(modelo as { bindContext: (r: string) => unknown }).bindContext = () => ({ setParameter() {}, async execute() { throw new Error("No quedan unidades disponibles"); }, getBoundContext() { return { getObject: () => ({}) }; } });
	await assert.rejects(() => asignarVinItem(como(modelo), "COT-1", "000010"), /No quedan unidades/);
});

test("leerVinsGrupo devuelve solo los items de vehiculo (ZVEH) del grupo", async () => {
	const { modelo, llamadas } = modeloVin({}, [
		{ Posnr: "000010", Matnr: "CAR200B", Vhcle: "", Vhvin: "", Color: "", ColorTxt: "", Variante: "CAR200BCKD2025AZU", Mtart: "ZVEH" },
		{ Posnr: "000020", Matnr: "SFX428H-150-MTK", Vhcle: "", Vhvin: "", Color: "", ColorTxt: "", Variante: "", Mtart: "ZREP" }
	]);
	const r = await leerVinsGrupo(como(modelo), "COT-1", "01");
	assert.equal(r.length, 1);
	assert.equal(r[0].material, "CAR200B");
	assert.equal(r[0].vin, "");
	assert.ok(llamadas[0].includes("GrupoNo eq '01'"));
});

test("liberarVinItem llama la accion liberarVin sobre el item", async () => {
	const { modelo, llamadas } = modeloVin({});
	await liberarVinItem(como(modelo), "COT-1", "000010");
	assert.ok(llamadas[0].endsWith(".liberarVin(...)"));
});

test("renovarCotizacion llama la accion sobre la cotizacion activa y devuelve la vigencia de cada grupo", async () => {
	const { modelo, llamadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001", VigenciaHasta: "2026-10-10" } as never], comentario: "" });
	const r = await renovarCotizacion(como(modelo), "COT-1");
	assert.ok(llamadas[0].includes("/Cotizacion(CotizId=COT-1,IsActiveEntity=true)/") && llamadas[0].endsWith(".renovar(...)"));
	assert.deepEqual(r.grupos, [{ grupoNo: "01", vbelnOferta: "3100000001", vigenciaHasta: "2026-10-10" }]);
	assert.equal(r.error, "");
});

test("renovarCotizacion devuelve el motivo si SAP no pudo cambiar la oferta en el guardado", async () => {
	const { modelo } = crearModeloFalso({ gruposLeidos: [], comentario: "[Renovar grupo 01] Documento bloqueado" });
	const r = await renovarCotizacion(como(modelo), "COT-1");
	assert.equal(r.error, "[Renovar grupo 01] Documento bloqueado");
});

test("renovarCotizacion propaga el rechazo de la accion", async () => {
	const { modelo } = crearModeloFalso({ fallaExecute: ["renovar"] });
	await assert.rejects(() => renovarCotizacion(como(modelo), "COT-1"), /rechazado/);
});
