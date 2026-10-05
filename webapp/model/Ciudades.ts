/**
 * Sedes (ciudades) de Socopur: cada perfil de vendedor es de UNA ciudad, con sus centros y oficinas.
 * Solo sociedad 1100 (centros 1xxx, organizaciones de venta 1101 vehiculos y 1103 repuestos). Los centros 3xxx (sociedad 1300) no se usan.
 * Fuente: lectura de T001W / TVKWZ / TVKBT en DS4/130 (05/10/2026). La relacion oficina-centro no esta en SAP: se deduce por numero
 * y nombre (1001 = ATE = centro 1001) y los centros sin oficina propia usan la principal de su ciudad.
 * Region: Costa = Lima; Selva = Pucallpa, Iquitos, Tarapoto, Yurimaguas y Puerto Maldonado.
 */

export type Region = "Costa" | "Selva";

export interface Ciudad {
	clave: string;
	nombre: string;
	region: Region;
	/** Centros de la ciudad (T001W). */
	centros: string[];
	/** Oficinas de venta de la ciudad (TVKBT). */
	oficinas: string[];
	/** Centro y oficina que se proponen al dar de alta un vendedor de la ciudad. */
	centroPrincipal: string;
	oficinaPrincipal: string;
}

export const CIUDADES: Ciudad[] = [
	{
		clave: "LIMA",
		nombre: "Lima",
		region: "Costa",
		centros: ["1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009"],
		oficinas: ["1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008"],
		centroPrincipal: "1001",
		oficinaPrincipal: "1001"
	},
	{
		clave: "PUCALLPA",
		nombre: "Pucallpa",
		region: "Selva",
		centros: ["1101", "1102", "1103", "1104"],
		oficinas: ["1101", "1102", "1103"],
		centroPrincipal: "1101",
		oficinaPrincipal: "1101"
	},
	{
		clave: "IQUITOS",
		nombre: "Iquitos",
		region: "Selva",
		centros: ["1201", "1202", "1203"],
		oficinas: ["1201", "1202", "1203"],
		centroPrincipal: "1201",
		oficinaPrincipal: "1201"
	},
	{
		clave: "TARAPOTO",
		nombre: "Tarapoto",
		region: "Selva",
		centros: ["1301", "1302", "1303", "1304", "1305", "1306"],
		oficinas: ["1301", "1302", "1303", "1304", "1305"],
		centroPrincipal: "1302",
		oficinaPrincipal: "1302"
	},
	{
		clave: "YURIMAGUAS",
		nombre: "Yurimaguas",
		region: "Selva",
		centros: ["1401"],
		oficinas: ["1401"],
		centroPrincipal: "1401",
		oficinaPrincipal: "1401"
	},
	{
		clave: "PUERTO_MALDONADO",
		nombre: "Puerto Maldonado",
		region: "Selva",
		centros: ["1501", "1502", "1503", "1504"],
		oficinas: ["1501", "1502", "1503"],
		centroPrincipal: "1502",
		oficinaPrincipal: "1502"
	}
];

/** Ciudad a la que pertenece un centro; undefined si el centro no esta en ninguna (p. ej. un 3xxx). */
export function ciudadDeCentro(werks: string): Ciudad | undefined {
	return CIUDADES.find((c) => c.centros.includes(werks));
}

export function ciudadPorClave(clave: string): Ciudad | undefined {
	return CIUDADES.find((c) => c.clave === clave);
}

/** Oficina de venta que corresponde a un centro: la del mismo numero si existe; si no (1009, 1104, 1306, 1504), la principal de su ciudad. */
export function oficinaDeCentro(werks: string): string {
	const ciudad = ciudadDeCentro(werks);
	if (!ciudad) {
		return "";
	}
	return ciudad.oficinas.includes(werks) ? werks : ciudad.oficinaPrincipal;
}

/** Texto de la franja de sede: "Pucallpa · Selva". */
export function textoSede(werks: string): string {
	const c = ciudadDeCentro(werks);
	return c ? `${c.nombre} · ${c.region}` : "";
}
