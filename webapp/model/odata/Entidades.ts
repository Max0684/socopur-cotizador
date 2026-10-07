// GENERADO por scripts/gen-odata-types.mjs desde localService/mainService/metadata.xml. No editar a mano.
// Servicio: YUI_COTIZ_SRV (OData V4). Decimal, Date y DateTimeOffset llegan como string en UI5.

/** Claves: Segmento1 */
export interface Linea {
	Segmento1: string;
	Descripcion: string;
}

/** Claves: Kunnr, Vkorg, Vtweg, Spart, Auart, Matnr, Werks, Waers, Cantidad, Indice */
export interface PrecioCond {
	Kunnr: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Auart: string;
	Matnr: string;
	Werks: string;
	Waers: string;
	Cantidad: string;
	Indice: number;
	Varcond: string;
	CondType: string;
	Valor: string;
	Moneda: string;
	Unidad: string;
	Base: string;
	Total: string;
	Escala: string;
	/** Campos agregados el 06/10/2026 (pueden faltar en un servicio anterior). */
	Descripcion?: string;
	UmPrecio?: string;
	MonedaDoc?: string;
	Manual?: string;
	Paso?: string;
	Contador?: string;
	TipoCalculo?: string;
	Inactiva?: string;
	Estadistica?: string;
}

/** Claves: Vkorg, Vtweg, Matnr, Werks, Lgort */
export interface MaterialAtp {
	Vkorg: string;
	Vtweg: string;
	Matnr: string;
	Werks: string;
	Lgort: string;
	Meins: string;
	StockLibre: string;
	Disponible: string;
	Comprometido: string;
	Respuesta: number;
}

/** Claves: Vbeln */
export interface Oferta {
	Vbeln: string;
	Auart: string;
	Kunnr: string;
	ClienteNombre: string;
	Erdat?: string;
	Audat?: string;
	Angdt?: string;
	Bnddt?: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Vkbur: string;
	Netwr: string;
	Waerk: string;
	ImpuestoTotal: string;
	Total: string;
	_Pos?: OfertaPos[];
}

/** Claves: CotizId, PartnRole, IsActiveEntity */
export interface Direc {
	CotizId: string;
	PartnRole: string;
	Title: string;
	Name1: string;
	Name2: string;
	Street: string;
	HouseNum1: string;
	City2: string;
	PostCode1: string;
	City1: string;
	Country: string;
	Region: string;
	Langu: string;
	TelNumber: string;
	TelExtens: string;
	SmtpAddr: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: Direc;
	_Cotizacion?: Cotizacion;
}

/** Claves: Kunnr, Vkorg, Vtweg, Spart, Auart, Matnr, Werks, Waers, Cantidad */
export interface Precio {
	Kunnr: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Auart: string;
	Matnr: string;
	Werks: string;
	Waers: string;
	Cantidad: string;
	Fecha?: string;
	Varcond: string;
	Moneda: string;
	PrecioLista: string;
	PrecioUnitario: string;
	Neto: string;
	Impuestos: string;
	Respuesta: number;
	Mensaje: string;
}

/** Claves: Vkorg, Vtweg, Matnr */
export interface Material {
	Vkorg: string;
	Vtweg: string;
	Matnr: string;
	Maktx: string;
	Meins: string;
	Matkl: string;
	Segmento1: string;
	Segmento2: string;
	Segmento3: string;
	DescLinea: string;
	DescClase: string;
	DescFamilia: string;
	Marca: string;
	Spart: string;
	SpartCabecera: string;
	Mtart: string;
	Vmsta: string;
}

/** Claves: CotizId, Posnr, Atnam, IsActiveEntity */
export interface ItemCar {
	CotizId: string;
	Posnr: string;
	Atnam: string;
	Atwrt: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: ItemCar;
	_Cotizacion?: Cotizacion;
	_Item?: Item;
}

/** Claves: CotizId, GrupoNo */
export interface GrupoEstado {
	CotizId: string;
	GrupoNo: string;
	VbelnPedido: string;
	EstadoCredito: string;
	BloqueoEntrega: string;
	BloqueoFactura: string;
	Liberado: string;
	MonedaPedido: string;
	NetoPedido: string;
	ImpuestoPedido: string;
	TotalPedido: string;
	/** 'X' si el pedido esta rechazado en SAP (VBAK-ABSTK = C); vacio en un grupo ya anulado (Estado X), que no tiene pedido. */
	Rechazado?: string;
}

/** Claves: Vkorg, Vtweg, Matnr, Werks, Lgort */
export interface MaterialCentro {
	Vkorg: string;
	Vtweg: string;
	Matnr: string;
	Werks: string;
	Lgort: string;
	NombreCentro: string;
	Meins: string;
	StockLibre: string;
}

/** Claves: CotizId, GrupoNo, IsActiveEntity */
export interface Grupo {
	CotizId: string;
	GrupoNo: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Vkbur: string;
	Modalidad: string;
	AuartOferta: string;
	AuartPedido: string;
	VbelnOferta: string;
	VbelnPedido: string;
	VigenciaHasta?: string;
	Estado: string;
	Liberacion: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: Grupo;
	_Cotizacion?: Cotizacion;
	_Estado?: GrupoEstado;
}

/** Claves: Modalidad */
export interface Modalidad {
	Modalidad: string;
	Descripcion: string;
	Tipo: string;
	AuartOferta: string;
	AuartPedido: string;
	Vtweg: string;
	SinCargo: string;
	RequiereAprob: string;
	Activo: string;
	Confirmado: string;
}

/** Claves: Segmento1, Segmento2, Segmento3 */
export interface Familia {
	Segmento1: string;
	Segmento2: string;
	Segmento3: string;
	Descripcion: string;
}

/** Claves: CotizId, Posnr, CondType, IsActiveEntity */
export interface ItemCond {
	CotizId: string;
	Posnr: string;
	CondType: string;
	CondStNo: string;
	CondCount: string;
	CondValue: string;
	Currency: string;
	Structcond: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: ItemCond;
	_Cotizacion?: Cotizacion;
	_Item?: Item;
}

/** Claves: Vkorg, Vtweg, Vkbur */
export interface Oficina {
	Vkorg: string;
	Vtweg: string;
	Vkbur: string;
	NombreOficina: string;
}

/** Claves: Segmento1, Segmento2 */
export interface Clase {
	Segmento1: string;
	Segmento2: string;
	Descripcion: string;
}

/** Claves: Vkorg, Vtweg, Vhcle */
export interface Vehiculo {
	Vkorg: string;
	Vtweg: string;
	Vhcle: string;
	Vhvin: string;
	Matnr: string;
	Maktx: string;
	Charg: string;
	Werks: string;
	NombreCentro: string;
	Lgort: string;
	Avail: string;
	AvailTxt: string;
	Sdsta: string;
	SdstaTxt: string;
	Mmsta: string;
	MmstaTxt: string;
	Color: string;
	ColorTxt: string;
	AnoModelo: string;
	Condicion: string;
	VersionModelo: string;
	Variante: string;
	Meins: string;
	StockLote: string;
	Segmento1: string;
	Segmento2: string;
	DescLinea: string;
	DescClase: string;
	Marca: string;
	Spart: string;
	SpartCabecera: string;
	/** Fecha de ingreso del vehiculo (creacion del lote, MCHA-ERSDA). aaaa-mm-dd */
	IngresoFecha: string;
	Mtart: string;
}

/** Claves: DraftUUID, DraftEntityType */
export interface I_DraftAdministrativeData {
	DraftUUID: string;
	DraftEntityType: string;
	CreationDateTime?: string;
	CreatedByUser: string;
	LastChangeDateTime?: string;
	LastChangedByUser: string;
	DraftAccessType: string;
	ProcessingStartDateTime?: string;
	InProcessByUser: string;
	DraftIsKeptByUser: boolean;
	EnqueueStartDateTime?: string;
	DraftIsCreatedByMe: boolean;
	DraftIsLastChangedByMe: boolean;
	DraftIsProcessedByMe: boolean;
	CreatedByUserDescription: string;
	LastChangedByUserDescription: string;
	InProcessByUserDescription: string;
}

/** Claves: Kunnr, Vkorg, Vtweg, Spart */
export interface Cliente {
	Kunnr: string;
	Vkorg: string;
	Vtweg: string;
	Spart: string;
	Kdgrp: string;
	Zterm: string;
	Vsbed: string;
	Aufsd: string;
	Name1: string;
	Name2: string;
	Stcd1: string;
	Stcd2: string;
	Land1: string;
	Ort01: string;
	Stras: string;
	Sperr: boolean;
	Loevm: boolean;
}

/** Claves: CotizId, IsActiveEntity */
export interface Cotizacion {
	CotizId: string;
	Kunnr: string;
	Pernr: string;
	Estado: string;
	Waers: string;
	Comentario: string;
	Zterm: string;
	Vsbed: string;
	TipoEntrega: string;
	FechaEntrega?: string;
	KunnrWe: string;
	AddrnumberWe: string;
	KunnrZt: string;
	AddrnumberZt: string;
	Kostl: string;
	Augru: string;
	LocalCreatedAt?: string;
	LocalLastChangedAt?: string;
	LastChangedAt?: string;
	ClienteNombre: string;
	ClienteStcd1: string;
	ClienteStcd2: string;
	NumeroOferta: string;
	NumeroPedido: string;
	VigenciaHasta?: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: Cotizacion;
	_Direc?: Direc[];
	_Grupo?: Grupo[];
	_Item?: Item[];
}

/** Claves: CotizId, Posnr, IsActiveEntity */
export interface Item {
	CotizId: string;
	Posnr: string;
	GrupoNo: string;
	Matnr: string;
	Cantidad: string;
	Meins: string;
	Werks: string;
	Lgort: string;
	Bonif: string;
	PosnrPadre: string;
	Vhcle: string;
	Vhvin: string;
	Color: string;
	ColorTxt: string;
	Variante: string;
	/** Solo lectura (publicado el 06/10/2026): P pendiente, V vinculado en VELO, E error, vacio sin VIN. Puede faltar en un servicio anterior. */
	VinculoEstado?: string;
	PrecioLista: string;
	Waers: string;
	HasDraftEntity: boolean;
	DraftEntityCreationDateTime?: string;
	DraftEntityLastChangeDateTime?: string;
	HasActiveEntity: boolean;
	IsActiveEntity: boolean;
	DraftAdministrativeData?: I_DraftAdministrativeData;
	SiblingEntity?: Item;
	_Car?: ItemCar[];
	_Cond?: ItemCond[];
	_Cotizacion?: Cotizacion;
	_Grupo?: Grupo;
}

/** Claves: Vbeln, Posnr */
export interface OfertaPos {
	Vbeln: string;
	Posnr: string;
	Matnr: string;
	Arktx: string;
	Kwmeng: string;
	Vrkme: string;
	Werks: string;
	Lgort: string;
	Netpr: string;
	Netwr: string;
	Waerk: string;
	Uepos: string;
	Pstyv: string;
	Mwsbp: string;
	Mwsk1: string;
	TasaIgv: string;
	_Oferta?: Oferta;
}

/** Claves: Vkorg, Vtweg, Werks */
export interface Centro {
	Vkorg: string;
	Vtweg: string;
	Werks: string;
	NombreCentro: string;
}

/** Nombre del conjunto de entidades -> tipo. */
export interface ConjuntosCotizador {
	Centro: Centro;
	Clase: Clase;
	Cliente: Cliente;
	Cotizacion: Cotizacion;
	Direc: Direc;
	Familia: Familia;
	Grupo: Grupo;
	GrupoEstado: GrupoEstado;
	Item: Item;
	ItemCar: ItemCar;
	ItemCond: ItemCond;
	I_DraftAdministrativeData: I_DraftAdministrativeData;
	Linea: Linea;
	Material: Material;
	MaterialAtp: MaterialAtp;
	MaterialCentro: MaterialCentro;
	Modalidad: Modalidad;
	Oferta: Oferta;
	OfertaPos: OfertaPos;
	Oficina: Oficina;
	Precio: Precio;
	PrecioCond: PrecioCond;
	Vehiculo: Vehiculo;
}
