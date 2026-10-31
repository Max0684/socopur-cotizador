/**
 * Carga del detalle desde Excel. Logica pura: lee la plantilla y valida sus filas contra lo que SAP devolvio (materiales y vehiculos);
 * la lectura de SAP y el alta de las lineas quedan en el controlador.
 *
 * Plantilla simplificada (pruebas del 30/10/2026: material, modelo y marca se repetian): Material, Cantidad y, solo para vehiculos, Color,
 * Condicion y Anio. El tipo, el modelo y la marca salen del material en SAP. Se sigue aceptando la del programa actual (ZSDP009: A Material,
 * B Tipo, C Cantidad, D Color, E Condicion, F Modelo, G Marca, H Anio), por encabezado o, sin encabezado reconocible, por posicion.
 */

export interface FilaPlantilla {
	/** Fila del archivo (la 1 es el encabezado). */
	fila: number;
	material: string;
	/** "V" o "R" si el archivo lo trae (plantilla de ZSDP009); vacio en la simplificada. */
	tipo: string;
	cantidad: number;
	color: string;
	condicion: string;
	anio: string;
}

export const ENCABEZADO_PLANTILLA = ["Material", "Cantidad", "Color", "Condicion", "Anio"];

type Campo = "material" | "tipo" | "cantidad" | "color" | "condicion" | "anio";

/** Nombres de columna aceptados (sin tildes ni mayusculas). Modelo y marca se ignoran: salen del material. */
const NOMBRES: Record<string, Campo> = {
	material: "material",
	codigo: "material",
	"codigo de material": "material",
	tipo: "tipo",
	cantidad: "cantidad",
	cant: "cantidad",
	color: "color",
	condicion: "condicion",
	anio: "anio",
	ano: "anio",
	"ano modelo": "anio"
};

/** Posiciones de la plantilla de ZSDP009 (lectura por posicion). */
const POSICION_ZSDP009: Record<Campo, number> = { material: 0, tipo: 1, cantidad: 2, color: 3, condicion: 4, anio: 7 };

const normalizar = (v: unknown): string =>
	String(v ?? "")
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.trim()
		.toLowerCase();

const texto = (v: unknown): string => String(v ?? "").trim();

/** Filas de la hoja (la 1 es el encabezado) a filas de la plantilla; las filas sin material se saltan. */
export function leerPlantilla(filas: unknown[][]): FilaPlantilla[] {
	const encabezado = (filas[0] ?? []).map(normalizar);
	const porNombre: Partial<Record<Campo, number>> = {};
	encabezado.forEach((nombre, i) => {
		const campo = NOMBRES[nombre];
		if (campo && porNombre[campo] === undefined) {
			porNombre[campo] = i;
		}
	});
	const posicion: Partial<Record<Campo, number>> = porNombre.material !== undefined ? porNombre : POSICION_ZSDP009;
	const celda = (r: unknown[], campo: Campo): unknown => (posicion[campo] === undefined ? "" : r[posicion[campo] as number]);
	return filas
		.slice(1)
		.map((r, i) => ({
			fila: i + 2,
			material: texto(celda(r, "material")),
			tipo: texto(celda(r, "tipo")).toUpperCase(),
			cantidad: Number(celda(r, "cantidad")),
			color: texto(celda(r, "color")),
			condicion: texto(celda(r, "condicion")),
			anio: texto(celda(r, "anio"))
		}))
		.filter((f) => f.material !== "");
}

/** Repuesto de SAP con su disponible en el almacen del perfil (lo minimo que necesita la validacion). */
export interface RepuestoExcel {
	material: string;
	denominacion: string;
	disponible: number;
}

/** Vehiculo de SAP agrupado por modelo, variante y centro (VehiculosService.agruparVehiculos). */
export interface VehiculoExcel {
	material: string;
	denominacion: string;
	variante: string;
	color: string;
	colorTxt: string;
	anio: number;
	condicion: string;
	stockMio: number;
}

export interface ResultadoExcel {
	fila: number;
	material: string;
	denominacion: string;
	cantidad: number;
	estado: "Success" | "Warning" | "Error";
	mensaje: string;
	/** Material de SAP de la linea (repuesto) o modelo (vehiculo); vacio en las filas con error o repetidas. */
	mat?: string;
	esVeh?: boolean;
	/** Variante elegida del vehiculo. */
	variante?: string;
}

export type Textos = (clave: string, args?: (string | number)[]) => string;

const igual = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** Un vehiculo cumple si coincide en lo que la fila indica (color por codigo o por nombre, condicion y ano); lo vacio no filtra. */
function cumple(v: VehiculoExcel, f: FilaPlantilla): boolean {
	return (!f.color || igual(f.color, v.color) || igual(f.color, v.colorTxt)) && (!f.condicion || igual(f.condicion, v.condicion)) && (!f.anio || f.anio === String(v.anio));
}

const textoVariante = (v: VehiculoExcel): string => [v.colorTxt || v.color, v.anio > 0 ? String(v.anio) : "", v.condicion].filter(Boolean).join(" · ");

/**
 * Valida las filas contra SAP. Repuestos: deben existir en la organizacion y canal del vendedor; repetidos se suman; mas que el disponible
 * se avisa (no se bloquea). Vehiculos: el modelo debe tener unidades vendibles en el centro del vendedor y la fila debe identificar UNA
 * variante (color, condicion y ano); si hay varias y la fila no dice cual, es error para no cotizar un color que el cliente no pidio.
 */
export function validarContraSap(filas: FilaPlantilla[], repuestos: Record<string, RepuestoExcel>, vehiculos: VehiculoExcel[], t: Textos): ResultadoExcel[] {
	const resultado: ResultadoExcel[] = [];
	filas.forEach((f) => {
		const codigo = f.material.toUpperCase();
		const rep = repuestos[codigo];
		const delModelo = vehiculos.filter((v) => v.material.toUpperCase() === codigo);
		if (!rep && delModelo.length === 0) {
			resultado.push({ fila: f.fila, material: f.material, denominacion: "", cantidad: f.cantidad, estado: "Error", mensaje: t("excelNoExiste", [f.material, f.fila]) });
			return;
		}
		const denominacion = rep?.denominacion ?? delModelo[0].denominacion;
		if (!Number.isInteger(f.cantidad) || f.cantidad <= 0) {
			resultado.push({ fila: f.fila, material: f.material, denominacion, cantidad: f.cantidad, estado: "Error", mensaje: t("excelCantidadInvalida") });
			return;
		}
		if (rep) {
			const previa = resultado.find((x) => x.mat === rep.material && !x.esVeh);
			if (previa) {
				previa.cantidad += f.cantidad;
				resultado.push({ fila: f.fila, material: f.material, denominacion, cantidad: f.cantidad, estado: "Warning", mensaje: t("excelRepetido") });
				return;
			}
			const declaraVeh = f.tipo === "V";
			resultado.push({
				fila: f.fila,
				material: f.material,
				denominacion,
				cantidad: f.cantidad,
				estado: declaraVeh ? "Warning" : "Success",
				mensaje: declaraVeh ? t("excelTipoDifiere", [t("excelRepuesto")]) : t("excelOk"),
				mat: rep.material
			});
			return;
		}
		const variantes = delModelo.filter((v) => cumple(v, f));
		if (variantes.length !== 1) {
			const opciones = (variantes.length > 1 ? variantes : delModelo).map(textoVariante).join("; ");
			resultado.push({
				fila: f.fila,
				material: f.material,
				denominacion,
				cantidad: f.cantidad,
				estado: "Error",
				mensaje: t(variantes.length > 1 ? "excelVehiculoElige" : "excelVehiculoSinVariante", [opciones])
			});
			return;
		}
		const v = variantes[0];
		resultado.push({
			fila: f.fila,
			material: f.material,
			denominacion: `${denominacion} · ${textoVariante(v)}`,
			cantidad: f.cantidad,
			estado: "Success",
			mensaje: t("excelOk"),
			mat: v.material,
			esVeh: true,
			variante: v.variante
		});
	});
	// Stock: se avisa, no se bloquea (repuestos: se puede repartir o pedir traslado; vehiculos: el VIN se asigna al crear el pedido).
	resultado.forEach((r) => {
		if (!r.mat || r.estado === "Error") {
			return;
		}
		const disponible = r.esVeh ? (vehiculos.find((v) => v.material === r.mat && v.variante === r.variante)?.stockMio ?? 0) : (repuestos[r.mat.toUpperCase()]?.disponible ?? 0);
		if (r.cantidad > disponible) {
			r.estado = "Warning";
			r.mensaje = t(r.esVeh ? "excelSuperaVeh" : "excelSupera", [disponible]);
		}
	});
	return resultado;
}
