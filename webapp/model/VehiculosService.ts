import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

/**
 * Vehiculos vendibles desde SAP (entidad Vehiculo de YUI_COTIZ_SRV). El servidor ya deja solo los vendibles: estado de venta S000,
 * estado de compra M100 o M170, con stock de lote y sin reserva del Cotizador. El precio no viene aqui: se pide a la entidad Precio
 * con el modelo (Matnr) y la variante (Varcond).
 */

export interface FiltroVehiculos {
	vkorg: string;
	vtweg: string;
	/** Centro del perfil; vacio = todos los centros de la organizacion. */
	werks?: string;
	color?: string;
	anio?: string;
	condicion?: string;
}

/** Fila de la entidad Vehiculo tal como llega (solo lo que usa el front). */
export interface FilaVehiculoSap {
	Vkorg: string;
	Vtweg: string;
	Vhcle: string;
	Vhvin: string;
	Matnr: string;
	Maktx: string;
	Werks: string;
	Avail: string;
	AvailTxt: string;
	Sdsta: string;
	Mmsta: string;
	Color: string;
	/** Nombre del color (de las caracteristicas de color de la clasificacion); puede venir vacio. */
	ColorTxt?: string;
	AnoModelo: string;
	Condicion: string;
	VersionModelo: string;
	Variante: string;
	StockLote: number | string;
	Segmento1: string;
	Segmento2: string;
	Marca: string;
	Spart: string;
	SpartCabecera: string;
}

/** Fila con la forma de la tabla de resultados de vehiculos (la misma del catalogo de ejemplo) mas los datos reales de SAP. */
export interface VehiculoSap {
	origen: "sap";
	material: string;
	denominacion: string;
	marca: string;
	modelo: string;
	color: string;
	colorTxt: string;
	anio: number;
	condicion: string;
	stockMio: number;
	stockOtros: number;
	precioUsd: number;
	condicionPct: number;
	promocion: null;
	orgVentas: string;
	sector: string;
	sectorTxt: string;
	/** Sector de cabecera del documento (lo calcula el servicio segun el canal). */
	sectorOferta: string;
	linea: string;
	clase: string;
	familia: string;
	grupo: string;
	/** El precio se pide al elegir el vehiculo. */
	sinPrecio: boolean;
	/** Con una fila por vehiculo es su VIN; en las filas agrupadas queda vacio (ver vins). */
	vin: string;
	vhcle: string;
	/** VIN de cada unidad de la fila agrupada (el VIN se asigna despues, al crear el pedido). */
	vins: string[];
	variante: string;
	centro: string;
	disponibilidad: string;
}

const comillas = (texto: string): string => texto.replace(/'/g, "''");

/** $filter de la entidad Vehiculo (todos con eq; los demas filtros de texto se aplican en el front sobre el resultado). */
export function filtroVehiculos(f: FiltroVehiculos): string {
	const partes = [`Vkorg eq '${comillas(f.vkorg)}'`, `Vtweg eq '${comillas(f.vtweg)}'`];
	if (f.werks) {
		partes.push(`Werks eq '${comillas(f.werks)}'`);
	}
	if (f.color) {
		partes.push(`Color eq '${comillas(f.color.toUpperCase())}'`);
	}
	if (f.anio) {
		partes.push(`AnoModelo eq '${comillas(f.anio)}'`);
	}
	if (f.condicion) {
		partes.push(`Condicion eq '${comillas(f.condicion.toUpperCase())}'`);
	}
	return partes.join(" and ");
}

/** Convierte una fila de SAP a la forma de la tabla de resultados. */
export function filaDeVehiculo(f: FilaVehiculoSap): VehiculoSap {
	return {
		origen: "sap",
		material: f.Matnr,
		denominacion: f.Maktx,
		marca: f.Marca,
		modelo: f.VersionModelo || f.Matnr,
		color: f.Color,
		colorTxt: f.ColorTxt ?? "",
		anio: Number(f.AnoModelo) || 0,
		condicion: f.Condicion,
		stockMio: Number(f.StockLote),
		stockOtros: 0,
		precioUsd: 0,
		condicionPct: 0,
		promocion: null,
		orgVentas: f.Vkorg,
		sector: f.Spart,
		sectorTxt: f.Marca,
		sectorOferta: f.SpartCabecera,
		linea: f.Segmento1,
		clase: f.Segmento2,
		familia: "",
		grupo: f.Marca,
		sinPrecio: true,
		vin: f.Vhvin,
		vhcle: f.Vhcle,
		vins: [f.Vhvin],
		variante: f.Variante,
		centro: f.Werks,
		disponibilidad: f.AvailTxt
	};
}

/** Filtros de texto de la pantalla (codigo, descripcion, texto libre con VIN) sobre las filas ya leidas. */
export function filtrarVehiculos(filas: VehiculoSap[], f: { codigo?: string; descripcion?: string; texto?: string; clase?: string }): VehiculoSap[] {
	const contiene = (valor: string, filtro?: string): boolean => !filtro || valor.toLowerCase().includes(filtro.toLowerCase());
	return filas.filter(
		(v) =>
			(!f.clase || v.clase === f.clase) &&
			contiene(v.material, f.codigo) &&
			contiene(`${v.denominacion} ${v.modelo}`, f.descripcion) &&
			contiene(`${v.denominacion} ${v.marca} ${v.modelo} ${v.material} ${v.vin} ${v.variante} ${v.colorTxt}`, f.texto)
	);
}

/** Lee los vehiculos vendibles (hasta 200 filas) y los pasa a la forma de la tabla. */
export async function buscarVehiculos(modelo: ODataModel, filtro: FiltroVehiculos): Promise<VehiculoSap[]> {
	const lista = modelo.bindList("/Vehiculo", undefined, undefined, undefined, { $filter: filtroVehiculos(filtro), $orderby: "Matnr,Vhvin" });
	const contextos = await lista.requestContexts(0, 200);
	return contextos.map((c) => filaDeVehiculo(c.getObject() as FilaVehiculoSap));
}

/**
 * Una fila por modelo, variante y centro con la cantidad de unidades disponibles (los vehiculos iguales no se distinguen para
 * cotizar; el VIN se asigna despues). La cantidad va en stockMio y los VIN de las unidades en vins.
 */
export function agruparVehiculos(filas: VehiculoSap[]): VehiculoSap[] {
	const grupos = new Map<string, VehiculoSap>();
	filas.forEach((f) => {
		const clave = `${f.centro}|${f.material}|${f.variante}`;
		const g = grupos.get(clave);
		if (g) {
			g.stockMio += f.stockMio;
			g.vins.push(...f.vins);
		} else {
			grupos.set(clave, { ...f, vins: [...f.vins], vin: "", vhcle: "" });
		}
	});
	return [...grupos.values()];
}
