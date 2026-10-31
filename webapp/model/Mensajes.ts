/**
 * Acceso a los mensajes de UI5 que funciona tambien con UI5 1.114 (servidor Fiori de Socopur).
 * `sap/ui/core/Messaging` existe solo desde UI5 1.118, asi que se usa el administrador de mensajes del Core, disponible en ambas versiones.
 */
function gestor(): ReturnType<ReturnType<typeof sap.ui.getCore>["getMessageManager"]> {
	return sap.ui.getCore().getMessageManager();
}

/** Borra los mensajes de validacion y de servidor que quedaron de la pantalla anterior. */
export function quitarTodosLosMensajes(): void {
	gestor().removeAllMessages();
}

/** Mensajes vigentes (los que el servidor o la validacion dejaron en el modelo de mensajes). */
export function mensajesVigentes(): { message?: string; technical?: boolean; type?: string }[] {
	return (gestor().getMessageModel().getData() as { message?: string; technical?: boolean; type?: string }[]) ?? [];
}

type Vigente = { message?: string; technical?: boolean; type?: string };

/**
 * Texto para el vendedor de un error al llamar a SAP. Un error del servicio (con status o error de OData, o el generico "$batch failed")
 * se explica con su causa o con los mensajes de error que el servidor dejo en el modelo. Un error propio (p. ej. el motivo que SAP dejo en
 * la cotizacion al rechazar el pedido) se muestra tal cual: los mensajes del modelo pueden ser de un intento anterior (pruebas del
 * 31/10/2026: al reintentar un pedido salia el dump del primer intento en vez del motivo real).
 */
export function motivoDeError(error: unknown, vigentes: () => Vigente[] = mensajesVigentes): string {
	const e = error as Error & { cause?: Error; status?: number; error?: unknown };
	const generico = e.message.includes("$batch failed");
	const delServicio = e.status !== undefined || e.error !== undefined || generico;
	const partes = [e.cause?.message ?? ""];
	if (!partes[0] && !delServicio) {
		return e.message;
	}
	if (!partes[0] || generico) {
		partes.push(...vigentes().filter((m) => m.type === "Error" && m.message && !m.message.includes("$batch failed")).map((m) => m.message as string));
	}
	const unicos = [...new Set(partes.filter(Boolean))];
	return unicos.length ? unicos.join(" | ") : e.message;
}
