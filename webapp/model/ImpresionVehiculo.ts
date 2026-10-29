/**
 * Formato simple de la oferta de vehiculos (Propuesta Formato Vehiculo V1 de Socopur). Los datos los arma SAP
 * (YCL_COTIZ_IMPRESION->vehiculo, entidad OfertaImpresion) y aqui solo se dibujan; se imprime o guarda como PDF desde el
 * navegador.
 */
export interface DatoFicha {
	etiqueta: string;
	valor: string;
}

export interface LineaVehiculo {
	numero: number;
	codigo: string;
	descripcion: string;
	marca: string;
	unidad: string;
	cantidad: number;
	vin?: string;
	ficha: DatoFicha[];
}

export interface CuentaBancaria {
	banco: string;
	soles: string;
	dolares: string;
}

export interface DatosVehiculo {
	empresa: string;
	dirFiscal: string;
	dirEmision: string;
	telefono: string;
	impresoFecha: string;
	impresoHora: string;
	numero: string;
	/** aaaa-mm-dd */
	fecha: string;
	validoHasta: string;
	cliente: string;
	documento: string;
	correoCliente: string;
	celularCliente: string;
	dirFactura: string;
	dirLlegada: string;
	vendedor: string;
	correoVendedor: string;
	celularVendedor: string;
	tienda: string;
	condicionPago: string;
	moneda: string;
	transportista: string;
	observacion: string;
	valorVenta: number;
	isc: number;
	igv: number;
	precioVenta: number;
	lineas: LineaVehiculo[];
	cuentas: CuentaBancaria[];
}

/** Textos fijos del formato (vienen del i18n del Cotizador). */
export interface TextosVehiculo {
	[clave: string]: string;
}

const esc = (t: unknown): string =>
	String(t ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/** aaaa-mm-dd a dd/mm/aaaa; si no viene con ese formato, tal cual. */
export function fechaDdMmAaaa(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
	return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? "");
}

export function montoTexto(valor: number): string {
	return Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function simboloMoneda(moneda: string): string {
	return moneda === "USD" ? "US$" : moneda === "PEN" || !moneda ? "S/" : moneda;
}

/** HTML del formato, listo para la vista previa y para imprimir. logo: direccion absoluta de la imagen. */
export function htmlVehiculo(d: DatosVehiculo, t: TextosVehiculo, logo: string): string {
	const celda = "padding:2px 6px;vertical-align:top;";
	const etiqueta = `${celda}white-space:nowrap;`;
	const borde = "border:1px solid #444;";
	const fila = (e: string, v: string): string => `<tr><td style="${etiqueta}">${esc(e)}:</td><td style="${celda}">${esc(v)}</td></tr>`;
	const lineas = d.lineas
		.map(
			(l) =>
				`<tr><td style="${celda}">${l.numero}</td><td style="${celda}">${esc(l.codigo)}</td><td style="${celda}">${esc(l.descripcion)}${l.vin ? `<br/><span style="font-size:10px">VIN ${esc(l.vin)}</span>` : ""}</td><td style="${celda}">${esc(l.marca)}</td><td style="${celda}">${esc(l.unidad)}</td><td style="${celda}text-align:right">${Number(l.cantidad || 0).toLocaleString("es-PE")}</td></tr>`
		)
		.join("");
	const fichas = d.lineas
		.filter((l) => l.ficha.length > 0)
		.map(
			(l) =>
				`<table style="border-collapse:collapse;width:100%;margin-bottom:6px;${borde}"><tr><th colspan="2" style="${celda}${borde}text-align:center;font-weight:normal">${esc(t.caracteristicas)}${d.lineas.length > 1 ? ` · ${esc(l.codigo)}` : ""}</th></tr>${l.ficha
					.map((f) => `<tr><td style="${celda}${borde}font-size:10px">${esc(f.etiqueta)}</td><td style="${celda}${borde}">${esc(f.valor)}</td></tr>`)
					.join("")}</table>`
		)
		.join("");
	const simbolo = simboloMoneda(d.moneda);
	const totales = [
		[t.valorVenta, montoTexto(d.valorVenta)],
		[t.isc, montoTexto(d.isc)],
		[t.igv, montoTexto(d.igv)]
	]
		.map(([e, v]) => `<tr><td style="${celda}">${esc(e)}:</td><td style="${celda}text-align:right">${esc(v)}</td></tr>`)
		.join("");
	const cuentas = d.cuentas.length
		? `<p style="margin:14px 0 4px">${esc(t.tipoCambio)}</p><table style="border-collapse:collapse;width:60%;text-align:center;font-size:10px"><tr><th colspan="3" style="${celda}${borde}font-weight:normal">${esc(t.cuentas)}</th></tr><tr><th style="${celda}${borde}">${esc(t.banco)}</th><th style="${celda}${borde}">${esc(t.cuentaSoles)}</th><th style="${celda}${borde}">${esc(t.cuentaDolares)}</th></tr>${d.cuentas
				.map((c) => `<tr><td style="${celda}${borde}">${esc(c.banco)}</td><td style="${celda}${borde}">${esc(c.soles)}</td><td style="${celda}${borde}">${esc(c.dolares)}</td></tr>`)
				.join("")}</table>`
		: "";
	return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;">
<table style="width:100%;border-collapse:collapse"><tr>
<td style="width:150px;vertical-align:top"><img src="${esc(logo)}" alt="SCP" style="width:140px"/></td>
<td style="vertical-align:top"><b style="font-size:13px">${esc(d.empresa)}</b>
<table style="border-collapse:collapse;margin-top:4px">${fila(t.dirFiscal, d.dirFiscal)}${fila(t.dirEmision, d.dirEmision)}${fila(t.telefono, d.telefono)}</table></td>
<td style="vertical-align:top;text-align:right;white-space:nowrap">${esc(d.impresoFecha)}<br/>${esc(d.impresoHora)}</td></tr></table>
<table style="width:100%;margin-top:14px;font-size:13px"><tr><td>${esc(t.nroOferta)} ${esc(d.numero)}</td><td style="text-align:right">${esc(t.fechaOferta)} ${esc(fechaDdMmAaaa(d.fecha))} ${esc(t.validoHasta)} ${esc(fechaDdMmAaaa(d.validoHasta))}</td></tr></table>
<table style="width:100%;margin-top:8px;border-collapse:collapse"><tr>
<td style="width:52%;vertical-align:top"><table style="border-collapse:collapse">${fila(t.cliente, d.cliente)}${fila(t.documento, d.documento)}${fila(t.correo, d.correoCliente)}${fila(t.celular, d.celularCliente)}${fila(t.dirFactura, d.dirFactura)}${fila(t.dirLlegada, d.dirLlegada)}</table></td>
<td style="vertical-align:top"><table style="border-collapse:collapse">${fila(t.vendedor, d.vendedor)}${fila(t.correo, d.correoVendedor)}${fila(t.celular, d.celularVendedor)}${fila(t.tienda, d.tienda)}${fila(t.condicionPago, d.condicionPago)}${fila(t.moneda, d.moneda)}${fila(t.transportista, d.transportista)}</table></td>
</tr></table>
<table style="width:100%;border-collapse:collapse;margin-top:16px"><tr style="border-top:2px solid #444;border-bottom:1px solid #444">
<th style="${celda}text-align:left">N°</th><th style="${celda}text-align:left">${esc(t.codigo)}</th><th style="${celda}text-align:left">${esc(t.descripcion)}</th><th style="${celda}text-align:left">${esc(t.marca)}</th><th style="${celda}text-align:left">${esc(t.unidad)}</th><th style="${celda}text-align:right">${esc(t.cantidad)}</th></tr>${lineas}</table>
<table style="width:100%;margin-top:14px;border-collapse:collapse"><tr>
<td style="width:52%;vertical-align:top">${fichas}</td>
<td style="vertical-align:top;padding-left:40px"><table style="border-collapse:collapse;width:100%">${totales}<tr><td style="${celda}"><b>${esc(t.precioVenta)}:</b></td><td style="${celda}text-align:right"><b>${esc(simbolo)} ${esc(montoTexto(d.precioVenta))}</b></td></tr></table></td>
</tr></table>
<p style="margin-top:18px">${esc(t.observacion)}: ${esc(d.observacion)}</p>
${cuentas}
<p style="margin-top:18px;font-size:10px">${esc(t.legal)}<br/>${esc(t.privacidad)}</p>
</div>`;
}
