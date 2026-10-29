/**
 * Correo con que la persona entro a Work Zone (BTP). El conector a SAP entra con un usuario tecnico compartido: este correo viaja con
 * cada guardado y cada accion para que el historial de SAP (YCOTIZ_LOG) diga quien hizo cada cambio.
 * Fuentes, en orden: el servicio UserInfo del launchpad y, si no esta, la ruta /user-api del approuter (xs-app.json). Fuera de BTP
 * (index.html local) no hay sesion y devuelve "": el historial queda solo con el usuario tecnico.
 */
export interface FuentesUsuario {
	launchpad?: () => Promise<string>;
	userApi?: () => Promise<string>;
}

interface ContenedorShell {
	getServiceAsync?: (nombre: string) => Promise<{ getEmail?: () => string } | undefined>;
}

/** Correo valido en minusculas (cabe en AD_SMTPADR, 241); "" si no parece un correo. */
export function normalizarCorreo(valor: unknown): string {
	const texto = String(valor ?? "")
		.trim()
		.toLowerCase();
	return /^[^\s@]+@[^\s@]+$/.test(texto) ? texto.slice(0, 241) : "";
}

/** Primer correo valido de las fuentes; una fuente que falla o no trae correo da paso a la siguiente. */
export async function obtenerCorreo(fuentes: FuentesUsuario): Promise<string> {
	for (const fuente of [fuentes.launchpad, fuentes.userApi]) {
		if (!fuente) {
			continue;
		}
		try {
			const correo = normalizarCorreo(await fuente());
			if (correo) {
				return correo;
			}
		} catch {
			// siguiente fuente
		}
	}
	return "";
}

/** Work Zone carga sap/ushell/Container; si la app corre sola no esta y no se pide (no se fuerza la carga). */
async function correoDelLaunchpad(): Promise<string> {
	const contenedor = sap.ui.require("sap/ushell/Container") as ContenedorShell | undefined;
	if (!contenedor?.getServiceAsync) {
		return "";
	}
	const info = await contenedor.getServiceAsync("UserInfo");
	return info?.getEmail?.() ?? "";
}

/** Usuario del approuter administrado de BTP (ruta ^/user-api del xs-app.json, servicio sap-approuter-userapi). */
async function correoDelApprouter(): Promise<string> {
	const respuesta = await fetch(sap.ui.require.toUrl("com/socopur/cotizador/user-api/currentUser"), { credentials: "include" });
	if (!respuesta.ok) {
		return "";
	}
	return ((await respuesta.json()) as { email?: string }).email ?? "";
}

let correoEnCache: Promise<string> | undefined;

/** Correo de la sesion BTP actual, leido una sola vez por carga de la app. */
export function correoUsuarioBtp(): Promise<string> {
	correoEnCache ??= obtenerCorreo({ launchpad: correoDelLaunchpad, userApi: correoDelApprouter });
	return correoEnCache;
}
