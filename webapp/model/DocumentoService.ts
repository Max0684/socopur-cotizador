import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { entidadTieneCampo } from "./CamposServicio";

/**
 * Datos de SUNAT (RUC) o RENIEC (DNI) para el alta de cliente: entidad DocumentoIdentidad (YC_COTIZ_DOCID, Story 1.2). La consulta a
 * tools.devex.pe la hace SAP, para que el token no viaje al navegador. Si no hay conexion o el numero no existe, SAP responde Ok = false
 * con el motivo y el alta sigue a mano. Departamento, provincia y distrito llegan con los nombres del catalogo de ubigeo de SAP.
 */
export interface DatosDocumento {
	ok: boolean;
	mensaje: string;
	nombre: string;
	direccion: string;
	departamento: string;
	provincia: string;
	distrito: string;
	ubigeo: string;
	estado: string;
	condicion: string;
	/** DNI: por separado para el alta de persona; vacios si SAP no los trae (servicio anterior al 29/10/2026 noche). */
	nombres: string;
	apePat: string;
	apeMat: string;
}

interface FilaDocumento {
	Ok?: boolean | string;
	Mensaje?: string;
	Nombre?: string;
	Direccion?: string;
	Departamento?: string;
	Provincia?: string;
	Distrito?: string;
	Ubigeo?: string;
	Estado?: string;
	Condicion?: string;
	Nombres?: string;
	ApellidoPaterno?: string;
	ApellidoMaterno?: string;
}

/** El servicio publica la consulta de RUC/DNI (SAP del 29/10/2026 en adelante). */
export function documentoPublicado(modelo: ODataModel): Promise<boolean> {
	return entidadTieneCampo(modelo, "DocumentoIdentidad", "Nombre");
}

/** RUC o DNI: el elegido en el formulario o, si no, por el largo del numero (11 = RUC). */
export function tipoDeDocumento(numero: string, elegido?: string): "RUC" | "DNI" {
	if (elegido === "RUC" || elegido === "DNI") {
		return elegido;
	}
	return numero.trim().length === 11 ? "RUC" : "DNI";
}

export function filtroDocumento(tipo: string, numero: string): string {
	return `TipoDoc eq '${tipo.replace(/'/g, "''")}' and Numero eq '${numero.trim().replace(/'/g, "''")}'`;
}

export function datosDeFila(f: FilaDocumento): DatosDocumento {
	const texto = (v?: string): string => (v ?? "").trim();
	return {
		ok: f.Ok === true || f.Ok === "X",
		mensaje: texto(f.Mensaje),
		nombre: texto(f.Nombre),
		direccion: texto(f.Direccion),
		departamento: texto(f.Departamento),
		provincia: texto(f.Provincia),
		distrito: texto(f.Distrito),
		ubigeo: texto(f.Ubigeo),
		estado: texto(f.Estado),
		condicion: texto(f.Condicion),
		nombres: texto(f.Nombres),
		apePat: texto(f.ApellidoPaterno),
		apeMat: texto(f.ApellidoMaterno)
	};
}

/** RUC dado de baja o no habido: los datos sirven, pero el vendedor debe verlo antes de dar de alta al cliente. */
export function conAdvertencia(d: DatosDocumento): boolean {
	const normal = (v: string): string => v.trim().toUpperCase();
	return (!!d.estado && normal(d.estado) !== "ACTIVO") || (!!d.condicion && normal(d.condicion) !== "HABIDO");
}

export async function consultarDocumento(modelo: ODataModel, tipo: string, numero: string): Promise<DatosDocumento> {
	const contextos = await modelo.bindList("/DocumentoIdentidad", undefined, undefined, undefined, { $filter: filtroDocumento(tipo, numero) }).requestContexts(0, 1);
	const fila = contextos[0]?.getObject() as FilaDocumento | undefined;
	return fila ? datosDeFila(fila) : datosDeFila({ Ok: false, Mensaje: "SAP no respondio la consulta" });
}
