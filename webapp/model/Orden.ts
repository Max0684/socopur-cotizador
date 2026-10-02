import JSONModel from "sap/ui/model/json/JSONModel";

/** Comparador alfabetico en espanol: ignora mayusculas y tildes y ordena los numeros por su valor (2 antes que 10). */
const colador = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** Quita comillas o simbolos iniciales y el codigo inicial de los textos tipo "02 - Cascos" o "G - Indumentaria", para ordenar por la descripcion. */
function sinCodigo(texto: string): string {
	return texto.replace(/^\S+\s+[–—-]\s+/, "").replace(/^[^\p{L}\p{N}]+/u, "");
}

/**
 * Ordena una lista alfabeticamente por el texto que devuelve `texto`. Devuelve una copia.
 * Las opciones "vacias" (clave vacia: "Todos", "Ninguno") se mantienen primero, como en cualquier desplegable.
 */
export function ordenarPorTexto<T>(lista: readonly T[], texto: (x: T) => string, esVacia: (x: T) => boolean = () => false): T[] {
	return [...lista].sort((a, b) => {
		const va = esVacia(a);
		const vb = esVacia(b);
		if (va !== vb) {
			return va ? -1 : 1;
		}
		return colador.compare(sinCodigo(texto(a) ?? ""), sinCodigo(texto(b) ?? ""));
	});
}

interface Opcion {
	key: string;
	text: string;
}

const porOpcion = (lista: Opcion[]): Opcion[] => ordenarPorTexto(lista, (o) => o.text, (o) => o.key === "");

/**
 * Ordena alfabeticamente, una sola vez al cargar, los catalogos del modelo de ejemplo que alimentan las listas
 * desplegables (formas de pago, tipos, ubigeo, transportistas y sus sedes, segmentos, sectores, canales y modalidades).
 * Las listas con un orden propio (lineas de una oferta, tallas, movimientos, ofertas por fecha) no se tocan.
 */
export function ordenarCatalogos(modelo: JSONModel): void {
	const d = modelo.getData() as Record<string, unknown>;
	const lista = <T>(clave: string): T[] | undefined => (Array.isArray(d[clave]) ? (d[clave] as T[]) : undefined);

	const asignar = <T>(clave: string, nueva: T[] | undefined): void => {
		if (nueva) {
			d[clave] = nueva;
		}
	};

	asignar("formasPago", (() => { const l = lista<Opcion>("formasPago"); return l && porOpcion(l); })());
	asignar("tiposCliente", (() => { const l = lista<Opcion>("tiposCliente"); return l && porOpcion(l); })());
	asignar("canalesArea", (() => { const l = lista<Opcion>("canalesArea"); return l && porOpcion(l); })());

	const transportistas = lista<{ key: string; text: string; sedes?: Opcion[] }>("transportistas");
	asignar(
		"transportistas",
		transportistas &&
			ordenarPorTexto(transportistas, (t) => t.text).map((t) => ({ ...t, sedes: t.sedes ? porOpcion(t.sedes) : t.sedes }))
	);

	const modalidades = lista<{ key: string; texto: string }>("modalidades");
	asignar("modalidades", modalidades && ordenarPorTexto(modalidades, (m) => m.texto));

	const ubigeo = lista<{ dep: string; provincias: { prov: string; distritos: string[] }[] }>("ubigeo");
	asignar(
		"ubigeo",
		ubigeo &&
			ordenarPorTexto(ubigeo, (u) => u.dep).map((u) => ({
				...u,
				provincias: ordenarPorTexto(u.provincias, (p) => p.prov).map((p) => ({
					...p,
					distritos: ordenarPorTexto(p.distritos, (x) => x)
				}))
			}))
	);

	// Segmentos y sectores: mapas de clave -> lista de opciones.
	for (const grupo of ["segmentos", "sectores"]) {
		const mapa = d[grupo] as Record<string, unknown> | undefined;
		if (!mapa) {
			continue;
		}
		for (const nombre of Object.keys(mapa)) {
			const valor = mapa[nombre];
			if (Array.isArray(valor)) {
				mapa[nombre] = porOpcion(valor as Opcion[]);
			} else if (valor && typeof valor === "object") {
				const interno = valor as Record<string, unknown>;
				for (const sub of Object.keys(interno)) {
					if (Array.isArray(interno[sub])) {
						interno[sub] = porOpcion(interno[sub] as Opcion[]);
					}
				}
			}
		}
	}
	modelo.refresh(true);
}
