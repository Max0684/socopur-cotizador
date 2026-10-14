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
