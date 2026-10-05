const comillas = (texto: string): string => texto.replace(/'/g, "''");

/**
 * $filter para buscar clientes (sin organizacion: en todas; con una o varias: solo en ellas). Por documento o numero de cliente es exacto; por nombre, cada
 * palabra debe aparecer en el nombre 1 o en el 2 (en cualquier orden y en mayusculas): "racing motors" encuentra "MOTORS RACING SAC"
 * y los nombres repartidos entre los dos campos. Texto vacio: sin filtro ("").
 */
/**
 * Palabras del nombre para buscar, tolerantes a como esta escrito en SAP: se quitan apostrofos y signos ("MOTOR'S S.A.C." -> MOTORS S A C) y las
 * palabras largas terminadas en S pierden esa S, para que "motors" encuentre "MOTOR'S" y tambien "MOTORS". Se descartan las de una sola letra.
 */
export function palabrasDeNombre(texto: string): string[] {
	return texto
		.toUpperCase()
		.replace(/['’`´]/g, "")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.split(" ")
		.filter((p) => p.length > 1)
		.map((p) => (p.length >= 5 && p.endsWith("S") ? p.slice(0, -1) : p));
}

export function filtroClientes(texto: string, vkorg: string | string[] = []): string {
	const t = comillas(texto.trim());
	if (!t) {
		return "";
	}
	const orgs = [...new Set(Array.isArray(vkorg) ? vkorg : [vkorg])].filter(Boolean);
	// Sin organizacion se busca en TODAS: el cliente es de toda la empresa; en que area esta dado de alta se revisa despues.
	const porOrg = orgs.length === 0 ? "" : orgs.length === 1 ? `Vkorg eq '${comillas(orgs[0])}' and ` : `(${orgs.map((o) => `Vkorg eq '${comillas(o)}'`).join(" or ")}) and `;
	const palabras = palabrasDeNombre(texto);
	const porNombre = palabras.map((p) => `(contains(Name1,'${p}') or contains(Name2,'${p}'))`).join(" and ");
	// El numero de cliente (Kunnr) mide 10 caracteres: un valor mas largo (p. ej. un RUC de 11 digitos) no se le manda, porque SAP puede
	// rechazar toda la consulta por valor demasiado largo. Textos de 10 o menos se completan con ceros a la izquierda.
	const porCliente = t.length <= 10 ? ` or Kunnr eq '${t.padStart(10, "0")}'` : "";
	return `${porOrg}(Stcd1 eq '${t}' or Stcd2 eq '${t}'${porCliente} or ${palabras.length ? `(${porNombre})` : "false"})`;
}
