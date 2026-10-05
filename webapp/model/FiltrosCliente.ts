const comillas = (texto: string): string => texto.replace(/'/g, "''");

/**
 * $filter para buscar clientes en una o varias organizaciones de venta. Por documento o numero de cliente es exacto; por nombre, cada
 * palabra debe aparecer en el nombre 1 o en el 2 (en cualquier orden y en mayusculas): "racing motors" encuentra "MOTORS RACING SAC"
 * y los nombres repartidos entre los dos campos. Texto vacio: sin filtro ("").
 */
export function filtroClientes(texto: string, vkorg: string | string[]): string {
	const t = comillas(texto.trim());
	if (!t) {
		return "";
	}
	const orgs = [...new Set(Array.isArray(vkorg) ? vkorg : [vkorg])].filter(Boolean);
	const porOrg = orgs.length === 1 ? `Vkorg eq '${comillas(orgs[0])}'` : `(${orgs.map((o) => `Vkorg eq '${comillas(o)}'`).join(" or ")})`;
	const palabras = t.toUpperCase().split(/\s+/).filter(Boolean);
	const porNombre = palabras.map((p) => `(contains(Name1,'${p}') or contains(Name2,'${p}'))`).join(" and ");
	return `${porOrg} and (Stcd1 eq '${t}' or Stcd2 eq '${t}' or Kunnr eq '${t.padStart(10, "0")}' or (${porNombre}))`;
}
