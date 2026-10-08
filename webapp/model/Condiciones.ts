/**
 * Lista "Determinacion de precio" de una linea (una fila por condicion de SAP, como la pestana Condiciones del pedido).
 * Logica pura: no lee SAP ni toca la pantalla.
 */

/** Fila de la entidad PrecioCond tal como la devuelve el servicio (los campos nuevos pueden faltar en un servicio anterior). */
export interface CondicionServicio {
	CondType: string;
	Descripcion?: string;
	/** Valor de la condicion: porcentaje si TipoCalculo = A, importe en los demas casos. */
	Valor?: string | number;
	/** Moneda de la condicion. */
	Moneda?: string;
	UmPrecio?: string | number;
	/** Unidad de medida de la condicion. */
	Unidad?: string;
	Base?: string | number;
	/** Importe de la condicion para TODA la linea. */
	Total?: string | number;
	MonedaDoc?: string;
	Manual?: string | boolean;
	Estadistica?: string | boolean;
	Paso?: string;
	Contador?: string;
	TipoCalculo?: string;
	Inactiva?: string | boolean;
}

export interface FilaCondicion {
	tipo: string;
	descripcion: string;
	importe: string;
	moneda: string;
	umPrecio: string;
	umCondicion: string;
	base: string;
	valor: string;
	monedaDoc: string;
	manual: boolean;
	/** Impuesto, descuento o precio con valor distinto de cero: la que se muestra por defecto. */
	relevante: boolean;
	/** Valor de la condicion para la linea (numero), para colorear descuentos. */
	valorNum: number;
	/** Presentacion como "Elementos de precio" de SAP: importe o ratio con su unidad (% o moneda), UM de precio ("1 UN") y valor con su moneda. */
	importeNum: string;
	importeUnidad: string;
	umPrecioTxt: string;
	valorMoneda: string;
	estadistica: boolean;
	/** true en subtotales (calculo G): se muestran sin codigo de condicion, como en SAP. */
	subtotal: boolean;
}

/** Un indicador de SAP esta puesto si es verdadero o trae texto (el servicio lo entrega como "X" o como booleano). */
const marcado = (v: unknown): boolean => v === true || (typeof v === "string" && v.trim() !== "");

const num = (v: unknown): number => {
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
};

const formato = (v: number): string => v.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** En los porcentajes el valor del servicio sale dividido por 10 (18 % aparece como 1.8): se corrige al mostrarlo. */
const FACTOR_PORCENTAJE = 10;

/** Texto del importe: "10,00- %" en los porcentajes y el monto en los demas casos. */
export function importeVisible(c: CondicionServicio): string {
	const valor = num(c.Valor);
	return c.TipoCalculo === "A" ? `${formato(valor * FACTOR_PORCENTAJE)} %` : formato(valor);
}

export function filaDeCondicion(c: CondicionServicio): FilaCondicion {
	const total = num(c.Total);
	const inactiva = marcado(c.Inactiva);
	return {
		tipo: c.CondType,
		descripcion: c.Descripcion?.trim() || c.CondType,
		importe: importeVisible(c),
		moneda: c.TipoCalculo === "A" ? "" : (c.Moneda ?? ""),
		umPrecio: num(c.UmPrecio) ? String(num(c.UmPrecio)) : "",
		umCondicion: c.Unidad ?? "",
		base: num(c.Base) ? formato(num(c.Base)) : "",
		valor: formato(total),
		monedaDoc: c.MonedaDoc ?? "",
		manual: marcado(c.Manual),
		relevante: !inactiva && (total !== 0 || num(c.Valor) !== 0),
		valorNum: total,
		importeNum: formato(c.TipoCalculo === "A" ? num(c.Valor) * FACTOR_PORCENTAJE : num(c.Valor)),
		importeUnidad: c.TipoCalculo === "A" ? "%" : (c.Moneda || c.MonedaDoc || ""),
		umPrecioTxt: num(c.UmPrecio) ? `${num(c.UmPrecio)} ${c.Unidad ?? ""}`.trim() : "",
		valorMoneda: c.MonedaDoc || c.Moneda || "",
		estadistica: marcado(c.Estadistica),
		subtotal: c.TipoCalculo === "G"
	};
}

/**
 * Condiciones de una linea en el orden del esquema de precios (paso y contador). Por defecto solo las que tienen valor y no estan
 * inactivas (SAP trae muchas en cero); con verTodas se muestran todas, como en la transaccion.
 */
export function filasDeCondiciones(condiciones: CondicionServicio[], verTodas = false): FilaCondicion[] {
	return [...condiciones]
		.sort((a, b) => num(a.Paso) - num(b.Paso) || num(a.Contador) - num(b.Contador))
		.map(filaDeCondicion)
		.filter((f) => verTodas || f.relevante);
}

/** Condiciones que SAP calcula solo para la base imponible (se compensan entre si): no son descuentos para el vendedor. */
const CONDICIONES_CONTABLES = ["Z335", "Z336"];

export interface DescuentoAplicado {
	nombre: string;
	beneficio: string;
	monto: string;
}

/**
 * Descuentos y promociones que SAP aplica a la linea: las condiciones con valor negativo (salvo las contables). El beneficio es el
 * porcentaje o importe de la condicion y el monto lo que descuenta de la linea.
 */
export function descuentosAplicados(filas: FilaCondicion[]): DescuentoAplicado[] {
	return filas
		.filter((f) => f.valorNum < 0 && !CONDICIONES_CONTABLES.includes(f.tipo))
		.map((f) => ({ nombre: `${f.descripcion} (${f.tipo})`, beneficio: f.importe, monto: f.valor }));
}
