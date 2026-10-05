/**
 * Sedes (ciudades) de Socopur y sus tres sociedades: cada perfil de vendedor es de UNA ciudad, con sus centros y oficinas.
 * Sociedades: 1100 Socopur (centros 1xxx), 1200 Promogesa (2xxx) y 1300 Socopur Selva (3xxx). El primer digito del centro es la sociedad.
 * Fuente: lectura de T001W / TVKWZ / TVKBT en DS4/130 (05/10/2026). La relacion oficina-centro no esta en SAP: se deduce por numero
 * y nombre (1001 = ATE = centro 1001) y los centros sin oficina propia usan la principal de su ciudad en esa sociedad.
 * Region: Costa = Lima; Selva = Pucallpa, Iquitos, Tarapoto, Yurimaguas y Puerto Maldonado. Piura y Arequipa: sin region definida todavia.
 */

export type Region = "Costa" | "Selva" | "";

export interface PuntoVenta {
	centro: string;
	oficina: string;
}

export interface Ciudad {
	clave: string;
	nombre: string;
	region: Region;
	/** Centros de la ciudad en todas las sociedades (T001W). */
	centros: string[];
	/** Oficinas de venta de la ciudad en todas las sociedades (TVKBT). */
	oficinas: string[];
	/** Centro y oficina que se proponen al dar de alta un vendedor, por sociedad en la que la ciudad opera. */
	principales: Record<string, PuntoVenta>;
}

/** Sociedades de Socopur con el nombre que se muestra. */
export const SOCIEDADES: { key: string; text: string }[] = [
	{ key: "1100", text: "1100 Socopur" },
	{ key: "1200", text: "1200 Promogesa" },
	{ key: "1300", text: "1300 Socopur Selva" }
];

export const CIUDADES: Ciudad[] = [
	{
		clave: "LIMA",
		nombre: "Lima",
		region: "Costa",
		centros: [
			"1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008", "1009",
			"2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018",
			"3001", "3002", "3003", "3004", "3005"
		],
		oficinas: [
			"1001", "1002", "1003", "1004", "1005", "1006", "1007", "1008",
			"2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017",
			"3001", "3002", "3003", "3004", "3005"
		],
		principales: { "1100": { centro: "1001", oficina: "1001" }, "1200": { centro: "2001", oficina: "2001" }, "1300": { centro: "3001", oficina: "3001" } }
	},
	{
		clave: "PUCALLPA",
		nombre: "Pucallpa",
		region: "Selva",
		centros: ["1101", "1102", "1103", "1104", "3101", "3102", "3103", "3104"],
		oficinas: ["1101", "1102", "1103", "3101", "3102", "3103"],
		principales: { "1100": { centro: "1101", oficina: "1101" }, "1300": { centro: "3102", oficina: "3102" } }
	},
	{
		clave: "IQUITOS",
		nombre: "Iquitos",
		region: "Selva",
		centros: ["1201", "1202", "1203", "3201", "3202"],
		oficinas: ["1201", "1202", "1203", "3201", "3202"],
		principales: { "1100": { centro: "1201", oficina: "1201" }, "1300": { centro: "3201", oficina: "3201" } }
	},
	{
		clave: "TARAPOTO",
		nombre: "Tarapoto",
		region: "Selva",
		centros: ["1301", "1302", "1303", "1304", "1305", "1306", "3301"],
		oficinas: ["1301", "1302", "1303", "1304", "1305", "3301"],
		principales: { "1100": { centro: "1302", oficina: "1302" }, "1300": { centro: "3301", oficina: "3301" } }
	},
	{
		clave: "YURIMAGUAS",
		nombre: "Yurimaguas",
		region: "Selva",
		centros: ["1401"],
		oficinas: ["1401"],
		principales: { "1100": { centro: "1401", oficina: "1401" } }
	},
	{
		clave: "PUERTO_MALDONADO",
		nombre: "Puerto Maldonado",
		region: "Selva",
		centros: ["1501", "1502", "1503", "1504", "3401"],
		oficinas: ["1501", "1502", "1503", "3401"],
		principales: { "1100": { centro: "1502", oficina: "1502" }, "1300": { centro: "3401", oficina: "3401" } }
	},
	{
		clave: "PIURA",
		nombre: "Piura",
		region: "",
		centros: ["2601", "2602", "2603", "2604"],
		oficinas: ["2601", "2602", "2603"],
		principales: { "1200": { centro: "2602", oficina: "2602" } }
	},
	{
		clave: "AREQUIPA",
		nombre: "Arequipa",
		region: "",
		centros: ["2701"],
		oficinas: ["2701"],
		principales: { "1200": { centro: "2701", oficina: "2701" } }
	}
];

/** Sociedad a la que pertenece un centro por su numeracion: 1xxx = 1100, 2xxx = 1200, 3xxx = 1300; "" si no encaja. */
export function sociedadDeCentro(werks: string): string {
	const porDigito: Record<string, string> = { "1": "1100", "2": "1200", "3": "1300" };
	return /^[123]\d{3}$/.test(werks) ? porDigito[werks[0]] : "";
}

/** Ciudad a la que pertenece un centro; undefined si el centro no esta en ninguna. */
export function ciudadDeCentro(werks: string): Ciudad | undefined {
	return CIUDADES.find((c) => c.centros.includes(werks));
}

export function ciudadPorClave(clave: string): Ciudad | undefined {
	return CIUDADES.find((c) => c.clave === clave);
}

/** Punto de venta principal de una ciudad en una sociedad; sin sociedad (o si la ciudad no opera en ella) toma el primero que tenga. */
export function principalDe(ciudad: Ciudad, sociedad: string): PuntoVenta {
	return ciudad.principales[sociedad] ?? Object.values(ciudad.principales)[0];
}

/** Ciudades en las que opera una sociedad (todas si no se indica sociedad). */
export function ciudadesDeSociedad(sociedad: string): Ciudad[] {
	return sociedad ? CIUDADES.filter((c) => sociedad in c.principales) : CIUDADES;
}

/** Oficina de venta que corresponde a un centro: la del mismo numero si existe; si no (1009, 1104, 1306, 1504, 2018...), la principal de su ciudad en su sociedad. */
export function oficinaDeCentro(werks: string): string {
	const ciudad = ciudadDeCentro(werks);
	if (!ciudad) {
		return "";
	}
	return ciudad.oficinas.includes(werks) ? werks : principalDe(ciudad, sociedadDeCentro(werks)).oficina;
}

/** Texto de la franja de sede: "Pucallpa · Selva" (sin region: solo la ciudad). */
export function textoSede(werks: string): string {
	const c = ciudadDeCentro(werks);
	return c ? (c.region ? `${c.nombre} · ${c.region}` : c.nombre) : "";
}

export interface OpcionClave {
	key: string;
	text: string;
}

/**
 * Listas de centros u oficinas de la sede del vendedor. Deja solo los de su ciudad y, si el valor del perfil no esta en la lista, lo agrega
 * (marcado) para que el desplegable muestre SIEMPRE el valor del perfil y no otro. `fueraDeSap` dice si ese valor no es valido para la
 * organizacion y el canal (no esta en la lista de SAP), para avisar al vendedor.
 */
export function listaDeSede(
	base: OpcionClave[],
	ciudadClave: string,
	tipo: "centros" | "oficinas",
	valorPerfil: string,
	marca: string
): { opciones: OpcionClave[]; fueraDeSap: boolean } {
	const ciudad = ciudadPorClave(ciudadClave);
	const delSap = ciudad ? base.filter((o) => ciudad[tipo].includes(o.key)) : [...base];
	const fueraDeSap = !!valorPerfil && !base.some((o) => o.key === valorPerfil);
	const opciones = valorPerfil && !delSap.some((o) => o.key === valorPerfil) ? [{ key: valorPerfil, text: `${valorPerfil} (${marca})` }, ...delSap] : delSap;
	return { opciones, fueraDeSap };
}
