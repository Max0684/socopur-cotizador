import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Historial de una cotizacion (entidad CotizCambio = tabla YCOTIZ_LOG). Lo escribe SAP en cada guardado: quien (correo BTP), cuando,
 * que operacion y que dato cambio con su valor antes y despues. El front solo lo lee.
 */
export interface CambioSap {
	CotizId: string;
	LogId: string;
	/** UTC (Edm.DateTimeOffset). */
	CreadoEn?: string;
	UsuarioBtp?: string;
	Pernr?: string;
	UsuarioSap?: string;
	/** COTIZACION, GRUPO o ITEM. */
	Entidad?: string;
	/** Grupo ("01") o posicion ("10") segun la entidad. */
	Referencia?: string;
	Operacion?: string;
	/** Nombre del campo en mayusculas (KUNNR, CANTIDAD...). */
	Campo?: string;
	ValorAntes?: string;
	ValorDespues?: string;
}

export interface FilaHistorial {
	/** ISO; vacio si SAP no lo trajo. */
	fecha: string;
	/** Correo BTP; si no viajo (version anterior del front), el usuario SAP. */
	usuario: string;
	conCorreo: boolean;
	vendedor: string;
	operacion: string;
	entidad: string;
	referencia: string;
	campo: string;
	antes: string;
	despues: string;
}

/** Textos de pantalla: clave i18n y sus parametros. Se pasa desde el controlador para que el servicio no dependa de UI5. */
export type Textos = (clave: string, parametros?: string[]) => string;

export function filaHistorial(c: CambioSap): FilaHistorial {
	const correo = (c.UsuarioBtp ?? "").trim();
	return {
		fecha: c.CreadoEn ?? "",
		usuario: correo || (c.UsuarioSap ?? "").trim(),
		conCorreo: !!correo,
		vendedor: (c.Pernr ?? "").replace(/^0+/, ""),
		operacion: (c.Operacion ?? "").trim(),
		entidad: (c.Entidad ?? "").trim(),
		referencia: (c.Referencia ?? "").trim(),
		campo: (c.Campo ?? "").trim(),
		antes: (c.ValorAntes ?? "").trim(),
		despues: (c.ValorDespues ?? "").trim()
	};
}

/** Mas reciente primero; a igual hora se respeta el orden en que SAP los devolvio. */
export function ordenarHistorial(filas: FilaHistorial[]): FilaHistorial[] {
	return filas
		.map((f, i) => ({ f, i }))
		.sort((a, b) => (a.f.fecha === b.f.fecha ? a.i - b.i : a.f.fecha < b.f.fecha ? 1 : -1))
		.map((x) => x.f);
}

/** Campos con nombre de pantalla; el resto se muestra tal cual. */
const CAMPOS: Record<string, string> = {
	KUNNR: "historialCampoCliente",
	PERNR: "historialCampoVendedor",
	WAERS: "historialCampoMoneda",
	ZTERM: "historialCampoFormaPago",
	COMENTARIO: "historialCampoComentario",
	MATNR: "historialCampoMaterial",
	CANTIDAD: "historialCampoCantidad",
	PRECIOLISTA: "historialCampoPrecio",
	WERKS: "historialCampoCentro",
	LGORT: "historialCampoAlmacen",
	VHCLE: "historialCampoVin",
	ESTADO: "historialCampoEstado",
	VIGENCIAHASTA: "historialCampoVigencia",
	MODALIDAD: "historialCampoModalidad",
	KUNNRWE: "historialCampoDestinatario",
	KUNNRZT: "historialCampoTransportista",
	LIFNRSP: "historialCampoTransportista",
	FECHAENTREGA: "historialCampoEntrega",
	VBELNOFERTA: "historialCampoOferta",
	VBELNPEDIDO: "historialCampoPedido"
};

const OPERACIONES = ["CREAR", "MODIFICAR", "BORRAR", "GENERAR_OFERTAS", "OFERTA_CREADA", "CREAR_PEDIDO", "PEDIDO_CREADO", "ANULAR", "RENOVAR", "ASIGNAR_VIN", "LIBERAR_VIN"];

export function textoOperacion(operacion: string, t: Textos): string {
	return OPERACIONES.includes(operacion) ? t(`historialOp_${operacion}`) : operacion;
}

/** Donde paso: "Cotizacion", "Grupo 01" o "Linea 10". */
export function textoLugar(fila: FilaHistorial, t: Textos): string {
	if (fila.entidad === "GRUPO") {
		return t("historialLugarGrupo", [fila.referencia]);
	}
	if (fila.entidad === "ITEM") {
		return t("historialLugarLinea", [fila.referencia]);
	}
	return t("historialLugarCotizacion");
}

/** Que cambio, en una linea: el valor nuevo de un alta, el anterior de una baja o "campo: antes -> despues". */
export function textoDetalle(fila: FilaHistorial, t: Textos): string {
	const campo = CAMPOS[fila.campo] ? t(CAMPOS[fila.campo]) : fila.campo;
	switch (fila.operacion) {
		case "CREAR":
		case "OFERTA_CREADA":
		case "PEDIDO_CREADO":
		case "ASIGNAR_VIN":
			return fila.despues ? `${campo}: ${fila.despues}` : "";
		case "BORRAR":
		case "LIBERAR_VIN":
			return fila.antes ? `${campo}: ${fila.antes}` : "";
		case "ANULAR":
			return fila.despues ? t("historialMotivo", [fila.despues]) : "";
		case "GENERAR_OFERTAS":
		case "CREAR_PEDIDO":
			return "";
		default:
			return `${campo}: ${fila.antes || "—"} → ${fila.despues || "—"}`;
	}
}

/** El servicio publica el historial (SAP del 28/10/2026 en adelante). La misma version reserva el VIN en la oferta antes del pedido. */
export function historialPublicado(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "CotizCambio", "LogId");
}

export async function leerHistorial(modelo: ODataModel, cotizId: string): Promise<FilaHistorial[]> {
	const contextos = await modelo
		.bindList("/CotizCambio", undefined, undefined, undefined, { $filter: `CotizId eq ${cotizId}`, $orderby: "CreadoEn desc" })
		.requestContexts(0, 500);
	return ordenarHistorial(contextos.map((c) => filaHistorial(c.getObject() as CambioSap)));
}
