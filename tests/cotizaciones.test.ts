import { test } from "node:test";
import assert from "node:assert/strict";
import { anularGrupo, asignarVinItem, datosGuardadosDe, ATNAM_VARIANTE, posicionMarcador, camposEntrega, ENVIO_UNICO, crearPedidoGrupo, esperarVinculos, guardarCotizacion, leerEstadoPedido, leerVinsGrupo, leerVinsLibres, OfertaEnProcesoError, liberarVinItem, renovarCotizacion, type GrupoParaGuardar, type OfertaParaGuardar } from "../webapp/model/CotizacionesService.ts";
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
	// Antes de la accion se lee el comentario de la cotizacion (para distinguir un rechazo nuevo de uno viejo).
	assert.match(llamadas.find((l) => l.startsWith("execute")) ?? "", /^execute \/Grupo\(CotizId=COT-1,GrupoNo='01',IsActiveEntity=true\)\/.*crearPedido/);
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

test("guardarCotizacion: el regalo Zeta viaja con Bonif Z y la posicion que SAP dio a su linea", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001" }] });
	const lineas = [
		{ material: "SFX-18X300-C051", cantidad: 25, um: "UN", centro: "1101", almacen: "0001", precio: 30 },
		{ material: "MPPA-ARP-HI-00001", cantidad: 2, um: "UN", centro: "1101", almacen: "0001", precio: 0, bonif: "Z" as const, padre: 0 }
	];
	await guardarCotizacion(como(modelo), oferta([grupo({ lineas })]));
	const items = creadas.filter((c) => c.ruta === "_Item");
	assert.equal("Bonif" in items[0].datos, false);
	assert.deepEqual([items[1].datos.Matnr, items[1].datos.Bonif, items[1].datos.PosnrPadre, items[1].datos.PrecioLista], ["MPPA-ARP-HI-00001", "Z", "000010", "0"]);
});

test("guardarCotizacion: un regalo Zeta sin la posicion de su linea no se envia (iria como venta a precio 0)", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001" }] });
	const lineas = [
		{ material: "A", cantidad: 1, um: "UN", centro: "1101", almacen: "0001", precio: 10 },
		{ material: "HUERFANO", cantidad: 1, um: "UN", centro: "1101", almacen: "0001", precio: 0, bonif: "Z" as const, padre: 5 }
	];
	await guardarCotizacion(como(modelo), oferta([grupo({ lineas })]));
	assert.deepEqual(
		creadas.filter((c) => c.ruta === "_Item").map((c) => c.datos.Matnr),
		["A"]
	);
});

test("guardarCotizacion: una linea sin variante no crea caracteristicas", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001" }] });
	await guardarCotizacion(como(modelo), oferta());
	assert.equal(creadas.some((c) => c.ruta === "_Car"), false);
});

function modeloVin(item: Record<string, unknown>, filas: Record<string, unknown>[] = [], porRuta: Record<string, Record<string, unknown>[]> = {}) {
	const llamadas: string[] = [];
	const parametros: Record<string, unknown> = {};
	return {
		llamadas,
		parametros,
		modelo: {
			bindList(ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: { $filter?: string }) {
				llamadas.push(`list ${ruta} ${p?.$filter ?? ""}`);
				const clave = Object.keys(porRuta).find((k) => ruta.endsWith(k));
				const lista = clave ? porRuta[clave] : filas;
				return { async requestContexts() { return lista.map((o) => ({ getObject: () => o })); } };
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

test("leerVinsGrupo devuelve solo los items de vehiculo (material ZVEH) del grupo, leyendo el tipo de Material", async () => {
	const { modelo, llamadas } = modeloVin(
		{},
		[
			{ Posnr: "000010", Matnr: "CAR200B", Vhcle: "", Vhvin: "", Color: "", ColorTxt: "", Variante: "CAR200BCKD2025AZU" },
			{ Posnr: "000020", Matnr: "SFX428H-150-MTK", Vhcle: "", Vhvin: "", Color: "", ColorTxt: "", Variante: "" }
		],
		{
			"/_Grupo": [{ Vkorg: "1101", Vtweg: "11" }],
			"/Material": [
				{ Matnr: "CAR200B", Mtart: "ZVEH" },
				{ Matnr: "SFX428H-150-MTK", Mtart: "ZREP" }
			]
		}
	);
	const r = await leerVinsGrupo(como(modelo), "COT-1", "01");
	assert.equal(r.length, 1);
	assert.equal(r[0].material, "CAR200B");
	assert.equal(r[0].vin, "");
	assert.ok(llamadas[0].includes("GrupoNo eq '01'"));
	assert.ok(llamadas.some((l) => l.startsWith("list /Material Vkorg eq '1101' and Vtweg eq '11' and (Matnr eq 'CAR200B' or Matnr eq 'SFX428H-150-MTK')")));
});

test("leerVinsLibres ordena por fecha de ingreso y luego Vhcle, y sin fecha del servicio ordena por Vhcle", async () => {
	const filas = [
		{ Vhcle: "1000000030", Vhvin: "V30", ColorTxt: "ROJO", Condicion: "CBU", AnoModelo: "2025", Variante: "X", Lgort: "0004", IngresoFecha: "2025-12-16" },
		{ Vhcle: "1000000020", Vhvin: "V20", ColorTxt: "ROJO", Condicion: "CBU", AnoModelo: "2025", Variante: "X", Lgort: "0004", IngresoFecha: "2025-12-16" },
		{ Vhcle: "1000000040", Vhvin: "V40", ColorTxt: "ROJO", Condicion: "CBU", AnoModelo: "2025", Variante: "X", Lgort: "0004", IngresoFecha: "2025-09-26" }
	];
	const { modelo, llamadas } = modeloVin({}, filas);
	const r = await leerVinsLibres(como(modelo), { vkorg: "1101", vtweg: "11", matnr: "DU200Z0", werks: "1101" });
	assert.deepEqual(r.map((v) => v.vin), ["V40", "V20", "V30"]);
	assert.equal(r[0].ingreso, "2025-09-26");
	assert.ok(llamadas[0].includes("Vkorg eq '1101' and Vtweg eq '11' and Matnr eq 'DU200Z0' and Werks eq '1101'"));
	const sinFecha = modeloVin({}, filas.map(({ IngresoFecha: _f, ...resto }) => resto));
	const r2 = await leerVinsLibres(como(sinFecha.modelo), { vkorg: "1101", vtweg: "11", matnr: "DU200Z0", werks: "1101" });
	assert.deepEqual(r2.map((v) => v.vin), ["V20", "V30", "V40"]);
	assert.equal(r2[0].ingreso, "");
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

const sinPausa = { intervaloMs: 1, maximoMs: 5, pausa: async () => {} };

test("guardarCotizacion espera a que termine un grupo en proceso (vehiculo) y devuelve su oferta", async () => {
	const { modelo } = crearModeloFalso({
		secuenciaGrupos: [[{ GrupoNo: "01", VbelnOferta: "", Estado: "Q" }], [{ GrupoNo: "01", VbelnOferta: "", Estado: "Q" }], [{ GrupoNo: "01", VbelnOferta: "3100000009", Estado: "O" }]]
	});
	const r = await guardarCotizacion(como(modelo), oferta(), { intervaloMs: 1, maximoMs: 100, pausa: async () => {} });
	assert.deepEqual(r.ofertas, [{ grupoNo: "01", vbelnOferta: "3100000009" }]);
});

test("guardarCotizacion: si el grupo sigue en proceso al agotar la espera lo dice y no inventa un numero", async () => {
	const { modelo } = crearModeloFalso({ secuenciaGrupos: [[{ GrupoNo: "01", VbelnOferta: "", Estado: "Q" }]] });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta(), sinPausa), (e: Error) => e instanceof OfertaEnProcesoError && /sigue en proceso/.test(e.message));
});

test("guardarCotizacion: un grupo con error de segundo plano lanza el motivo del Comentario", async () => {
	const { modelo } = crearModeloFalso({ secuenciaGrupos: [[{ GrupoNo: "01", VbelnOferta: "", Estado: "E" }]], comentario: "[Oferta grupo 01] material sin precio" });
	await assert.rejects(() => guardarCotizacion(como(modelo), oferta(), sinPausa), /\[Oferta grupo 01\] material sin precio/);
});

test("guardarCotizacion: los repuestos (sin grupo en proceso) no esperan", async () => {
	let pausas = 0;
	const { modelo } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100000001", Estado: "O" }] });
	await guardarCotizacion(como(modelo), oferta(), { pausa: async () => { pausas++; } });
	assert.equal(pausas, 0);
});

test("crearPedidoGrupo espera a que termine un pedido de vehiculo en segundo plano (Estado P)", async () => {
	const { modelo } = crearModeloFalso({
		grupoDePedido: { Estado: "P", VbelnPedido: "", Liberacion: "" },
		secuenciaPedido: [{ Estado: "P", VbelnPedido: "" }, { Estado: "P", VbelnPedido: "3300008300", Liberacion: "X" }]
	});
	const r = await crearPedidoGrupo(como(modelo), "COT-1", "01", { intervaloMs: 1, maximoMs: 100, pausa: async () => {} });
	assert.equal(r.vbelnPedido, "3300008300");
});

test("crearPedidoGrupo: si el pedido de vehiculo falla en segundo plano (vuelve a O) lanza el motivo del Comentario", async () => {
	const { modelo } = crearModeloFalso({
		grupoDePedido: { Estado: "P", VbelnPedido: "" },
		secuenciaPedido: [{ Estado: "O", VbelnPedido: "" }],
		comentario: "[Pedido grupo 01] sin credito"
	});
	await assert.rejects(() => crearPedidoGrupo(como(modelo), "COT-1", "01", sinPausa), /\[Pedido grupo 01\] sin credito/);
});

test("crearPedidoGrupo: si el pedido sigue en proceso al agotar la espera lo dice", async () => {
	const { modelo } = crearModeloFalso({ grupoDePedido: { Estado: "P", VbelnPedido: "" }, secuenciaPedido: [{ Estado: "P", VbelnPedido: "" }] });
	await assert.rejects(() => crearPedidoGrupo(como(modelo), "COT-1", "01", sinPausa), (e: Error) => e instanceof OfertaEnProcesoError);
});

test("crearPedidoGrupo: el Estado queda en P aunque SAP rechace el pedido; se detecta por el Comentario y no se espera el minuto (caso sin stock disponible en el almacen 0004)", async () => {
	const { modelo } = crearModeloFalso({
		grupoDePedido: { Estado: "P", VbelnPedido: "" },
		secuenciaPedido: [{ Estado: "P", VbelnPedido: "" }],
		comentario: "[Pedido grupo 01] Material SFX-18X300-C051 no tiene stock disponible"
	});
	let esperas = 0;
	const contar = async (): Promise<void> => {
		esperas++;
	};
	await assert.rejects(() => crearPedidoGrupo(como(modelo), "COT-1", "01", { ...sinPausa, pausa: contar }), (e: Error) => !(e instanceof OfertaEnProcesoError) && /no tiene stock disponible/.test(e.message));
	assert.ok(esperas <= 4, `espero ${esperas} veces en vez de cortar`);
});

test("guardarCotizacion envia el PERNR del vendedor si el servicio ya publica Cotizacion/Pernr", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/Pernr"] });
	await guardarCotizacion(como(modelo), { ...oferta(), pernr: "99000103" });
	assert.equal(creadas[0].datos.Pernr, "99000103");
});

test("guardarCotizacion no envia Pernr si el servicio no lo publica o no hay vendedor", async () => {
	const sinCampo = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(sinCampo.modelo), { ...oferta(), pernr: "99000103" });
	assert.equal("Pernr" in sinCampo.creadas[0].datos, false);

	const sinVendedor = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/Pernr"] });
	await guardarCotizacion(como(sinVendedor.modelo), { ...oferta(), pernr: "" });
	assert.equal("Pernr" in sinVendedor.creadas[0].datos, false);
});

test("guardarCotizacion envia la condicion de expedicion (Vsbed) elegida si el servicio la publica", async () => {
	const { modelo, creadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/Vsbed"] });
	await guardarCotizacion(como(modelo), { ...oferta(), vsbed: "01" });
	assert.equal(creadas[0].datos.Vsbed, "01");
});

test("guardarCotizacion no envia Vsbed si esta vacia o el servicio no la publica", async () => {
	const vacia = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/Vsbed"] });
	await guardarCotizacion(como(vacia.modelo), { ...oferta(), vsbed: "" });
	assert.equal("Vsbed" in vacia.creadas[0].datos, false);

	const sinCampo = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(sinCampo.modelo), { ...oferta(), vsbed: "01" });
	assert.equal("Vsbed" in sinCampo.creadas[0].datos, false);
});

const vin = (posnr: string, vinculo?: string) => ({ posnr, material: "AD250Z0", vhcle: "1000000134", vin: "VBKJ", color: "", variante: "", ...(vinculo === undefined ? {} : { vinculo }) });

test("esperarVinculos espera a que el VIN pase de pendiente a vinculado", async () => {
	const lecturas = [[vin("000010", "P")], [vin("000010", "")], [vin("000010", "V")]];
	let n = 0;
	const pausas: number[] = [];
	const r = await esperarVinculos(async () => lecturas[Math.min(n++, lecturas.length - 1)], { intervaloMs: 10, pausa: async (ms) => void pausas.push(ms) });
	assert.equal(r.get("000010"), "V");
	assert.equal(n, 3);
	assert.equal(pausas.length, 2);
});

test("esperarVinculos devuelve el error sin seguir esperando y trata el vinculo vacio como pendiente", async () => {
	const error = await esperarVinculos(async () => [vin("000010", "E"), vin("000020", "V")], { pausa: async () => undefined });
	assert.equal(error.get("000010"), "E");
	assert.equal(error.get("000020"), "V");
	const pendiente = await esperarVinculos(async () => [vin("000010", "")], { intervaloMs: 10, maximoMs: 20, pausa: async () => undefined });
	assert.equal(pendiente.get("000010"), "P");
});

test("esperarVinculos sin VIN o sin el campo del servicio no espera", async () => {
	assert.equal((await esperarVinculos(async () => [], { pausa: async () => undefined })).size, 0);
	let veces = 0;
	const sinCampo = await esperarVinculos(async () => { veces++; return [{ ...vin("000010"), vhcle: "" }]; }, { pausa: async () => undefined });
	assert.equal(sinCampo.size, 0);
	assert.equal(veces, 1);
});

test("camposEntrega: con envio viajan WE y ZT; con recojo solo el tipo; sin entrega nada", () => {
	assert.deepEqual(camposEntrega(undefined), {});
	assert.deepEqual(camposEntrega({ tipo: "02", kunnrWe: "0100000001", addrnumberWe: "55" }), { TipoEntrega: "02" });
	assert.deepEqual(camposEntrega({ tipo: "01", kunnrWe: "0100000001", addrnumberWe: "55", kunnrZt: "0100000009", addrnumberZt: "77" }), {
		TipoEntrega: "01",
		KunnrWe: "0100000001",
		AddrnumberWe: "55",
		KunnrZt: "0100000009",
		AddrnumberZt: "77"
	});
	assert.deepEqual(camposEntrega({ tipo: "01", kunnrWe: "0100000001", addrnumberWe: "55", kunnrZt: "0100000009" }).AddrnumberZt, "");
	assert.equal("KunnrWe" in camposEntrega({ tipo: "01", kunnrWe: "0100000001" }), false);
});

test("guardarCotizacion envia la entrega solo si el servicio publica los campos WE/ZT", async () => {
	const entrega = { tipo: "01" as const, kunnrWe: "0100024840", addrnumberWe: "55", kunnrZt: "0100000009", addrnumberZt: "77" };
	const con = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/AddrnumberWe"] });
	await guardarCotizacion(como(con.modelo), { ...oferta(), entrega });
	assert.equal(con.creadas[0].datos.TipoEntrega, "01");
	assert.equal(con.creadas[0].datos.AddrnumberWe, "55");
	assert.equal(con.creadas[0].datos.KunnrZt, "0100000009");
	const sin = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(sin.modelo), { ...oferta(), entrega });
	assert.equal("TipoEntrega" in sin.creadas[0].datos, false);
});

test("guardarCotizacion: direccion de un solo uso crea la fila Direc con rol WE antes de los grupos", async () => {
	const { modelo, creadas, llamadas } = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/AddrnumberWe"] });
	await guardarCotizacion(como(modelo), { ...oferta(), entrega: { tipo: "01", kunnrWe: "0100024840", addrnumberWe: ENVIO_UNICO, direccionUnica: { nombre: "Cliente SA", calle: "Av. Prueba 123" } } });
	assert.equal(creadas[0].datos.AddrnumberWe, "$");
	assert.deepEqual(creadas[1].datos, { PartnRole: "WE", Name1: "Cliente SA", Street: "Av. Prueba 123", Country: "PE" });
	assert.deepEqual(llamadas.slice(0, 3).map((l) => l.split("(")[0]), ["create /Cotizacion", "create _Direc", "create _Grupo"]);
});

test("posicionMarcador: el grupo '1' del servicio coincide con '[Anular grupo 01]' del job y toma el ultimo marcador", () => {
	const texto = "x [Anular grupo 01] viejo | y [Anular grupo 01] La clase Z311 no es de vehiculos";
	assert.equal(posicionMarcador(texto, "Anular grupo", "1"), texto.lastIndexOf("[Anular grupo 01]"));
	assert.equal(posicionMarcador(texto, "Anular grupo", "01"), texto.lastIndexOf("[Anular grupo 01]"));
	assert.equal(posicionMarcador(texto, "Anular grupo", "2"), -1);
	assert.equal(posicionMarcador("[Anular grupo 10] a", "Anular grupo", "1"), -1);
	assert.equal(posicionMarcador("sin marcador", "Pedido grupo", "1"), -1);
});

test("anularGrupo: el motivo del job sale aunque el grupo sea '1' y el marcador diga 01", async () => {
	const modelo = {
		bindContext(ruta: string) {
			return {
				setParameter: () => undefined,
				execute: async () => undefined,
				getBoundContext: () => ({ getObject: () => ({ Estado: "Y" }) }),
				requestObject: async () =>
					ruta.includes("/Grupo(") ? { Estado: "R" } : { Comentario: "[Anular grupo 01] La clase Z311 no es de vehiculos (solo Z112/Z116)" }
			};
		}
	};
	const r = await anularGrupo(como(modelo), "COT-1", "1", "prueba", { pausa: async () => undefined, intervaloMs: 1 });
	assert.equal(r.estado, "R");
	assert.match(r.mensaje, /La clase Z311 no es de vehiculos/);
});

test("datosGuardadosDe: oferta con envio vuelve a mostrar destinatario, transportista, forma de pago, fecha y modalidad", () => {
	const d = datosGuardadosDe({
		TipoEntrega: "01",
		Vsbed: "01",
		FechaEntrega: "2026-10-20T00:00:00Z",
		Zterm: "C030",
		KunnrWe: "0100025848",
		AddrnumberWe: "0000012345",
		KunnrZt: "0100030001",
		AddrnumberZt: "0000054321",
		_Grupo: [{ GrupoNo: "1", VbelnOferta: "3100007401", Modalidad: "rep_mayorista" }]
	});
	assert.equal(d.entrega, "envio");
	assert.equal(d.vsbed, "01");
	assert.equal(d.fechaEntrega, "2026-10-20");
	assert.equal(d.zterm, "C030");
	assert.equal(d.kunnrWe, "0100025848");
	assert.equal(d.addrnumberWe, "0000012345");
	assert.equal(d.kunnrZt, "0100030001");
	assert.equal(d.addrnumberZt, "0000054321");
	assert.deepEqual(d.grupos, [{ grupoNo: "1", vbelnOferta: "3100007401", modalidad: "rep_mayorista" }]);
});

test("camposEntrega: el transportista que solo es proveedor viaja como LifnrSp (interlocutor SP), sin KunnrZt", () => {
	const c = camposEntrega({ tipo: "01", kunnrWe: "0100000001", addrnumberWe: "55", lifnrSp: "0000012345" });
	assert.equal(c.LifnrSp, "0000012345");
	assert.equal("KunnrZt" in c, false);
	assert.equal("LifnrSp" in camposEntrega({ tipo: "02", lifnrSp: "0000012345" }), false);
});

test("guardarCotizacion envia LifnrSp solo si el servicio lo publica (un campo desconocido haria rechazar la oferta)", async () => {
	const entrega = { tipo: "01" as const, kunnrWe: "0100000001", addrnumberWe: "55", lifnrSp: "0000012345" };
	const con = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/AddrnumberWe", "Cotizacion/LifnrSp"] });
	await guardarCotizacion(como(con.modelo), { ...oferta(), entrega });
	assert.equal(con.creadas[0].datos.LifnrSp, "0000012345");
	const sin = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/AddrnumberWe"] });
	await guardarCotizacion(como(sin.modelo), { ...oferta(), entrega });
	assert.equal("LifnrSp" in sin.creadas[0].datos, false);
	assert.equal(sin.creadas[0].datos.KunnrWe, "0100000001");
});

test("datosGuardadosDe: devuelve el transportista proveedor (LifnrSp) para volver a mostrarlo", () => {
	assert.equal(datosGuardadosDe({ TipoEntrega: "01", LifnrSp: "0000012345" }).lifnrSp, "0000012345");
	assert.equal(datosGuardadosDe({ TipoEntrega: "01" }).lifnrSp, "");
});

test("datosGuardadosDe: recojo no trae destinatario ni transportista y la condicion de expedicion sale 02", () => {
	const d = datosGuardadosDe({ TipoEntrega: "02", Zterm: "C000" });
	assert.equal(d.entrega, "recojo");
	assert.equal(d.vsbed, "02");
	assert.equal(d.kunnrZt, "");
	assert.equal(d.fechaEntrega, "");
	assert.deepEqual(d.grupos, []);
});

test("datosGuardadosDe: sin TipoEntrega se toma de la condicion de expedicion (01 = envio)", () => {
	assert.equal(datosGuardadosDe({ Vsbed: "01" }).entrega, "envio");
	assert.equal(datosGuardadosDe({}).entrega, "recojo");
});

test("datosGuardadosDe: direccion de un solo uso sale de la fila Direc con rol WE", () => {
	const d = datosGuardadosDe({ TipoEntrega: "01", AddrnumberWe: ENVIO_UNICO, _Direc: [{ PartnRole: "RE", Street: "AV. OTRA 1" }, { PartnRole: "WE", Street: "JR. LOS OLIVOS 123" }] });
	assert.equal(d.addrnumberWe, ENVIO_UNICO);
	assert.equal(d.direccionUnica, "JR. LOS OLIVOS 123");
});

test("guardarCotizacion envia el correo BTP solo si el servicio publica Cotizacion/UsuarioBtp", async () => {
	const con = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }], camposPublicados: ["Cotizacion/UsuarioBtp"] });
	await guardarCotizacion(como(con.modelo), { ...oferta(), usuarioBtp: "vendedora@socopur.pe" });
	assert.equal(con.creadas[0].datos.UsuarioBtp, "vendedora@socopur.pe");
	const sin = crearModeloFalso({ gruposLeidos: [{ GrupoNo: "01", VbelnOferta: "3100007390" }] });
	await guardarCotizacion(como(sin.modelo), { ...oferta(), usuarioBtp: "vendedora@socopur.pe" });
	assert.equal("UsuarioBtp" in sin.creadas[0].datos, false);
});

test("asignarVinItem manda UsuarioBtp solo si la accion lo publica en el $metadata", async () => {
	const item = { Posnr: "000010", Matnr: "CAR200B", Vhcle: "1000006683" };
	const sin = modeloVin(item);
	await asignarVinItem(como(sin.modelo), "COT-1", "000010", "1000006683", "vendedora@socopur.pe");
	assert.deepEqual(sin.parametros, { Vhcle: "1000006683" });
	const con = modeloVin(item);
	const sobrecarga = "/Item/com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001.asignarVin/@$ui5.overload/0/$Parameter";
	const lista = [{ $Name: "_it" }, { $Name: "Vhcle" }, { $Name: "UsuarioBtp" }];
	(con.modelo as Record<string, unknown>).getMetaModel = () => ({ requestObject: async (ruta: string) => (ruta === sobrecarga ? lista : undefined) });
	await asignarVinItem(como(con.modelo), "COT-1", "000010", "1000006683", "vendedora@socopur.pe");
	assert.deepEqual(con.parametros, { Vhcle: "1000006683", UsuarioBtp: "vendedora@socopur.pe" });
	// Sin correo igual se manda (vacio): SAP marca el parametro como obligatorio y rechaza la accion si falta.
	await asignarVinItem(como(con.modelo), "COT-1", "000010", "1000006683");
	assert.equal(con.parametros.UsuarioBtp, "");
});

test("accionTieneParametro lee la lista de parametros de la accion, no un campo de la entidad con el mismo nombre", async () => {
	const { accionTieneParametro } = await import("../webapp/model/CamposServicio.ts");
	const NS = "com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001";
	const modelo = {
		getMetaModel: () => ({
			requestObject: async (ruta: string) =>
				ruta === `/Cotizacion/${NS}.generarOfertas/@$ui5.overload/0/$Parameter` ? [{ $Name: "_it" }] : ruta.endsWith("/$Parameter/UsuarioBtp") ? { $kind: "Property" } : undefined
		})
	};
	assert.equal(await accionTieneParametro(como(modelo), "Cotizacion", `${NS}.generarOfertas`, "UsuarioBtp"), false);
});
