import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { ordenarPorTexto } from "com/socopur/cotizador/model/Orden";

/** Fila de la vista YI_COTIZ_MODALIDAD (tabla YCOTIZ_MODAL). */
interface ModalidadSap {
	Modalidad: string;
	Descripcion?: string;
	Tipo?: string;
	AuartOferta?: string;
	AuartPedido?: string;
	Vtweg?: string;
	SinCargo?: string;
	RequiereAprob?: string;
	Activo?: string;
	Confirmado?: string;
}

/** Modalidad con la forma que usa la pantalla (mock.json: /modalidades). */
export interface ModalidadPantalla {
	key: string;
	texto: string;
	tipo: string;
	canal: string;
	claseOferta: string;
	clasePedido: string;
	expedicion: string;
	nota: string;
	sinCargo?: boolean;
	requiereAprobacion?: boolean;
	confirmada?: boolean;
}

/**
 * Lee las modalidades ACTIVAS de SAP y las combina con las del prototipo (por clave): de SAP salen la descripcion,
 * el tipo, el canal y las clases de oferta y pedido; del prototipo se conservan la expedicion y la nota, que la tabla
 * todavia no guarda. Una modalidad que existe en SAP pero no en el prototipo se agrega con valores por defecto.
 */
export async function cargarModalidades(modelo: ODataModel, prototipo: ModalidadPantalla[]): Promise<ModalidadPantalla[]> {
	const binding = modelo.bindList("/Modalidad", undefined, undefined, undefined, {
		$filter: "Activo eq 'X'",
		$orderby: "Modalidad"
	});
	const contextos = await binding.requestContexts(0, 100);
	const lista = contextos.map((contexto) => {
		const m = contexto.getObject() as ModalidadSap;
		const key = m.Modalidad.toLowerCase();
		const base = prototipo.find((p) => p.key === key);
		return {
			key,
			texto: m.Descripcion ?? base?.texto ?? m.Modalidad,
			tipo: m.Tipo === "V" ? "vehiculos" : "repuestos",
			canal: base?.canal.startsWith(m.Vtweg ?? "?") ? base.canal : (m.Vtweg ?? ""),
			claseOferta: m.AuartOferta ?? "",
			clasePedido: m.AuartPedido ?? "",
			expedicion: base?.expedicion ?? "recojo",
			nota: base?.nota ?? "",
			sinCargo: m.SinCargo === "X",
			requiereAprobacion: m.RequiereAprob === "X",
			confirmada: m.Confirmado === "X"
		};
	});
	return ordenarPorTexto(lista, (m) => m.texto);
}
