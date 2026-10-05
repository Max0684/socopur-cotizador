import type ODataModel from "sap/ui/model/odata/v4/ODataModel";

const NS = "com.sap.gateway.srvd_a2x.yui_cotiz_srv.v0001";
import type JSONModel from "sap/ui/model/json/JSONModel";

/**
 * Vendedor del Cotizador. El usuario SAP es compartido: cada vendedor se identifica con su PERNR (empleado HR, el mismo
 * que SAP guarda como interlocutor VE en VBPA) y de su fila salen los valores por defecto de la oferta.
 * Rol: "V" vendedor, "A" administrador (personal de TI que mantiene la tabla YCOTIZ_VENDEDOR).
 */
export interface Vendedor {
	pernr: string;
	nombre: string;
	/** "repuestos" | "vehiculos". */
	tipo: string;
	vkorg: string;
	vkbur: string;
	werks: string;
	lgort: string;
	/** Canal por defecto. */
	vtweg: string;
	zterm: string;
	vsbed: string;
	waers: string;
	vigenciaDias: number;
	rol: string;
	/** Sociedad del empleado (HCM); vacia en filas antiguas. */
	bukrs?: string;
	/** Tiene PIN fijado. SAP no expone el hash: el PIN solo se comprueba con la accion verificarPin. */
	conPin: boolean;
	/** Solo prototipo (sin SAP): SHA-256 del PIN en hexadecimal. */
	pinHash?: string;
	activo: boolean;
}

/** Fila de la entidad Vendedor (YCOTIZ_VENDEDOR). Los nombres se confirman cuando se publique la entidad. */
interface VendedorSap {
	Pernr: string;
	Nombre?: string;
	TipoVenta?: string;
	Vkorg?: string;
	Vkbur?: string;
	Werks?: string;
	Lgort?: string;
	Vtweg?: string;
	Zterm?: string;
	Vsbed?: string;
	Waers?: string;
	/** NUMC3 en SAP: llega y se envia como texto de 3 digitos ("007"). */
	VigenciaDias?: string | number;
	Rol?: string;
	Bukrs?: string;
	ConPin?: boolean | string;
	Activo?: string;
}

/** Clave unica de la fila: un mismo PERNR puede tener varias (organizacion y tipo de venta distintos), asi que no basta el PERNR. */
export function claveVendedor(v: Pick<Vendedor, "pernr" | "vkorg" | "tipo">): string {
	return `${v.pernr}|${v.vkorg}|${v.tipo}`;
}

const CLAVE_SESION = "cotizador.vendedor";

/** SHA-256 en hexadecimal del PIN (el PIN nunca se guarda ni se envia en claro). */
export async function hashPin(pin: string): Promise<string> {
	const bytes = new TextEncoder().encode(pin);
	const resumen = await crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(resumen)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Los PERNR son de 8 digitos; se aceptan sin ceros a la izquierda. */
export function normalizarPernr(texto: string): string {
	const t = texto.trim();
	return /^\d+$/.test(t) ? t.padStart(8, "0") : t;
}

/** Lee los vendedores de SAP (todos; el dialogo de identificacion muestra solo los activos). Sin modelo OData (prototipo) devuelve los del mock. */
export async function cargarVendedores(modelo: ODataModel | undefined, prototipo: Vendedor[]): Promise<Vendedor[]> {
	if (!modelo) {
		return prototipo;
	}
	const binding = modelo.bindList("/Vendedor", undefined, undefined, undefined, { $orderby: "Nombre" });
	const contextos = await binding.requestContexts(0, 500);
	return contextos.map((c) => {
		const v = c.getObject() as VendedorSap;
		return {
			pernr: normalizarPernr(v.Pernr),
			nombre: v.Nombre ?? v.Pernr,
			tipo: v.TipoVenta === "V" ? "vehiculos" : "repuestos",
			vkorg: v.Vkorg ?? "",
			vkbur: v.Vkbur ?? "",
			werks: v.Werks ?? "",
			lgort: v.Lgort ?? "",
			vtweg: v.Vtweg ?? "",
			zterm: v.Zterm ?? "",
			vsbed: v.Vsbed ?? "",
			waers: v.Waers ?? "PEN",
			vigenciaDias: Number(v.VigenciaDias) || 7,
			rol: v.Rol ?? "V",
			bukrs: v.Bukrs ?? "",
			conPin: v.ConPin === true || v.ConPin === "X",
			activo: v.Activo === "X"
		};
	});
}

/** Busca por PERNR o por parte del nombre (sin distinguir mayusculas ni tildes). */
export function buscarVendedores(lista: Vendedor[], texto: string): Vendedor[] {
	const limpiar = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
	const t = limpiar(texto.trim());
	if (!t) {
		return lista;
	}
	return lista.filter((v) => limpiar(v.nombre).includes(t) || v.pernr.includes(normalizarPernr(texto)) || v.pernr.endsWith(t));
}

/** Comprueba el PIN. Con SAP lo hace la accion verificarPin (hash SHA256(pernr+vkorg+pin) en el servidor); sin SAP, contra el hash del prototipo. */
export async function pinCorrecto(modelo: ODataModel | undefined, vendedor: Vendedor, pin: string): Promise<boolean> {
	if (!vendedor.conPin) {
		return true;
	}
	if (modelo) {
		try {
			const operacion = modelo.bindContext(`${rutaVendedor(vendedor)}/${NS}.verificarPin(...)`);
			operacion.setParameter("Pin", pin);
			await operacion.execute("$auto", true);
			return true;
		} catch {
			return false;
		}
	}
	return (await hashPin(pin)) === (vendedor.pinHash ?? "");
}

/** Fija o cambia el PIN (minimo 4 caracteres, lo valida SAP). Devuelve el vendedor ya con conPin. */
export async function fijarPin(modelo: ODataModel | undefined, vendedor: Vendedor, pin: string): Promise<Vendedor> {
	if (modelo) {
		const operacion = modelo.bindContext(`${rutaVendedor(vendedor)}/${NS}.fijarPin(...)`);
		operacion.setParameter("Pin", pin);
		await operacion.execute("$auto", true);
		return { ...vendedor, conPin: true };
	}
	return { ...vendedor, conPin: true, pinHash: await hashPin(pin) };
}

/**
 * Carga el perfil del vendedor en el modelo de pantalla (/perfil). Solo toca los valores por defecto; los campos que el
 * vendedor cambia en cada oferta siguen siendo editables. Los valores vacios del perfil no pisan los actuales.
 */
export function aplicarPerfil(mock: JSONModel, v: Vendedor): void {
	const poner = (ruta: string, valor: string | number): void => {
		if (valor !== "" && valor !== undefined) {
			mock.setProperty(ruta, valor);
		}
	};
	mock.setProperty("/perfil/pernr", v.pernr);
	mock.setProperty("/perfil/vendedor", `${v.pernr} — ${v.nombre}`);
	mock.setProperty("/perfil/rol", v.rol);
	poner("/perfil/oficina", v.vkbur);
	poner("/perfil/centro", v.werks);
	poner("/perfil/canal", v.vtweg);
	poner("/perfil/formaPago", v.zterm);
	poner("/perfil/expedicion", v.vsbed);
	poner("/perfil/moneda", v.waers);
	poner("/perfil/vigenciaDias", v.vigenciaDias);
	mock.setProperty("/perfil/busqueda/tipo", v.tipo);
	if (v.vtweg) {
		mock.setProperty("/perfil/busqueda/canal", v.vtweg);
	}
	if (v.vkorg) {
		mock.setProperty(`/perfil/busqueda/orgs/${v.tipo}`, v.vkorg);
	}
}

/** Recuerda al vendedor en la pestana (no entre sesiones): al recargar la pagina no pide el PERNR otra vez. */
export function recordarVendedor(pernr: string | undefined): void {
	try {
		if (pernr) {
			sessionStorage.setItem(CLAVE_SESION, pernr);
		} else {
			sessionStorage.removeItem(CLAVE_SESION);
		}
	} catch {
		// sin almacenamiento: se vuelve a pedir en cada carga
	}
}

export function vendedorRecordado(): string {
	try {
		return sessionStorage.getItem(CLAVE_SESION) ?? "";
	} catch {
		return "";
	}
}

const TIPO_SAP: Record<string, string> = { repuestos: "R", vehiculos: "V" };

/** Fila de la entidad Vendedor a partir de la forma de pantalla. */
export function aFilaSap(v: Vendedor): VendedorSap {
	return {
		Pernr: v.pernr,
		Nombre: v.nombre,
		TipoVenta: TIPO_SAP[v.tipo] ?? "R",
		Vkorg: v.vkorg,
		Vkbur: v.vkbur,
		Werks: v.werks,
		Lgort: v.lgort,
		Vtweg: v.vtweg,
		Zterm: v.zterm,
		Vsbed: v.vsbed,
		Waers: v.waers,
		VigenciaDias: String(v.vigenciaDias).padStart(3, "0"),
		Rol: v.rol,
		Bukrs: v.bukrs ?? "",
		Activo: v.activo ? "X" : ""
	};
}

/** Clave de la fila en el servicio: PERNR + organizacion + tipo de venta. */
export function rutaVendedor(v: Pick<Vendedor, "pernr" | "vkorg" | "tipo">): string {
	return `/Vendedor(Pernr='${v.pernr}',Vkorg='${v.vkorg}',TipoVenta='${TIPO_SAP[v.tipo] ?? "R"}')`;
}

/** Errores de captura que impiden guardar; vacio = valido. Son claves de i18n. */
export function validarVendedor(v: Vendedor): string[] {
	const errores: string[] = [];
	if (!/^\d{8}$/.test(v.pernr)) {
		errores.push("vendAdmErrPernr");
	}
	if (!v.nombre.trim()) {
		errores.push("vendAdmErrNombre");
	}
	if (!v.vkorg || !v.werks || !v.vtweg) {
		errores.push("vendAdmErrOrg");
	}
	if (!(v.vigenciaDias > 0)) {
		errores.push("vendAdmErrVigencia");
	}
	return errores;
}

/**
 * Crea o actualiza un vendedor en SAP (con modelo OData) y devuelve la lista actualizada. Sin modelo (prototipo)
 * solo cambia la lista que recibe, sin persistir. Nunca se borra: se desactiva para conservar el historial.
 */
export async function guardarVendedor(modelo: ODataModel | undefined, lista: Vendedor[], v: Vendedor, esNuevo: boolean): Promise<Vendedor[]> {
	const mismo = (x: Vendedor): boolean => x.pernr === v.pernr && x.vkorg === v.vkorg && x.tipo === v.tipo;
	if (esNuevo && lista.some(mismo)) {
		throw new Error("vendAdmErrDuplicado");
	}
	if (modelo) {
		if (esNuevo) {
			const contexto = modelo.bindList("/Vendedor").create(aFilaSap(v), true);
			await contexto.created();
		} else {
			const contexto = modelo.bindContext(rutaVendedor(v)).getBoundContext();
			const fila = aFilaSap(v) as unknown as Record<string, unknown>;
			for (const campo of Object.keys(fila)) {
				if (campo !== "Pernr" && campo !== "Vkorg" && campo !== "TipoVenta") {
					contexto.setProperty(campo, fila[campo]);
				}
			}
			await modelo.submitBatch("$auto");
		}
	}
	return esNuevo ? [...lista, v] : lista.map((x) => (mismo(x) ? v : x));
}

/** Fila de la entidad Empleado (PA0001 vigente y activo en PA0000). Dato personal: solo para el alta del administrador. */
interface EmpleadoSap {
	Pernr: string;
	Nombre?: string;
	Bukrs?: string;
	Werks?: string;
	Btrtl?: string;
}

export interface Empleado {
	pernr: string;
	nombre: string;
	sociedad: string;
}

/** Minimo de caracteres para buscar por nombre (evita traer cientos de empleados con una letra). */
export const MINIMO_BUSQUEDA = 3;

/** Filtro OData: solo digitos = PERNR exacto (completado a 8); si no, el nombre CONTIENE el texto (los nombres de HCM van en mayusculas). */
export function filtroEmpleado(texto: string, sociedad = ""): string {
	const t = texto.trim();
	const base = /^\d+$/.test(t) ? `Pernr eq '${normalizarPernr(t)}'` : `contains(Nombre,'${t.toUpperCase().replace(/'/g, "''")}')`;
	return sociedad ? `${base} and Bukrs eq '${sociedad.replace(/'/g, "''")}'` : base;
}

/** Nombre de las sociedades conocidas de Socopur; una sociedad nueva se muestra con su codigo. */
const NOMBRE_SOCIEDAD: Record<string, string> = { "1100": "Socopur", "1200": "Promotora G\u00e9nesis", "1300": "Socopur Selva" };

export function textoSociedad(codigo: string): string {
	return NOMBRE_SOCIEDAD[codigo] ? `${codigo} ${NOMBRE_SOCIEDAD[codigo]}` : codigo;
}

/** Sociedades distintas que traen los empleados, ordenadas por codigo, como opciones de lista. */
export function sociedadesDe(empleados: { Bukrs?: string }[]): OpcionVendedor[] {
	return [...new Set(empleados.map((e) => e.Bukrs ?? "").filter(Boolean))].sort().map((c) => ({ key: c, text: textoSociedad(c) }));
}

/** Lee las sociedades que existen entre los empleados activos de HCM (una sola lectura liviana: solo el campo Bukrs). */
export async function cargarSociedades(modelo: ODataModel): Promise<OpcionVendedor[]> {
	const filas = await modelo.bindList("/Empleado", undefined, undefined, undefined, { $select: "Pernr,Bukrs" }).requestContexts(0, 3000);
	return sociedadesDe(filas.map((c) => c.getObject() as { Bukrs?: string }));
}

/** Busca empleados activos de HCM por nombre o PERNR (maximo 20). Vacio si el texto es muy corto. */
export async function buscarEmpleados(modelo: ODataModel, texto: string, sociedad = "", maximo = 20): Promise<Empleado[]> {
	const t = texto.trim();
	if (t.length < MINIMO_BUSQUEDA && !/^\d+$/.test(t)) {
		return [];
	}
	if (!t) {
		return [];
	}
	const filas = await modelo.bindList("/Empleado", undefined, undefined, undefined, { $filter: filtroEmpleado(t, sociedad), $orderby: "Nombre" }).requestContexts(0, maximo);
	return filas.map((c) => {
		const e = c.getObject() as EmpleadoSap;
		return { pernr: normalizarPernr(e.Pernr), nombre: e.Nombre ?? e.Pernr, sociedad: e.Bukrs ?? "" };
	});
}

export interface OpcionVendedor {
	key: string;
	text: string;
}

const SOCIEDADES_ORG: { sociedad: string; nombre: string }[] = [
	{ sociedad: "1100", nombre: "Socopur" },
	{ sociedad: "1200", nombre: "Promogesa" },
	{ sociedad: "1300", nombre: "Socopur Selva" }
];

/**
 * Organizaciones de venta de una sociedad: siempre tres, con la numeracion de la sociedad. 1100 -> 1101 Vehiculos, 1102 Taller y
 * 1103 Repuestos; 1200 -> 1201, 1202, 1203; 1300 -> 1301, 1302, 1303. Sin sociedad, las de todas.
 */
export function organizacionesDeSociedad(sociedad: string): OpcionVendedor[] {
	return SOCIEDADES_ORG.filter((s) => !sociedad || s.sociedad === sociedad).flatMap((s) => {
		const base = s.sociedad.slice(0, 2);
		return [
			{ key: `${base}01`, text: `${base}01 Veh\u00edculos ${s.nombre}` },
			{ key: `${base}02`, text: `${base}02 Taller ${s.nombre}` },
			{ key: `${base}03`, text: `${base}03 Repuestos ${s.nombre}` }
		];
	});
}

/** "1203 Repuestos Promogesa" para una organizacion conocida; si no se conoce, solo el codigo. */
export function textoOrganizacion(vkorg: string): string {
	return organizacionesDeSociedad("").find((o) => o.key === vkorg)?.text ?? vkorg;
}

/** Organizacion que se propone segun el tipo de venta: repuestos 1X03, vehiculos 1X01 (X = digito de la sociedad). Sin sociedad, la de Socopur. */
export function orgPorDefecto(tipo: string, sociedad: string): string {
	const base = (sociedad || "1100").slice(0, 2);
	return tipo === "vehiculos" ? `${base}01` : `${base}03`;
}
