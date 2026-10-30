import Controller from "sap/ui/core/mvc/Controller";
import { mensajesVigentes, quitarTodosLosMensajes } from "com/socopur/cotizador/model/Mensajes";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { cargarDetalleOferta } from "com/socopur/cotizador/model/OfertasService";
import type { GrupoEstado } from "com/socopur/cotizador/model/odata/Entidades";
import { leerCentros, leerOficinas } from "com/socopur/cotizador/model/CatalogosService";
import { buscarMateriales, cargarSegmentos, disponibilidadPorCentro, filasDeStockEnCentros, materialesDisponibles, stockEnCentros, type Disponibilidad } from "com/socopur/cotizador/model/MaterialesService";
import { entidadTieneCampo } from "com/socopur/cotizador/model/CamposServicio";
import { cargarFormasPago } from "com/socopur/cotizador/model/FormasPagoService";
import { consultarCondiciones, consultarEscalas, consultarPrecio, impuestosDeCondiciones, siguienteTramo, tramosDeEscalas, tramoVigente, type EscalaSap, type TramoPrecio } from "com/socopur/cotizador/model/PreciosService";
import { cantidadTxt, claveRegalos, consultarRegalos, faltanteStock, proximoRegalo, regalosQueAplican, zetaExcluidasPorZna0, type ConsultaRegalo, type PromoRegalo } from "com/socopur/cotizador/model/RegalosService";
import { type CondicionServicio, type FilaCondicion, descuentosAplicados, filasDeCondiciones } from "com/socopur/cotizador/model/Condiciones";
import { agruparVehiculos, buscarVehiculos, filtrarVehiculos, textoDetalleVehiculo } from "com/socopur/cotizador/model/VehiculosService";
import { areasOrgCanal, textoSolicitudAmpliacion, type CondicionArea, type OpcionAreaCliente, condicionDeArea, opcionesAreaCliente, almacenDeCentro, canalDe, centroValidoParaArea, faltaAreaDeVentas, gruposParaGuardar, igvExonerado, MODALIDAD_DESPACHO, modalidadParaEntrega, modalidadPorDefecto, oficinaDe, orgVehiculosDe, puedeVenderOtroCentro, sectorDeCabecera, sectoresDeLineas, sectorQueFalta, totalesDeOferta } from "com/socopur/cotizador/model/Reglas";
import { evaluarBloqueoPedido, type BloqueoPedido } from "com/socopur/cotizador/model/BloqueoPedido";
import { correoUsuarioBtp } from "com/socopur/cotizador/model/UsuarioBtp";
import { almacenDelNavegador, borrarRespaldo, claveRespaldo, guardarRespaldo, leerRespaldo, perfilRecuperado, siguienteContador, type DatosRespaldo, type Respaldo } from "com/socopur/cotizador/model/RespaldoOferta";
import { historialPublicado, leerHistorial, textoDetalle, textoLugar, textoOperacion } from "com/socopur/cotizador/model/HistorialService";
import { impresionPublicada, leerImpresion, leerPdfOferta, numerosParaImprimir, pdfPublicado } from "com/socopur/cotizador/model/ImpresionService";
import { fechaDdMmAaaa, htmlVehiculo, type TextosVehiculo } from "com/socopur/cotizador/model/ImpresionVehiculo";
import { leerTipoCambio, tipoCambioPublicado, tipoCambioTexto } from "com/socopur/cotizador/model/TipoCambioService";
import { asignarVinItem, crearPedidoGrupo, guardarCotizacion, leerDatosGuardados, leerEstadoPedido, leerVinsGrupo, leerVinsLibres, renovarCotizacion, OfertaEnProcesoError, type OfertaParaGuardar, type EntregaParaGuardar, ENVIO_UNICO, type VinAsignado, esperarVinculos, leerMotivoVinculo, anularGrupo } from "com/socopur/cotizador/model/CotizacionesService";
import { buscarClientes, type ClienteSap } from "com/socopur/cotizador/model/ClientesService";
import { AmpliacionEnProcesoError, ampliacionPublicada, ampliarRetail, filtrarPorOrg, leerAmpliacion, organizacionesDe, type EstadoAmpliacion, type FilaAmpliacion, type FilaPorOrg } from "com/socopur/cotizador/model/AmpliacionService";
import { tipoDocPorNumero, validarDocumento } from "com/socopur/cotizador/model/Documento";
import { conAdvertencia, consultarDocumento, documentoPublicado, tipoDeDocumento } from "com/socopur/cotizador/model/DocumentoService";
import { usarOData as usarODataActual } from "com/socopur/cotizador/model/Modo";
import { AltaEnProcesoError, cargarUbigeo, crearClienteSap, esPersona, leerBloqueoEdicion, leerCambiosCliente, modificarClienteSap, partirNombres, partirRazon, serviciosDeCliente, TIPO_CLIENTE, tiposClientePara, type CambiosCliente, type DatosAlta } from "com/socopur/cotizador/model/ClienteEscrituraService";
import { buscarRepuestosConStock, disponibilidadPorAlmacen, motivoVacio } from "com/socopur/cotizador/model/MaterialesService";
import { cargarPreciosLista, precioListaDisponible, textoPrecioLista } from "com/socopur/cotizador/model/PrecioListaService";
import { textoOrganizacion } from "com/socopur/cotizador/model/VendedoresService";
import { listaDeSede } from "com/socopur/cotizador/model/Ciudades";
import { ciudadPorClave, principalDe, sociedadDeCentro } from "com/socopur/cotizador/model/Ciudades";
import { cargarContacto, cargarDirecciones, cargarMovimientos, type Movimiento } from "com/socopur/cotizador/model/ClienteDetalleService";
import { cargarCreditoCliente, fechaLocalISO, resumirCredito, textoPorMoneda, type EstadoCuenta, type ResumenCredito } from "com/socopur/cotizador/model/CreditoClienteService";
import { cargarModalidades, type ModalidadPantalla } from "com/socopur/cotizador/model/ModalidadesService";
import { ordenarPorTexto } from "com/socopur/cotizador/model/Orden";
import { buscarTransportistas, buscarTransportistasMock, cargarSedes, leerTransportistaPorKunnr, leerTransportistaPorLifnr, type FilaTransportista, type SedeTransportista, type TransportistaMock } from "com/socopur/cotizador/model/TransportistasService";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import SearchField from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import Dialog from "sap/m/Dialog";
import TextArea from "sap/m/TextArea";
import Text from "sap/m/Text";
import Table from "sap/m/Table";
import Button from "sap/m/Button";
import Device from "sap/ui/Device";
import MessageToast from "sap/m/MessageToast";
import SelectDialog from "sap/m/SelectDialog";
import Filter from "sap/ui/model/Filter";
import ListBinding from "sap/ui/model/ListBinding";
import StandardListItem from "sap/m/StandardListItem";
import MessageBox from "sap/m/MessageBox";
import FileUploader from "sap/ui/unified/FileUploader";
import Fragment from "sap/ui/core/Fragment";
import { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import { Panel$ExpandEvent } from "sap/m/Panel";
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import type { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import ObjectPageLayout from "sap/uxap/ObjectPageLayout";


/** Clase de oferta con la que se consulta el precio al elegir un material (todas las modalidades de repuestos usan Z300). */
const CLASE_OFERTA_PRECIO = "Z300";
/** Clase de oferta con la que se pide el precio de un vehiculo (la tabla de modalidades dice Z100 para todas las VEH_*). */
const CLASE_OFERTA_PRECIO_VEH = "Z100";

interface Cliente {
	/** Numero de cliente SAP (solo en clientes leidos del servicio). */
	kunnr?: string;
	doc: string;
	tipoDoc: string;
	nombre: string;
	estado: string;
	estadoState: string;
	condicion: string;
	grupo: string;
	telefono: string;
	correo: string;
	direccion: string;
	lineaCredito?: number;
	areas?: string[];
	/** Condicion de pago, moneda y grupo de cada area de ventas del cliente (solo clientes leidos del servicio). */
	condicionesAreas?: CondicionArea[];
	direcciones?: Direccion[];
	estadoCuenta?: { saldo: number; vencido: number; movimientos: Record<string, string>[] };
	/** Credito y saldo reales de SAP (solo clientes leidos del servicio). */
	credito?: ResumenCredito;
	/** Partidas reales (abiertas y compensadas de los ultimos 12 meses). */
	movimientos?: Movimiento[];
}

interface LineaMock {
	grupo: string;
	orgVentas: string;
	sector: string;
	/** Sector propio del material, para recalcular el sector de cabecera si cambia el canal de la modalidad. */
	sectorMaterial?: string;
	material: string;
	denominacion: string;
	detalle: string;
	cantidad: number;
	precio: number;
}

interface Vehiculo {
	/** Fila leida de la entidad Vehiculo de SAP (no del catalogo de ejemplo). */
	origen?: string;
	vin?: string;
	colorTxt?: string;
	/** Precio unitario real de SAP en soles (se pide con el cliente elegido). */
	precioPenSap?: number;
	/** Variante (modelo + condicion + ano + color): con ella se pide el precio. */
	variante?: string;
	/** Centro y almacen donde esta el vehiculo. */
	centro?: string;
	almacen?: string;
	disponibilidad?: string;
	material: string;
	denominacion: string;
	marca: string;
	modelo: string;
	color: string;
	anio: number;
	condicion: string;
	stockMio: number;
	stockOtros: number;
	precioUsd: number;
	condicionPct: number;
	iscPct?: number;
	promocion: { nombre: string; monto: number } | null;
	orgVentas: string;
	sector: string;
	sectorTxt: string;
	sectorOferta: string;
	linea: string;
	clase: string;
	familia: string;
	grupo: string;
}

interface Repuesto {
	/** Fila leida de la entidad Material de SAP (no del catalogo de ejemplo). */
	origen?: string;
	/** Precio unitario real de SAP en soles (el de dolares va en precioUsd); se pide al elegir el material. */
	precioPenSap?: number;
	sinPrecio?: boolean;
	/** Condiciones de la simulacion de SAP para la cantidad elegida, y la lista que se muestra (sin las de valor cero salvo "Ver todas"). */
	condicionesSap?: CondicionServicio[];
	condiciones?: FilaCondicion[];
	escala?: { min: number; pct: number }[];
	material: string;
	denominacion: string;
	marca: string;
	disponible: number;
	comprometido: number;
	total: number;
	um: string;
	precioUsd: number;
	condicionPct: number;
	promocion: { nombre: string; monto: number } | null;
	orgVentas: string;
	sector: string;
	sectorTxt: string;
	sectorOferta: string;
	linea: string;
	clase: string;
	familia: string;
	grupo: string;
}

interface Opcion {
	key: string;
	text: string;
}

interface Segmentos {
	lineas: Record<string, Opcion[]>;
	clases: Record<string, Opcion[]>;
	familias: Record<string, Opcion[]>;
}

interface FilaStock {
	ubicacion: string;
	esMio: boolean;
	fisico: number;
	disponible: number;
	transito: number;
}

interface Vin {
	vin: string;
	ingreso: string;
	ubic: string;
	estado: string;
	reservadoPor?: string;
	hasta?: string;
}

interface FilaVin {
	material: string;
	denominacion: string;
	detalle: string;
	opciones: { key: string; text: string; enabled: boolean }[];
	/** Con la clave de la posicion cuando el VIN se elige entre los de SAP (key = Vhcle). */
	posnr?: string;
	vin: string;
	/** VIN ya reservado en la oferta: no se puede cambiar desde este dialogo. */
	fijo?: boolean;
}

interface Bonificacion {
	id: string;
	nombre: string;
	motos: string[];
	cantidad: number;
	vigenteHasta: string;
	tallas: { key: string; material: string }[];
}

interface XlsxLib {
	read(data: ArrayBuffer, opts: { type: string }): { SheetNames: string[]; Sheets: Record<string, unknown> };
	utils: {
		sheet_to_json(hoja: unknown, opts: Record<string, unknown>): unknown[];
		aoa_to_sheet(datos: unknown[][]): unknown;
		book_new(): unknown;
		book_append_sheet(libro: unknown, hoja: unknown, nombre: string): void;
	};
	writeFile(libro: unknown, nombre: string): void;
}

interface Linea extends LineaMock {
	total: number;
	/** Condiciones de la simulacion de SAP (precio, descuentos, impuestos) y la lista que se muestra como "Determinacion de precio". */
	condicionesSap?: CondicionServicio[];
	condiciones?: FilaCondicion[];
	/** Precios unitarios reales de SAP (solo lineas de materiales leidos de SAP). */
	precioPenSap?: number;
	precioUsdSap?: number;
	/** Solo lineas leidas de un documento SAP: precio unitario con impuestos (en ellas `precio` es el neto). Es el que se guarda. */
	precioFinal?: number;
	/** Linea elegida en la tabla: la determinacion de precio muestra solo esta (con 20 lineas o mas, todas juntas no se podian revisar). */
	verCondiciones?: boolean;
	/** true si al cambiar canal o cliente SAP no pudo dar el precio de esta linea: el precio mostrado es el anterior y no vale. */
	sinPrecioVigente?: boolean;
	/** Impuesto (IGV) real leido de SAP; sin valor mientras la oferta no se haya guardado. */
	impuesto?: number;
	/** ISC e IGV reales por separado (solo tras leer el documento SAP). */
	isc?: number;
	igvImporte?: number;
	totalConImpuestos?: number;
	/** Valor neto de la linea (sin impuestos) y el que se muestra en la columna del valor: el neto si se conoce; si no, el total. */
	totalNeto?: number;
	totalMostrado?: number;
	/** true si `total` ya incluye el IGV (precio final de la lista) y igvImporte / isc son lo que SAP extrae de el. */
	impuestoIncluido?: boolean;
	/** true si isc e igvImporte son la ESTIMACION de la simulacion de SAP antes de guardar (despues de guardar son los del documento). */
	impuestoEstimado?: boolean;
	iscPct?: number;
	unica?: boolean;
	/** Solo vehiculos de SAP: variante, centro y VIN del vehiculo elegido. */
	variante?: string;
	centroVeh?: string;
	almacenVeh?: string;
	vin?: string;
	uid?: string;
	bonificacion?: boolean;
	/** Regalo de promocion de repuestos (ZNA0/Zeta): no tiene talla. */
	sinTalla?: boolean;
	/** Solo regalos de promocion calculados antes de guardar: ZNA0 (SAP lo agrega solo) o ZETA (se envia). */
	mecanismo?: string;
	/** Solo regalos de promocion: sector del material de regalo (el de un regalo Zeta tambien se revisa en el area del cliente). */
	sectorRegalo?: string;
	/** Solo regalos de promocion: no hay stock suficiente en el almacen de la cabecera. Solo avisa, la oferta se guarda igual. */
	avisoStock?: string;
	/** Linea con promociones de SAP: la escala mas cercana que aun no alcanza y la venta cruzada que la ZNA0 deja sin efecto. */
	proximoRegalo?: string;
	origen?: string;
	talla?: string;
	tallas?: { key: string; text: string; enabled: boolean }[];
}

interface Modalidad {
	key: string;
	texto: string;
	tipo: string;
	canal: string;
	claseOferta: string;
	clasePedido: string;
	expedicion: string;
	nota: string;
}

interface Direccion {
	id: string;
	alias: string;
	tipo: string;
	texto: string;
	/** Destinatario y numero de direccion de SAP (solo en direcciones leidas del servicio). */
	kunn2?: string;
	addrnumber?: string;
}

/** El servicio devuelve unos numeros de oferta con ceros a la izquierda y otros sin ellos; se comparan sin ceros. */
const sinCeros = (n: string): string => (n ?? "").replace(/^0+/, "");

interface OfertaGuardada {
	numero: string;
	/** Solo cuando la oferta se guardo en SAP (?odata=1): clave de la cotizacion y del grupo para crear su pedido. */
	cotizId?: string;
	grupoNo?: string;
	titulo: string;
	lineas: Linea[];
	modalidad?: string;
	clasePedido?: string;
	total?: number;
	areaFalta?: boolean;
}

interface Liberacion {
	estado: string;
	texto: string;
	automatica: boolean;
	bloquea: boolean;
}

interface Grupo {
	clave: string;
	titulo: string;
	subtotal: number;
	lineas: Linea[];
	modalidad?: string;
	opciones?: Modalidad[];
	claseOferta?: string;
	clasePedido?: string;
	canal?: string;
	nota?: string;
	areaFalta?: boolean;
	areaAviso?: string;
	/** Condicion comercial del cliente en el area (organizacion/canal/sector) de este grupo, tal como esta en SAP (KNVV). */
	condicionArea?: string;
	/** Aviso cuando la moneda del area no es la de la oferta. */
	condicionAviso?: string;
	/** Impuestos del grupo (suma de sus lineas) cuando todas los traen: ISC, IGV y total con impuestos. */
	isc?: number;
	igv?: number;
	totalConImp?: number;
	/** Hay una linea elegida en la tabla: la determinacion de precio se abre y muestra solo esa. Sin elegir, el panel queda plegado. */
	lineaPrecio?: boolean;
	verPrecio?: boolean;
}

/**
 * Oferta (Object Page). El detalle es un carrito agrupado por organizacion de ventas + sector:
 * al guardar se genera una oferta por cada grupo (decision del 29/09/2026).
 * @namespace com.socopur.cotizador.controller
 */
export default class Oferta extends Controller {
	private router!: Router;
	private dialogoBusqueda?: Dialog;
	private dialogoStock?: Dialog;
	private dialogoSedes?: Dialog;
	private dialogoDetalle?: Dialog;
	/** Material del detalle abierto (su fila de la lista de elegidos); la cantidad y las condiciones se piden de nuevo a SAP al cambiarla. */
	private detalleMaterial?: Vehiculo & Repuesto & { tipo: string };
	private dialogoExcel?: Dialog;
	private dialogoValidar?: Dialog;
	private dialogoVistaOferta?: Dialog;
	private dialogosCliente: Record<string, Dialog> = {};
	private dialogoClienteActual?: Dialog;
	private contadorLinea = 0;
	/** Cada consulta de regalos lleva un turno: si mientras tanto cambio la cantidad, la respuesta vieja se descarta. */
	private turnoRegalos = 0;
	private turnoRegalosDetalle = 0;
	/** Tramos de precio por cantidad del material del detalle abierto: no dependen de la cantidad, se piden una vez al abrirlo. */
	private tramosDetalle: TramoPrecio[] = [];
	private turnoEscalasDetalle = 0;
	/** Regalos ya avisados por linea, para avisar solo cuando cambian. */
	private regalosAvisados = new Map<string, string>();
	private instantanea = "[]";
	private dialogoSolicitud?: Dialog;
	private dialogoVin?: Dialog;
	private dialogoHistorial?: Dialog;
	private dialogoImprimirSap?: Dialog;
	/** Direcciones blob de los PDF de SAP ya abiertos: se liberan al pedir otros. */
	private urlsPdf: string[] = [];
	/** Respaldo local de la oferta nueva: lo ultimo escrito (para no reescribir si nada cambio) y si hay una pregunta de recuperar abierta. */
	private ultimoRespaldo = "";
	private esperandoRespaldo = false;
	/** Solo se respalda mientras la ruta es la de oferta nueva: la vista sigue viva (con sus lineas) al volver a la lista. */
	private enOfertaNueva = false;
	private temporizadorRespaldo?: ReturnType<typeof setInterval>;

	public onInit(): void {
		this.router = (this.getOwnerComponent() as UIComponent).getRouter();
		this.getView()?.setModel(new JSONModel(this.crearOferta()), "oferta");
		// Ancho de pantalla: la barra inferior muestra menos datos en pantallas angostas (el desbordamiento automatico no alcanza)
		const dispositivo = new JSONModel({ ancho: Device.resize.width });
		this.getView()?.setModel(dispositivo, "device");
		Device.resize.attachHandler((p: { width: number }) => dispositivo.setProperty("/ancho", p.width));
		this.router.getRoute("nueva")?.attachPatternMatched(() => {
			this.cargar();
			this.irAlInicio();
		}, this);
		this.router.getRoute("oferta")?.attachPatternMatched((event: Route$PatternMatchedEvent) => {
			const args = event.getParameter("arguments") as { numero: string };
			this.cargar(args.numero);
			this.irAlInicio();
		}, this);
		this.router.attachRouteMatched((evento: Router$RouteMatchedEvent) => {
			this.enOfertaNueva = evento.getParameter("name") === "nueva";
		}, this);
		// Respaldo en el navegador de la oferta nueva: si se cierra antes de guardar, los articulos se recuperan al volver a entrar.
		this.temporizadorRespaldo = setInterval(() => this.respaldar(), 5000);
		globalThis.addEventListener?.("pagehide", () => this.respaldar());
	}

	public onExit(): void {
		if (this.temporizadorRespaldo) {
			clearInterval(this.temporizadorRespaldo);
		}
	}

	/** La pagina conserva la seccion y el scroll de la oferta anterior: cada oferta se abre desde arriba. */
	private irAlInicio(): void {
		const pagina = this.byId("ofertaPage") as ObjectPageLayout | undefined;
		const primera = pagina?.getSections()[0];
		if (pagina && primera) {
			pagina.setSelectedSection(primera.getId());
			pagina.scrollToSection(primera.getId(), 0);
		}
	}

	public formatMonto(valor: number): string {
		return typeof valor === "number"
			? valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			: "";
	}

	/** Si hay lineas sin guardar, pide confirmar antes de salir para no perder el trabajo. */
	public onCerrar(): void {
		const oferta = this.modeloOferta();
		const hayCambios =
			JSON.stringify(oferta.getProperty("/lineas") ?? []) !== this.instantanea &&
			!oferta.getProperty("/guardado/visible") &&
			((oferta.getProperty("/pedidos") as unknown[]) ?? []).length === 0;
		if (!hayCambios) {
			this.router.navTo("lista");
			return;
		}
		const i18n = this.i18n();
		MessageBox.confirm(i18n.getText("salirTexto") as string, {
			title: i18n.getText("salirTitulo") as string,
			actions: [i18n.getText("salirSeguir") as string, i18n.getText("salirDescartar") as string],
			emphasizedAction: i18n.getText("salirSeguir") as string,
			onClose: (accion: string) => {
				if (accion === i18n.getText("salirDescartar")) {
					this.descartarRespaldo();
					this.router.navTo("lista");
				}
			}
		});
	}

	/* ---------- Busqueda de material (paso 1) ---------- */

	public async onAbrirBusqueda(): Promise<void> {
		if (!this.dialogoBusqueda) {
			this.dialogoBusqueda = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.BuscarMaterial",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoBusqueda);
			this.dialogoBusqueda.setModel(new JSONModel(), "busqueda");
		}
		const tipo = (this.modeloMock().getProperty("/perfil/busqueda/tipo") as string) ?? "repuestos";
		this.modeloBusqueda().setData(this.busquedaInicial(tipo, false));
		this.dialogoBusqueda.open();
		void this.definirOrigenDeMateriales();
	}

	/**
	 * Con ?odata=1 y la entidad Material en el servicio, la busqueda de repuestos va a SAP. Si no, usa el catalogo de
	 * EJEMPLO (mock.json) y lo avisa en pantalla para que nadie lo confunda con materiales o precios reales.
	 */
	private async definirOrigenDeMateriales(): Promise<void> {
		const b = this.modeloBusqueda();
		let sap = false;
		if (this.usarOData()) {
			const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
			sap = odata ? await materialesDisponibles(odata) : false;
		}
		b.setProperty("/ejemplo", !sap);
		if (sap) {
			await this.cargarCombosSap();
		}
		b.setProperty("/avisoEjemplo", this.i18n().getText(this.usarOData() ? "catalogoEjemploAviso" : "catalogoEjemploAvisoLocal") as string);
	}

	/** Reinicia los filtros de busqueda sin perder de donde vienen los materiales (SAP o ejemplo) ni su aviso. */
	private reiniciarBusqueda(inicial: Record<string, unknown>): void {
		const b = this.modeloBusqueda();
		const origen = { ejemplo: b.getProperty("/ejemplo"), avisoEjemplo: b.getProperty("/avisoEjemplo") };
		b.setData({ ...inicial, ...origen });
	}

	/** Al cambiar de tipo se limpian los segmentos y los filtros: la busqueda siempre empieza sin nada elegido. */
	public onCambiaTipo(): void {
		const tipo = this.modeloBusqueda().getProperty("/tipo") as string;
		this.reiniciarBusqueda(this.busquedaInicial(tipo, false));
		this.limpiarSeleccion();
	}

	public onCambiaSegmento(): void {
		this.refrescarListas();
	}

	public onLimpiar(): void {
		const tipo = this.modeloBusqueda().getProperty("/tipo") as string;
		this.reiniciarBusqueda(this.busquedaInicial(tipo, false));
		this.limpiarSeleccion();
	}

	/**
	 * Igual que el programa actual: no busca sin al menos un filtro, y se busca con el boton.
	 * Con el catalogo real (decenas de miles de materiales) una busqueda en vivo no es viable.
	 */
	public async onBuscar(): Promise<void> {
		const b = this.modeloBusqueda();
		const g = (campo: string): string => String(b.getProperty(`/${campo}`) ?? "").trim();
		const tipo = g("tipo");
		const soloStock = b.getProperty("/soloStock") as boolean;
		const filtros = ["linea", "clase", "familia", "sector", "marca", "codigo", "descripcion", "texto", "color", "anio", "condicion"];
		const hayFiltro = filtros.some((f) => g(f) !== "");
		b.setProperty("/faltaFiltro", !hayFiltro);
		b.setProperty("/avisoVacio", "");
		b.setProperty("/motivoVacio", "");
		b.setProperty("/parcial", false);
		this.busquedaPrecios++;
		this.busquedaLista++;
		b.setProperty("/buscado", hayFiltro);
		b.setProperty("/elegido", null);
		this.limpiarSeleccion();
		b.setProperty("/filtrosAbiertos", !hayFiltro);
		b.setProperty("/resumen", this.resumenFiltros());
		if (!hayFiltro) {
			b.setProperty("/vehiculos", []);
			b.setProperty("/repuestos", []);
			return;
		}

		if (b.getProperty("/ejemplo") === false) {
			await (tipo === "vehiculos" ? this.buscarVehiculosEnSap(g) : this.buscarRepuestosEnSap(g));
			return;
		}

		const contiene = (valor: string, filtro: string): boolean =>
			!filtro || valor.toLowerCase().includes(filtro.toLowerCase());
		const igual = (valor: string, filtro: string): boolean => !filtro || valor === filtro;
		const catalogo = this.modeloMock().getProperty("/catalogo") as { vehiculos: Vehiculo[]; repuestos: Repuesto[] };

		if (tipo === "vehiculos") {
			b.setProperty(
				"/vehiculos",
				catalogo.vehiculos.filter(
					(v) =>
						igual(v.linea, g("linea")) &&
						igual(v.clase, g("clase")) &&
						igual(v.familia, g("familia")) &&
						igual(v.sector, g("sector")) &&
						contiene(v.material, g("codigo")) &&
						contiene(`${v.denominacion} ${v.modelo}`, g("descripcion")) &&
						contiene(`${v.denominacion} ${v.marca} ${v.modelo}`, g("texto")) &&
						contiene(v.color, g("color")) &&
						igual(String(v.anio), g("anio")) &&
						igual(v.condicion, g("condicion")) &&
						(!soloStock || v.stockMio + v.stockOtros > 0)
				)
			);
		} else {
			b.setProperty(
				"/repuestos",
				catalogo.repuestos.filter(
					(r) =>
						igual(r.linea, g("linea")) &&
						igual(r.clase, g("clase")) &&
						igual(r.familia, g("familia")) &&
						igual(r.sector, g("sector")) &&
						igual(r.marca, g("marca")) &&
						contiene(r.material, g("codigo")) &&
						contiene(r.denominacion, g("descripcion")) &&
						contiene(`${r.denominacion} ${r.marca} ${r.material}`, g("texto")) &&
						(!soloStock || r.disponible > 0)
				)
			);
		}
		// Resultados en orden alfabetico por descripcion.
		const clave = tipo === "vehiculos" ? "/vehiculos" : "/repuestos";
		b.setProperty(clave, ordenarPorTexto(b.getProperty(clave) as { denominacion: string }[], (x) => x.denominacion));
	}

	/** Reemplaza las listas de ejemplo (linea, clase, familia) por las de SAP (entidades Linea, Clase y Familia). */
	private async cargarCombosSap(): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		try {
			const seg = await cargarSegmentos(odata);
			this.modeloMock().setProperty("/segmentos", {
				lineas: { repuestos: seg.lineas.filter((l) => l.key !== "VE"), vehiculos: seg.lineas.filter((l) => l.key === "VE") },
				clases: seg.clases,
				familias: seg.familias
			});
			this.refrescarListas();
		} catch (error) {
			MessageToast.show(this.i18n().getText("busquedaMaterialError", [(error as Error).message]) as string);
		}
	}

	/** Vehiculos vendibles desde SAP (entidad Vehiculo): organizacion de vehiculos, canal y centro del perfil, mas los filtros de la pantalla. */
	private async buscarVehiculosEnSap(g: (campo: string) => string): Promise<void> {
		const b = this.modeloBusqueda();
		const mock = this.modeloMock();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		b.setProperty("/cargando", true);
		try {
			// Un perfil de repuestos no tiene organizacion de vehiculos: se usa la de su misma sede (1103 -> 1101, 1203 -> 1201).
			const vkorg = this.orgBusqueda("vehiculos");
			const vtweg = String(mock.getProperty("/perfil/busqueda/canal") ?? "11");
			// Primero SOLO el centro del perfil (el stock que el vendedor pidio). Solo si ahi no hay nada se amplia a los demas centros de la
			// organizacion, y esas filas se marcan como "otro centro": nunca se vende desde otro centro sin que se vea.
			const centroPerfil = String(this.modeloOferta().getProperty("/perfil/centro") ?? "");
			const consultar = (werks: string) => buscarVehiculos(odata, { vkorg, vtweg, werks, color: g("color"), anio: g("anio"), condicion: g("condicion") });
			let filas = await consultar(centroPerfil);
			let otrosCentros = false;
			if (filas.length === 0 && centroPerfil) {
				filas = await consultar("");
				otrosCentros = filas.length > 0;
			}
			const visibles = filtrarVehiculos(filas, { codigo: g("codigo"), descripcion: g("descripcion"), texto: g("texto"), clase: g("clase") });
			const agrupados = ordenarPorTexto(agruparVehiculos(visibles), (v) => v.denominacion).map((v) => ({
				...v,
				centroTxt: v.almacen ? `${v.centro} · ${v.almacen}` : v.centro,
				otroCentro: v.centro !== centroPerfil
			}));
			b.setProperty("/vehiculos", agrupados);
			// Sin resultados nunca queda la pantalla vacia: se dice donde se busco; con otros centros se avisa que no es el del perfil.
			b.setProperty(
				"/avisoVacio",
				agrupados.length === 0
					? (this.i18n().getText("vehiculosVacio", [vkorg, vtweg, centroPerfil || (this.i18n().getText("todosLosCentros") as string)]) as string)
					: otrosCentros
						? (this.i18n().getText(puedeVenderOtroCentro(String(this.modeloOferta().getProperty("/perfil/rol") ?? "")) ? "vehiculosOtrosCentros" : "vehiculosOtrosCentrosConsulta", [centroPerfil, vkorg]) as string)
						: ""
			);
			await this.preciosDeLaLista(odata, agrupados);
		} catch (error) {
			b.setProperty("/vehiculos", []);
			MessageBox.error(this.i18n().getText("busquedaMaterialError", [(error as Error).message]) as string);
		} finally {
			b.setProperty("/cargando", false);
		}
	}

	/**
	 * Con el cliente elegido pide a SAP el precio de cada fila de vehiculos (pocas filas: una por modelo y variante) para mostrarlo
	 * en la lista o marcar "Sin precio". Sin cliente deja "al elegir". No inventa ningun precio.
	 */
	private async preciosDeLaLista(odata: ODataModel, filas: (Vehiculo & { sinPrecio?: boolean; sinPrecioSap?: boolean; precioPenTxt?: string; precioUsd: number })[]): Promise<void> {
		const oferta = this.modeloOferta();
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (!kunnr || filas.length === 0) {
			return;
		}
		const canal = canalDe(String(this.modeloMock().getProperty("/perfil/busqueda/canal") ?? "11"));
		await Promise.all(
			filas.map(async (v) => {
				const base = { kunnr, vkorg: v.orgVentas, vtweg: canal, spart: v.sectorOferta, auart: CLASE_OFERTA_PRECIO_VEH, matnr: v.material, werks: v.centro ?? "", cantidad: 1, varcond: v.variante, ...this.extrasPrecio() };
				try {
					const [pen, usd] = await Promise.all([consultarPrecio(odata, { ...base, waers: "PEN" }), consultarPrecio(odata, { ...base, waers: "USD" })]);
					v.precioPenSap = pen.precioUnitario;
					v.precioUsd = usd.precioUnitario;
					v.precioPenTxt = `S/ ${this.formatMonto(pen.precioUnitario)}`;
					v.sinPrecio = false;
				} catch {
					v.sinPrecioSap = true;
				}
			})
		);
		this.modeloBusqueda().setProperty("/vehiculos", filas);
	}

	/** Repuestos desde SAP (entidad Material): organizacion y canal del perfil, mas los filtros de la pantalla. */
	private async buscarRepuestosEnSap(g: (campo: string) => string): Promise<void> {
		const b = this.modeloBusqueda();
		const mock = this.modeloMock();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		b.setProperty("/cargando", true);
		b.setProperty("/progreso", this.i18n().getText("buscandoInicio") as string);
		try {
			const vkorg = String(mock.getProperty("/perfil/busqueda/orgs/repuestos") ?? "1103");
			const vtweg = String(mock.getProperty("/perfil/busqueda/canal") ?? "11");
			const centro = String(this.modeloOferta().getProperty("/perfil/centro") ?? "");
			const soloStock = b.getProperty("/soloStock") as boolean;
			const t0 = Date.now();
			const fases: string[] = [];
			const resultado = await buscarRepuestosConStock(
				odata,
				{ vkorg, vtweg, linea: g("linea"), clase: g("clase"), familia: g("familia"), codigo: g("codigo"), descripcion: g("descripcion"), texto: g("texto"), sector: g("sector"), marca: g("marca") },
				centro,
				soloStock,
				sectorDeCabecera,
				(fase, ms) => fases.push(`${fase}: ${ms} ms`),
				(revisados, conStock) => b.setProperty("/progreso", this.i18n().getText("buscandoProgreso", [centro, String(revisados), String(conStock)]) as string),
				// El stock se mide en el almacen del perfil: de ahi sale el pedido (si no, se ve stock que SAP luego rechaza como no disponible).
				this.almacenDelPerfil()
			);
			// Diagnostico de lentitud (consola del navegador, F12): tiempo por fase y total hasta tener la lista.
			console.info(`[Cotizador] busqueda de repuestos: ${Date.now() - t0} ms | ${fases.join(" | ")}`);
			const sectores = (mock.getProperty("/sectores/repuestos") as { key: string; text: string }[]) ?? [];
			// El sector del material con su descripcion ("50 · Rep. alternativos y llantas"); sin descripcion conocida, solo el codigo.
			const textoSector = (c: string): string => (sectores.find((x) => x.key === c)?.text ?? c).replace(/^(\d+)\s*[—–-]\s*/, "$1 · ");
			const conDatos = resultado.filas.map((f) => ({ ...f, sectorTxt: textoSector(f.sector), precioUsd: 0, condicionPct: 0, promocion: null, sinPrecio: true }));
			b.setProperty("/repuestos", conDatos);
			b.setProperty("/parcial", resultado.parcial);
			void this.cargarPreciosVisibles(conDatos.length);
			void this.cargarListaPrecios(vkorg, conDatos.map((f) => f.material));
			this.avisarSinResultados(motivoVacio(resultado.coinciden, conDatos.length, soloStock), resultado.coinciden, centro);
		} catch (error) {
			b.setProperty("/repuestos", []);
			MessageBox.error(this.i18n().getText("busquedaMaterialError", [(error as Error).message]) as string);
		} finally {
			b.setProperty("/cargando", false);
		}
	}

	private listaDisponible?: boolean;
	private busquedaLista = 0;

	/**
	 * Precios de lista MAYORISTA (canal 10) y RETAIL (canal 11) de las filas de la busqueda, en una sola consulta y sin depender del cliente.
	 * Son referenciales: el precio de la linea lo calcula SAP para el cliente al seleccionar el material. Mientras la entidad no este
	 * publicada en SAP, las columnas no se muestran.
	 */
	private async cargarListaPrecios(vkorg: string, matnrs: string[]): Promise<void> {
		const b = this.modeloBusqueda();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		b.setProperty("/canalPerfil", canalDe(String(this.modeloOferta().getProperty("/perfil/busqueda/canal") ?? "")));
		if (this.listaDisponible === undefined) {
			this.listaDisponible = await precioListaDisponible(odata);
		}
		b.setProperty("/hayPrecioLista", this.listaDisponible);
		if (!this.listaDisponible || matnrs.length === 0) {
			return;
		}
		const turno = ++this.busquedaLista;
		try {
			const precios = await cargarPreciosLista(odata, vkorg, matnrs);
			if (turno !== this.busquedaLista) {
				return;
			}
			((b.getProperty("/repuestos") as { material: string }[]) ?? []).forEach((f, i) => {
				b.setProperty(`/repuestos/${i}/precioMay`, textoPrecioLista(precios[f.material]?.mayorista));
				b.setProperty(`/repuestos/${i}/precioRet`, textoPrecioLista(precios[f.material]?.retail));
				// Un precio marcado para borrado en SAP se avisa aparte: no cuenta para vender.
				b.setProperty(`/repuestos/${i}/borradoMay`, !!precios[f.material]?.mayorista?.borrado);
				b.setProperty(`/repuestos/${i}/borradoRet`, !!precios[f.material]?.retail?.borrado);
			});
		} catch (error) {
			// Los precios de lista son informativos: si fallan, las columnas quedan con raya y la busqueda sigue.
			console.warn(`[Cotizador] precios de lista: ${(error as Error).message}`);
		}
	}

	/**
	 * Canal con el que SAP creara el documento de una linea: el de la MODALIDAD de su grupo (organizacion + sector), no el del perfil.
	 * El precio debe pedirse con ese mismo canal; si no (perfil en canal 10 y modalidad mostrador de canal 11), se ve un precio del canal 10
	 * y el documento sale en cero porque el canal 11 no tiene precio.
	 */
	private canalDeDocumento(orgVentas: string, sector: string, tipo: "repuestos" | "vehiculos"): string {
		const oferta = this.modeloOferta();
		const canalPerfil = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const clave = `${orgVentas}/${sector}`;
		const grupo = ((oferta.getProperty("/grupos") as Grupo[]) ?? []).find((g) => g.clave === clave);
		if (grupo?.canal) {
			return canalDe(grupo.canal) || canalPerfil;
		}
		const modalidades = (oferta.getProperty("/modalidades") as Modalidad[]) ?? [];
		const elegida = ((oferta.getProperty("/modalidadesGrupo") as Record<string, string>) ?? {})[clave] ?? modalidadPorDefecto(tipo, canalDe(String(oferta.getProperty("/perfil/canal") ?? "")));
		return canalDe(modalidades.find((m) => m.key === elegida)?.canal) || canalPerfil;
	}

	/** Almacen del que saldra el pedido: el del perfil en el centro del perfil; en otro centro, la regla practica. */
	private almacenDelPerfil(): string {
		const perfil = this.modeloOferta().getProperty("/perfil") as Record<string, string>;
		return almacenDeCentro(perfil.centro, this.modeloMock().getProperty("/opciones/almacenPorCentro") ?? {}, perfil.almacen, perfil.centro);
	}

	/**
	 * Antes de pedir el pedido a SAP: comprueba que el DISPONIBLE (ATP) del almacen alcance para la cantidad de cada linea de repuestos.
	 * SAP rechaza el pedido si no alcanza, aunque haya stock fisico. Devuelve las lineas que no alcanzan; si no se puede leer, no bloquea.
	 */
	private async lineasSinDisponible(): Promise<string[]> {
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata || !this.usarOData()) {
			return [];
		}
		const centro = String(oferta.getProperty("/perfil/centro") ?? "");
		const almacen = this.almacenDelPerfil();
		const lineas = ((oferta.getProperty("/lineas") as Linea[]) ?? []).filter((l) => l.precioPenSap !== undefined && !l.bonificacion && !l.variante);
		const faltan: string[] = [];
		await Promise.all(
			lineas.map(async (l) => {
				try {
					const canal = this.canalDeDocumento(l.orgVentas, l.sector, "repuestos");
					const almacenes = await disponibilidadPorAlmacen(odata, l.orgVentas, canal, centro, l.material);
					const delAlmacen = almacenes.find((a) => a.lgort === almacen);
					if (almacenes.length > 0 && (delAlmacen?.disponible ?? 0) < l.cantidad) {
						faltan.push(`${l.material}: ${this.i18n().getText("pideDispone", [String(l.cantidad), almacen, String(delAlmacen?.disponible ?? 0)]) as string}`);
					}
				} catch {
					// Sin lectura no se bloquea: SAP lo comprueba al crear el pedido.
				}
			})
		);
		return faltan;
	}

	/**
	 * Avisa si el ALMACEN del perfil no tiene stock DISPONIBLE de un material elegido: SAP rechaza el pedido cuando el disponible (ATP) no
	 * alcanza, aunque haya stock fisico (comprometido por otros documentos). Es un aviso, no un bloqueo: la cantidad se decide despues.
	 */
	private async avisarSinDisponibleEnAlmacen(elegidos: (Vehiculo & Repuesto & { tipo: string })[]): Promise<void> {
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata || !this.usarOData()) {
			return;
		}
		const perfil = oferta.getProperty("/perfil") as Record<string, string>;
		const almacen = this.almacenDelPerfil();
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		for (const m of elegidos.filter((x) => x.origen === "sap")) {
			try {
				const almacenes = await disponibilidadPorAlmacen(odata, m.orgVentas, this.canalDeDocumento(m.orgVentas, m.sectorOferta, "repuestos") || canal, perfil.centro, m.material);
				const delPerfil = almacenes.find((a) => a.lgort === almacen);
				if (almacenes.length > 0 && (delPerfil?.disponible ?? 0) <= 0) {
					const otros = almacenes.filter((a) => a.disponible > 0).map((a) => `${a.lgort} (${a.disponible})`);
					MessageBox.warning(this.i18n().getText("sinDisponibleAlmacen", [almacen, m.material, otros.length ? otros.join(", ") : this.i18n().getText("ninguno") as string]) as string);
				}
			} catch {
				// Si no se puede leer la disponibilidad no se avisa; SAP la comprobara al crear el pedido.
			}
		}
	}

	/** Cuantos precios se calculan de una vez en la lista (cada uno es una consulta a SAP; el resto sale "al elegir"). */
	private static readonly PRECIOS_EN_LISTA = 20;
	private busquedaPrecios = 0;

	/**
	 * Con cliente elegido, calcula el precio de las primeras filas de la lista (en la moneda de la oferta) para verlo sin tener que
	 * seleccionar. El precio es el que SAP calcula para ESE cliente; al seleccionar el material se vuelve a pedir y es el que cuenta.
	 * Si el vendedor lanza otra busqueda mientras tanto, los precios que llegan tarde se descartan.
	 */
	private async cargarPreciosVisibles(total: number): Promise<void> {
		const oferta = this.modeloOferta();
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (!kunnr || total === 0 || !this.usarOData()) {
			return;
		}
		const turno = ++this.busquedaPrecios;
		const b = this.modeloBusqueda();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const centro = String(oferta.getProperty("/perfil/centro") ?? "");
		const moneda = oferta.getProperty("/perfil/moneda") === "USD" ? "USD" : "PEN";
		const simbolo = moneda === "USD" ? "US$" : "S/";
		const filas = ((b.getProperty("/repuestos") as { material: string; orgVentas: string; sectorOferta: string }[]) ?? []).slice(0, Oferta.PRECIOS_EN_LISTA);
		const t0 = Date.now();
		const tiempos: number[] = [];
		await Promise.all(
			filas.map(async (f, i) => {
				const t1 = Date.now();
				try {
					const precio = await consultarPrecio(odata, { kunnr, vkorg: f.orgVentas, vtweg: canal, spart: f.sectorOferta, auart: CLASE_OFERTA_PRECIO, matnr: f.material, werks: centro, cantidad: 1, waers: moneda, ...this.extrasPrecio() });
					if (turno === this.busquedaPrecios) {
						b.setProperty(`/repuestos/${i}/precioPenTxt`, `${simbolo} ${this.formatMonto(precio.precioUnitario)}`);
						b.setProperty(`/repuestos/${i}/precioListaSap`, true);
					}
				} catch {
					// Sin precio en la lista: sigue "al elegir" y el aviso aparece al seleccionar el material.
				} finally {
					tiempos.push(Date.now() - t1);
				}
			})
		);
		console.info(`[Cotizador] precios de la lista: ${filas.length} consultas en paralelo, total ${Date.now() - t0} ms (la mas lenta ${Math.max(0, ...tiempos)} ms, promedio ${Math.round(tiempos.reduce((a, c) => a + c, 0) / Math.max(1, tiempos.length))} ms)`);
	}

	/** Explica por que no hay resultados (sin coincidencias o sin stock en el centro) y que se puede hacer. */
	private avisarSinResultados(motivo: string, coinciden: number, centro: string): void {
		const b = this.modeloBusqueda();
		const i18n = this.i18n();
		const oferta = this.modeloOferta();
		const sede = String(oferta.getProperty("/perfil/sede") ?? "");
		b.setProperty("/motivoVacio", motivo);
		b.setProperty(
			"/avisoVacio",
			motivo === "sinStock"
				? (i18n.getText("vacioSinStock", [String(coinciden), centro, sede, this.almacenDelPerfil()]) as string)
				: motivo === "sinCoincidencias"
					? (i18n.getText("vacioSinCoincidencias", [String(oferta.getProperty("/perfil/orgVentas") ?? ""), String(oferta.getProperty("/perfil/busqueda/canal") ?? "")]) as string)
					: ""
		);
	}

	/** Repite la busqueda sin exigir stock. */
	public async onVerSinStock(): Promise<void> {
		this.modeloBusqueda().setProperty("/soloStock", false);
		await this.onBuscar();
	}

	/** Quita linea, clase y familia (suelen venir precargadas del perfil) y repite la busqueda si queda algun otro filtro. */
	public async onQuitarSegmentos(): Promise<void> {
		const b = this.modeloBusqueda();
		["linea", "clase", "familia"].forEach((c) => b.setProperty(`/${c}`, ""));
		await this.onBuscar();
	}

	private limpiarSeleccion(): void {
		["tablaVehiculos", "tablaRepuestos"].forEach((id) =>
			(Fragment.byId(this.getView()?.getId() as string, id) as Table | undefined)?.removeSelections(true)
		);
	}

	/**
	 * Vehiculos: una sola fila. Repuestos, ropa y accesorios: seleccion multiple
	 * (cada talla es un material distinto, hay que poder agregarlas juntas).
	 */
	public onElegirFila(event: ListBase$SelectionChangeEvent): void {
		const tabla = event.getSource() as Table;
		const esVehiculo = tabla.getId().includes("tablaVehiculos");
		const i18n = this.i18n();
		// Un vehiculo de otro centro se muestra solo como consulta: venderlo sacaria la factura y el stock de un centro ajeno al del perfil.
		if (esVehiculo && !puedeVenderOtroCentro(String(this.modeloOferta().getProperty("/perfil/rol") ?? "")) && tabla.getSelectedContexts().some((c) => (c.getObject() as { otroCentro?: boolean }).otroCentro)) {
			tabla.removeSelections(true);
			MessageToast.show(i18n.getText("otroCentroSinPermiso") as string, { duration: 6000 });
			this.modeloBusqueda().setProperty("/elegidos", []);
			this.modeloBusqueda().setProperty("/elegido", null);
			return;
		}
		const elegidos = tabla
			.getSelectedContexts()
			.map((ctx) => ctx.getObject() as Vehiculo & Repuesto)
			.map((objeto) => ({
				...objeto,
				tipo: esVehiculo ? "vehiculos" : "repuestos",
				detalle: esVehiculo ? textoDetalleVehiculo(objeto) : objeto.marca,
				stockTexto: esVehiculo
					? `${objeto.stockMio} ${i18n.getText("enTuAlmacen")} · ${objeto.stockOtros} ${i18n.getText("otrosAlmacenes")}`
					: `${objeto.disponible} ${i18n.getText("colDisponible")} (${objeto.comprometido} ${i18n.getText("colComprometido")})`
			}));
		const b = this.modeloBusqueda();
		b.setProperty("/elegidos", elegidos);
		b.setProperty("/elegido", elegidos.length ? elegidos[0] : null);
	}

	/**
	 * Para las filas leidas de SAP pide el precio unitario real (entidad Precio) en soles y en dolares: SAP convierte la
	 * moneda, no se usa el tipo de cambio fijo. El precio depende del cliente. Devuelve false si no se pudo (ya avisado).
	 */
	private async completarPreciosSap(elegidos: (Vehiculo & Repuesto & { tipo: string })[], cantidad = 1): Promise<boolean> {
		const delSap = elegidos.filter((m) => m.origen === "sap");
		if (delSap.length === 0) {
			return true;
		}
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (!kunnr) {
			MessageBox.warning(i18n.getText("precioSinCliente") as string);
			return false;
		}
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const centro = String(oferta.getProperty("/perfil/centro") ?? "");
		try {
			await Promise.all(
				delSap.map(async (m) => {
					// Vehiculo: Matnr = modelo, el precio sale de la variante y el centro es el del vehiculo.
					const canalDoc = this.canalDeDocumento(m.orgVentas, m.sectorOferta, m.variante ? "vehiculos" : "repuestos") || canal;
					const base = m.variante
						? { kunnr, vkorg: m.orgVentas, vtweg: canalDoc, spart: m.sectorOferta, auart: CLASE_OFERTA_PRECIO_VEH, matnr: m.material, werks: m.centro ?? centro, cantidad, varcond: m.variante, ...this.extrasPrecio() }
						: { kunnr, vkorg: m.orgVentas, vtweg: canalDoc, spart: sectorDeCabecera(canalDoc, m.sector, m.orgVentas), auart: CLASE_OFERTA_PRECIO, matnr: m.material, werks: centro, cantidad, ...this.extrasPrecio() };
					const [pen, usd] = await Promise.all([consultarPrecio(odata, { ...base, waers: "PEN" }), consultarPrecio(odata, { ...base, waers: "USD" })]);
					m.precioPenSap = pen.precioUnitario;
					m.precioUsd = usd.precioUnitario;
					m.sinPrecio = false;
					// La lista de condiciones es informativa: si falla no impide elegir el material.
					m.condicionesSap = await consultarCondiciones(odata, { ...base, waers: oferta.getProperty("/perfil/moneda") === "USD" ? "USD" : "PEN" }).catch((e: Error) => {
						console.warn(`[Cotizador] condiciones de ${m.material}: ${e.message}`);
						return [];
					});
					m.condiciones = filasDeCondiciones(m.condicionesSap, this.verTodasCondiciones());
				})
			);
			return true;
		} catch (error) {
			MessageBox.error(i18n.getText("precioSapError", [(error as Error).message]) as string);
			return false;
		}
	}

	private verTodasCondiciones(): boolean {
		return this.modeloOferta().getProperty("/verTodasCondiciones") === true;
	}

	/** Alterna entre las condiciones con valor y todas las del esquema (incluidas las de valor cero e inactivas). */
	public onCambiaFiltroCondiciones(): void {
		const oferta = this.modeloOferta();
		const verTodas = oferta.getProperty("/filtroCondiciones") !== "relevantes";
		oferta.setProperty("/verTodasCondiciones", verTodas);
		const filas = (oferta.getProperty("/elegidosLista") as Repuesto[]) ?? [];
		filas.forEach((f, i) => oferta.setProperty(`/elegidosLista/${i}/condiciones`, filasDeCondiciones(f.condicionesSap ?? [], verTodas)));
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		lineas.forEach((l) => {
			if (l.condicionesSap) {
				l.condiciones = filasDeCondiciones(l.condicionesSap, verTodas);
			}
		});
		oferta.setProperty("/lineas", lineas);
		this.recalcular();
	}

	/** Descarta el material elegido que todavia no se agrego a la oferta (p. ej. para buscar con otro perfil). No toca las lineas ya agregadas. */
	public onQuitarMaterial(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/materialElegido", null);
		oferta.setProperty("/vista", {});
		oferta.setProperty("/elegidosLista", []);
	}

	public async onConfirmarMaterial(): Promise<void> {
		const b = this.modeloBusqueda();
		const oferta = this.modeloOferta();
		const elegidos = (b.getProperty("/elegidos") as (Vehiculo & Repuesto & { tipo: string })[]) ?? [];
		if (!elegidos.length) {
			return;
		}
		if (!(await this.completarPreciosSap(elegidos))) {
			return;
		}
		if (elegidos[0].tipo === "repuestos") {
			void this.avisarSinDisponibleEnAlmacen(elegidos);
		}
		// Vehiculos y repuestos se ven igual: lista de materiales elegidos con su "Determinacion de precio" y el detalle del material.
		oferta.setProperty("/materialElegido", null);
		oferta.setProperty("/vista", {});
		oferta.setProperty("/elegidosLista", elegidos.map((m) => this.filaPrecio(m, 1)));
		this.dialogoBusqueda?.close();
		// Un solo material: se abre su detalle (lista de precios, descuentos, escalas, regalos y stock) antes de agregarlo.
		if (elegidos.length === 1) {
			await this.abrirDetalle(oferta.getProperty("/elegidosLista/0") as Vehiculo & Repuesto & { tipo: string });
		}
	}

	private tc(): number {
		return Number(this.modeloMock().getProperty("/perfil/tipoCambio")) || 1;
	}

	private redondear(v: number): number {
		return Math.round(v * 100) / 100;
	}

	/** Moneda de la oferta: PEN por defecto; en USD los precios de lista se usan tal cual, en PEN se convierten al tipo de cambio del perfil. */
	private aMoneda(usd: number): number {
		return this.modeloOferta().getProperty("/perfil/moneda") === "USD" ? usd : this.redondear(usd * this.tc());
	}

	/** Los precios de lista vienen en USD; la oferta es en PEN al tipo de cambio del perfil (solo lectura, lo fija Tesoreria). */
	public formatPen(usd: number): string {
		return typeof usd === "number" ? `S/ ${this.formatMonto(this.redondear(usd * this.tc()))}` : "";
	}

	private dual(usd: number): string {
		return `USD ${this.formatMonto(usd)} · S/ ${this.formatMonto(this.redondear(usd * this.tc()))}`;
	}

	/**
	 * Oficina de ventas y forma de pago del perfil para pedir el precio a SAP: son parte de la clave de condiciones como el descuento Z320
	 * (oficina + grupo de clientes + grupo de materiales) o las escalas Z323/Z324 (forma de pago). Sin ellas el precio de pantalla no
	 * coincide con el del pedido. La oficina es la misma que viaja en el grupo al guardar.
	 */
	private extrasPrecio(): { vkbur?: string; zterm?: string } {
		const perfil = this.modeloOferta().getProperty("/perfil") as Record<string, string> | undefined;
		const vkbur = oficinaDe(perfil?.oficina);
		return { ...(vkbur ? { vkbur } : {}), ...(perfil?.formaPago ? { zterm: perfil.formaPago } : {}) };
	}

	/** Desglose por fila: lista, condicion, promocion, final y total (en USD y PEN). */
	private filaPrecio(m: Vehiculo & Repuesto & { tipo: string; detalle?: string }, cantidad: number): Record<string, unknown> {
		const i18n = this.i18n();
		const listaUsd = m.precioUsd;
		const condicionUsd = this.redondear(listaUsd * (m.condicionPct / 100));
		const promoUsd = m.promocion?.monto ?? 0;
		// Escala por cantidad (ejemplo): en SAP son los descuentos "Mix" (packs ZTSD_PACK_*, condiciones Z325/Z326) que calcula el precio
		const tramos = [...(m.escala ?? [])].sort((a, b) => a.min - b.min);
		const aplicado = [...tramos].reverse().find((t) => cantidad >= t.min);
		const siguiente = tramos.find((t) => t.min > cantidad);
		const escalaUsd = this.redondear(listaUsd * ((aplicado?.pct ?? 0) / 100));
		const finalUsd = this.redondear(listaUsd - condicionUsd - escalaUsd - promoUsd);
		const moneda = this.modeloOferta().getProperty("/perfil/moneda");
		const final = m.origen === "sap" && m.precioPenSap !== undefined ? (moneda === "USD" ? finalUsd : m.precioPenSap) : this.aMoneda(finalUsd);
		const escalaTxt = !tramos.length
			? ""
			: aplicado
				? (i18n.getText("escalaAplicada", [aplicado.pct, aplicado.min]) as string)
				: (i18n.getText("escalaSinAplicar") as string);
		const proximoTxt = siguiente ? (i18n.getText("escalaProxima", [siguiente.min - cantidad, siguiente.pct]) as string) : "";
		return {
			...m,
			cantidad,
			maxCantidad: m.tipo === "vehiculos" ? 1 : 9999,
			final,
			finalUsd,
			escalaTxt,
			proximoTxt,
			escalaTramosTxt: tramos.map((t) => `${t.min}+: \u2212${t.pct}%`).join(" \u00b7 "),
			listaTxt: this.dual(listaUsd),
			condicionTxt: m.condicionPct
				? `−${m.condicionPct}% (− ${this.dual(condicionUsd)})`
				: (i18n.getText("sinCondicion") as string),
			promoTxt: m.promocion ? `${m.promocion.nombre} (− ${this.dual(promoUsd)})` : (i18n.getText("sinPromocion") as string),
			finalTxt: this.formatMonto(final),
			totalTxt: this.formatMonto(this.redondear(final * cantidad))
		};
	}

	/**
	 * Con ?odata=1 reemplaza las listas estaticas de centros y oficinas por las de SAP (entidades Centro y Oficina) para la
	 * organizacion de repuestos y el canal. Si falla deja las listas de mock.json.
	 */
	private async sincronizarCatalogosArea(canal: string): Promise<void> {
		if (!this.usarOData()) {
			return;
		}
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		const mock = this.modeloMock();
		const org = String(mock.getProperty("/perfil/busqueda/orgs/repuestos") ?? "1103");
		try {
			const [centros, oficinas] = await Promise.all([leerCentros(odata, org, canal), leerOficinas(odata, org, canal)]);
			// Diagnostico (F12 > Consola): que organizacion y canal se consultaron y cuantos centros y oficinas devolvio SAP.
			console.info(`[Cotizador] catalogos de area: org=${org} canal=${canal} centros=${centros.codigos.length} oficinas=${oficinas.length}`);
			if (centros.codigos.length > 0) {
				const nombres = { ...((mock.getProperty("/opciones/centros") as Record<string, string>) ?? {}), ...centros.nombres };
				const porArea = { ...((mock.getProperty("/opciones/centrosPorArea") as Record<string, string[]>) ?? {}), [`${org}/${canal}`]: centros.codigos };
				mock.setProperty("/opciones/centros", nombres);
				mock.setProperty("/opciones/centrosPorArea", porArea);
			}
			if (oficinas.length > 0) {
				this.modeloOferta().setProperty("/opciones/oficinas", oficinas);
			}
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
		}
	}

	/** Centros validos (TVKWZ) para la organizacion de repuestos y el canal elegido, con su nombre. */
	private centrosDe(canal: string): { key: string; text: string }[] {
		const mock = this.modeloMock();
		const nombres = (mock.getProperty("/opciones/centros") as Record<string, string>) ?? {};
		const porArea = (mock.getProperty("/opciones/centrosPorArea") as Record<string, string[]>) ?? {};
		const org = String(mock.getProperty("/perfil/busqueda/orgs/repuestos") ?? "1103");
		const claves = porArea[`${org}/${canal}`] ?? Object.keys(nombres);
		return claves.map((k) => ({ key: k, text: nombres[k] ? `${k} \u00b7 ${nombres[k]}` : k }));
	}

	/**
	 * Listas de oficina y centro de la OFERTA: solo las de la sede (ciudad) del vendedor y siempre con el valor de su perfil dentro,
	 * para que el desplegable no muestre otro por no encontrarlo. Avisa si el centro u oficina del perfil no estan habilitados en SAP
	 * para la organizacion y el canal.
	 */
	private refrescarListasSede(): void {
		const oferta = this.modeloOferta();
		const ciudad = String(oferta.getProperty("/perfil/ciudad") ?? "");
		const marca = this.i18n().getText("noHabilitado") as string;
		const ofiPerfil = String(oferta.getProperty("/perfil/oficina") ?? "");
		const cenPerfil = String(oferta.getProperty("/perfil/centro") ?? "");
		const oficinas = listaDeSede((oferta.getProperty("/opciones/oficinas") as { key: string; text: string }[]) ?? [], ciudad, "oficinas", ofiPerfil, marca);
		const centros = listaDeSede((oferta.getProperty("/opcionesCentro") as { key: string; text: string }[]) ?? [], ciudad, "centros", cenPerfil, marca);
		if (oficinas.fueraDeSap || centros.fueraDeSap) {
			// Diagnostico: el centro u oficina del perfil no estan en la lista de SAP para esta organizacion y canal.
			console.warn(
				`[Cotizador] perfil fuera de lista: org=${String(oferta.getProperty("/perfil/orgVentas") ?? "")} canal=${String(oferta.getProperty("/perfil/canal") ?? "")} ` +
					`centro=${cenPerfil} (en lista: ${centros.opciones.length}) oficina=${ofiPerfil} | perfil/busqueda: ${JSON.stringify(oferta.getProperty("/perfil/busqueda/orgs") ?? {})} ` +
					`| centros SAP: ${((oferta.getProperty("/opcionesCentro") as { key: string }[]) ?? []).map((c) => c.key).join(",")}`
			);
		}
		oferta.setProperty("/oficinasSede", oficinas.opciones);
		oferta.setProperty("/opcionesCentro", centros.opciones);
		const fuera = [oficinas.fueraDeSap ? `${this.i18n().getText("oficina")} ${ofiPerfil}` : "", centros.fueraDeSap ? `${this.i18n().getText("centro")} ${cenPerfil}` : ""].filter(Boolean);
		oferta.setProperty(
			"/avisoPerfil",
			fuera.length
				? (this.i18n().getText("avisoPerfilFuera", [fuera.join(" / "), String(oferta.getProperty("/perfil/orgVentas") ?? ""), String(oferta.getProperty("/perfil/canal") ?? "")]) as string)
				: ""
		);
	}

	/** El canal elegido define el canal de la busqueda de materiales, la modalidad propuesta y los centros que se ofrecen. */
	/**
	 * Condicion de expedicion (VSBED) que viaja a SAP: la que el vendedor ve en la seccion Entrega (recojo = 02, envio = 01); si no la tocó, la
	 * del perfil. Con ella SAP determina el puesto de expedicion del pedido (tabla TVSTZ: centro + condicion de expedicion).
	 */
	private condicionExpedicion(): string {
		const oferta = this.modeloOferta();
		const entrega = oferta.getProperty("/entrega");
		if (entrega === "envio") {
			return "01";
		}
		if (entrega === "recojo") {
			return "02";
		}
		return String(oferta.getProperty("/perfil/expedicion") ?? "");
	}

	/** Elegir Recojo o Envio en la seccion Entrega actualiza tambien el selector Expedicion del perfil, para que ambos digan lo mismo. */
	public onCambiaEntrega(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/perfil/expedicion", oferta.getProperty("/entrega") === "envio" ? "01" : "02");
		this.aplicarModalidadDeEntrega();
		// La lista de transportistas se pide la primera vez que se elige Envio.
		if (oferta.getProperty("/entrega") === "envio" && !oferta.getProperty("/transp/cargado")) {
			void this.cargarTransportistas();
		}
	}

	public async onCambiaCanal(): Promise<void> {
		const oferta = this.modeloOferta();
		const canal = String(oferta.getProperty("/perfil/canal") ?? "");
		await this.sincronizarCatalogosArea(canal);
		oferta.setProperty("/perfil/busqueda/canal", canal);
		const modalidades = (oferta.getProperty("/modalidades") as Modalidad[]) ?? [];
		const elegidas = (oferta.getProperty("/modalidadesGrupo") as Record<string, string>) ?? {};
		((oferta.getProperty("/grupos") as Grupo[]) ?? []).forEach((g) => {
			const clave = modalidadPorDefecto(g.lineas.some((l) => l.unica) ? "vehiculos" : "repuestos", canal);
			if (clave && modalidades.some((m) => m.key === clave)) {
				elegidas[g.clave] = clave;
			}
		});
		const centros = this.centrosDe(canal);
		oferta.setProperty("/opcionesCentro", centros);
		const centroActual = String(oferta.getProperty("/perfil/centro") ?? "");
		if (!centros.some((c) => c.key === centroActual)) {
			// El centro del perfil no es valido para este canal. Solo se reemplaza por otro de la MISMA ciudad y sociedad del vendedor;
			// si no hay ninguno, se deja el del perfil (nunca uno de otra sociedad) y el aviso explica que no esta habilitado.
			const ciudad = ciudadPorClave(String(oferta.getProperty("/perfil/ciudad") ?? ""));
			const sociedad = sociedadDeCentro(centroActual);
			const propios = centros.filter((c) => !!ciudad && ciudad.centros.includes(c.key) && sociedadDeCentro(c.key) === sociedad);
			const principal = ciudad ? principalDe(ciudad, sociedad).centro : "";
			const elegido = propios.find((c) => c.key === principal) ?? propios[0];
			if (elegido) {
				oferta.setProperty("/perfil/centro", elegido.key);
			}
		}
		this.refrescarListasSede();
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		// El precio de SAP depende del canal: las lineas ya agregadas se vuelven a preciar con el canal nuevo.
		void this.repreciarLineasSap();
	}

	/**
	 * Oficina o centro de la cabecera: de ellos dependen el precio de SAP, los regalos (la ZNA0 de SFX428H-150-MTK es solo de la oficina 1101)
	 * y el stock del regalo. Pruebas del 29/10/2026: al pasar del centro 1101 al 1102 el regalo seguia sin aviso de stock hasta tocar la cantidad.
	 */
	public onCambiaOficinaCentro(): void {
		this.modeloOferta().setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		void this.repreciarLineasSap();
	}

	/** 01 Envio / 02 Recojo: define como se entrega (la modalidad tambien lo propone al cambiarla). */
	public onCambiaExpedicion(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entrega", oferta.getProperty("/perfil/expedicion") === "01" ? "envio" : "recojo");
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.aplicarModalidadDeEntrega();
	}

	/**
	 * Repuestos: la modalidad sigue a la entrega (pruebas del 28/10/2026). Envio -> despacho a cliente; al volver a recojo, el grupo que estaba en
	 * despacho toma la modalidad por defecto del canal del vendedor. Si alguna cambia, cambian el canal del documento y el precio.
	 */
	private aplicarModalidadDeEntrega(): void {
		const oferta = this.modeloOferta();
		const modalidades = (oferta.getProperty("/modalidades") as Modalidad[]) ?? [];
		if (!modalidades.some((m) => m.key === MODALIDAD_DESPACHO)) {
			return;
		}
		const envio = oferta.getProperty("/entrega") === "envio";
		const elegidas = (oferta.getProperty("/modalidadesGrupo") as Record<string, string>) ?? {};
		const porDefecto = modalidadPorDefecto("repuestos", canalDe(String(oferta.getProperty("/perfil/canal") ?? ""))) ?? "rep_mostrador";
		let cambio = false;
		((oferta.getProperty("/grupos") as Grupo[]) ?? [])
			.filter((g) => !g.lineas.some((l) => l.unica))
			.forEach((g) => {
				const actual = modalidades.find((m) => m.key === (elegidas[g.clave] ?? g.modalidad));
				const nueva = modalidadParaEntrega(actual, envio, porDefecto);
				if (nueva && nueva !== actual?.key) {
					elegidas[g.clave] = nueva;
					cambio = true;
				}
			});
		if (!cambio) {
			return;
		}
		oferta.setProperty("/modalidadesGrupo", elegidas);
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		void this.repreciarLineasSap();
	}

	/**
	 * Vuelve a pedir a SAP el precio unitario de las lineas de SAP para su cantidad actual (las escalas de cantidad
	 * cambian el precio) y recalcula los totales. Si SAP no responde deja el precio anterior y avisa.
	 */
	private async repreciarLineasSap(): Promise<void> {
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		// Los vehiculos tambien: aunque son de una unidad, su ISC e IGV se estiman con la misma simulacion para mostrarlos como en repuestos.
		const delSap = lineas.filter((l) => l.precioPenSap !== undefined && !l.bonificacion);
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (delSap.length === 0 || !kunnr || !this.usarOData()) {
			// Las lineas leidas de una oferta guardada no se reprecian, pero sus regalos si dependen de la cantidad.
			await this.actualizarRegalos();
			return;
		}
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const centro = String(oferta.getProperty("/perfil/centro") ?? "");
		try {
			await Promise.all(
				delSap.map(async (l) => {
					// Vehiculo: Matnr = modelo, el precio sale de la variante, el sector de cabecera es el de la oferta y el centro el del propio vehiculo.
					const canalDoc = this.canalDeDocumento(l.orgVentas, l.sector, l.variante ? "vehiculos" : "repuestos") || canal;
					const base = l.variante
						? { kunnr, vkorg: l.orgVentas, vtweg: canalDoc, spart: l.sector, auart: CLASE_OFERTA_PRECIO_VEH, matnr: l.material, werks: l.centroVeh ?? centro, cantidad: l.cantidad, varcond: l.variante, ...this.extrasPrecio() }
						: { kunnr, vkorg: l.orgVentas, vtweg: canalDoc, spart: sectorDeCabecera(canalDoc, l.sectorMaterial ?? l.sector, l.orgVentas), auart: CLASE_OFERTA_PRECIO, matnr: l.material, werks: centro, cantidad: l.cantidad, ...this.extrasPrecio() };
					const monedaOferta = oferta.getProperty("/perfil/moneda") === "USD" ? "USD" : "PEN";
					const [pen, usd, condiciones] = await Promise.all([
						consultarPrecio(odata, { ...base, waers: "PEN" }),
						consultarPrecio(odata, { ...base, waers: "USD" }),
						// Condiciones de la misma simulacion de SAP, en la moneda de la oferta: de ellas salen el ISC y el IGV y la tabla "Determinacion de precio".
						// Si fallan, el impuesto queda "—" y no se inventa nada.
						consultarCondiciones(odata, { ...base, waers: monedaOferta }).catch((e: Error) => {
							console.warn(`[Cotizador] condiciones de la linea ${l.material}: ${e.message}`);
							return null;
						})
					]);
					const imp = condiciones ? impuestosDeCondiciones(condiciones) : null;
					l.condicionesSap = condiciones ?? undefined;
					l.condiciones = condiciones ? filasDeCondiciones(condiciones, this.verTodasCondiciones()) : undefined;
					l.precioPenSap = pen.precioUnitario;
					l.precioUsdSap = usd.precioUnitario;
					l.precio = oferta.getProperty("/perfil/moneda") === "USD" ? usd.precioUnitario : pen.precioUnitario;
					l.total = this.redondear(l.cantidad * l.precio);
					l.sinPrecioVigente = false;
					if (imp) {
						// El precio de lista INCLUYE el IGV: SAP lo extrae del precio final (IGV = precio x 18/118). El total con impuestos es
						// el precio final y el valor neto es ese precio menos lo extraido; no se suma el impuesto encima.
						l.isc = imp.isc;
						l.igvImporte = imp.igv;
						l.totalConImpuestos = this.redondear(l.total);
						l.totalNeto = this.redondear(l.total - imp.isc - imp.igv);
						l.impuestoIncluido = true;
						l.impuestoEstimado = true;
					} else {
						l.isc = undefined;
						l.igvImporte = undefined;
						l.totalConImpuestos = undefined;
						l.totalNeto = undefined;
						l.impuestoIncluido = undefined;
					}
				})
			);
			oferta.setProperty("/lineas", lineas);
			this.recalcular();
			await this.actualizarRegalos();
		} catch (error) {
			// El precio que queda en pantalla es el anterior (de otro canal o cliente): se marca para no guardar con un precio que no vale.
			delSap.forEach((l) => (l.sinPrecioVigente = true));
			oferta.setProperty("/lineas", lineas);
			this.recalcular();
			MessageBox.warning(this.i18n().getText("repreciarError", [(error as Error).message]) as string);
		}
	}

	/** Al cambiar Soles/Dolares se vuelven a calcular los precios de las lineas que vienen del catalogo. */
	public onCambiaMoneda(): void {
		const oferta = this.modeloOferta();
		const mock = this.modeloMock();
		const catalogo = [
			...((mock.getProperty("/catalogo/repuestos") as Repuesto[]) ?? []).map((m) => ({ ...m, tipo: "repuestos" })),
			...((mock.getProperty("/catalogo/vehiculos") as Vehiculo[]) ?? []).map((m) => ({ ...m, tipo: "vehiculos" }))
		] as (Vehiculo & Repuesto & { tipo: string })[];
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		lineas.forEach((l) => {
			if (l.precioPenSap !== undefined && l.precioUsdSap !== undefined) {
				l.precio = oferta.getProperty("/perfil/moneda") === "USD" ? l.precioUsdSap : l.precioPenSap;
				l.total = this.redondear(l.cantidad * l.precio);
				return;
			}
			const m = l.bonificacion ? undefined : catalogo.find((x) => x.material === l.material);
			if (m) {
				l.precio = (this.filaPrecio(m, l.cantidad) as { final: number }).final;
				l.total = this.redondear(l.cantidad * l.precio);
			}
		});
		oferta.setProperty("/lineas", lineas);
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		// Los impuestos de SAP vienen en la moneda pedida: al cambiar de moneda se vuelven a pedir.
		void this.repreciarLineasSap();
	}

	public async onCambiaCantidadFila(event: Event<{ value: number }>): Promise<void> {
		const ruta = (event.getSource() as unknown as Control).getBindingContext("oferta")?.getPath();
		if (!ruta) {
			return;
		}
		const oferta = this.modeloOferta();
		const fila = oferta.getProperty(ruta) as Vehiculo & Repuesto & { tipo: string; cantidad: number };
		const cantidad = Math.max(1, Number(fila.cantidad) || 1);
		// En SAP el precio unitario cambia por tramos de cantidad (verificado: MOT112999 34.06 / 29.63 / 26.23 PEN).
		if (fila.origen === "sap") {
			await this.completarPreciosSap([fila], cantidad);
		}
		oferta.setProperty(ruta, this.filaPrecio(fila, cantidad));
	}

	/** Agrega todas las filas elegidas al carrito, cada una en su grupo (org. ventas + sector). */
	public onAgregarLista(): void {
		const oferta = this.modeloOferta();
		const filas = (oferta.getProperty("/elegidosLista") as (Vehiculo & Repuesto & { tipo: string; cantidad: number; final: number; detalle: string })[]) ?? [];
		filas.forEach((f) => this.agregarLinea(f, f.cantidad, f.final));
		oferta.setProperty("/elegidosLista", []);
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		void this.repreciarLineasSap();
	}

	private agregarLinea(
		m: Vehiculo & Repuesto & { tipo: string; detalle?: string },
		cantidad: number,
		final: number
	): void {
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		const existente = m.tipo === "repuestos" ? lineas.find((l) => l.material === m.material) : undefined;
		if (existente) {
			existente.cantidad += cantidad;
			existente.precio = final;
			// El precio ya es el de la busqueda (con impuestos): el del documento SAP leido antes deja de valer.
			existente.precioFinal = undefined;
			existente.condicionesSap = m.condicionesSap ?? existente.condicionesSap;
			existente.condiciones = m.condiciones ?? existente.condiciones;
			this.repreciarPorEscala(existente);
			existente.total = Math.round(existente.cantidad * existente.precio * 100) / 100;
		} else {
			const uid = `L${(this.contadorLinea += 1)}`;
			lineas.push({
				uid,
				grupo: m.grupo,
				orgVentas: m.orgVentas,
				sector: m.sectorOferta,
				sectorMaterial: m.sector,
				material: m.material,
				denominacion: m.denominacion,
				detalle: m.tipo === "vehiculos" ? (m.detalle ?? "") : "—",
				cantidad,
				precio: final,
				iscPct: m.iscPct ?? 0,
				total: Math.round(cantidad * final * 100) / 100,
				...(m.origen === "sap" ? { precioPenSap: m.precioPenSap, precioUsdSap: m.precioUsd } : {}),
				...(m.condiciones ? { condicionesSap: m.condicionesSap, condiciones: m.condiciones } : {}),
				...(m.tipo === "vehiculos" && m.variante ? { variante: m.variante, centroVeh: m.centro, almacenVeh: m.almacen, vin: m.vin } : {})
			});
			if (m.tipo === "vehiculos") {
				this.agregarBonificaciones(lineas, uid, m);
			}
		}
		oferta.setProperty("/lineas", lineas);
	}



	/* ---------- Bonificaciones (regalo por la compra de una moto) ---------- */

	/**
	 * Regalo automatico: por cada moto con configuracion vigente se agrega una linea de regalo (precio 0) ligada a la moto.
	 * En SAP la configuracion sale de ZTSD_CROS90x + ZTSD_MATER_ADIC (por confirmar). La talla la elige el vendedor:
	 * el regalo no se factura ni se despacha sin talla (dolor: no hay forma de vincular la talla del regalo a la moto).
	 */
	private agregarBonificaciones(lineas: Linea[], uidMoto: string, moto: Vehiculo): void {
		const config = (this.modeloMock().getProperty("/bonificaciones") as Bonificacion[]) ?? [];
		const hoy = new Date().toISOString().slice(0, 10);
		const repuestos = this.modeloMock().getProperty("/catalogo/repuestos") as Repuesto[];
		const i18n = this.i18n();
		config
			.filter((b) => b.motos.includes(moto.material) && b.vigenteHasta >= hoy)
			.forEach((b) => {
				const tallas = b.tallas.map((t) => {
					const r = repuestos.find((x) => x.material === t.material);
					const stock = r?.disponible ?? 0;
					return { key: t.key, text: `${t.key} (${i18n.getText("bonifStock", [stock])})`, enabled: stock > 0 };
				});
				lineas.push({
					uid: `L${(this.contadorLinea += 1)}`,
					grupo: moto.grupo,
					orgVentas: moto.orgVentas,
					sector: moto.sectorOferta,
					material: b.id,
					denominacion: b.nombre,
					detalle: "",
					cantidad: b.cantidad,
					precio: 0,
					total: 0,
					bonificacion: true,
					origen: uidMoto,
					talla: "",
					tallas
				});
			});
	}

	public onCambiaTalla(): void {
		this.modeloOferta().setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
	}

	/* ---------- Regalos de promocion de repuestos (ZNA0 y Zeta, entidad Regalo de SAP) ---------- */

	/** Lo que se pregunta a SAP: el area de ventas es la misma con la que se pide el precio del material (canal de la modalidad, sector de cabecera). */
	private consultaRegalo(m: { orgVentas: string; sector: string; sectorMaterial?: string; material: string }, cantidad: number): ConsultaRegalo | undefined {
		const oferta = this.modeloOferta();
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (!kunnr || !this.usarOData()) {
			return undefined;
		}
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const canalDoc = this.canalDeDocumento(m.orgVentas, m.sector, "repuestos") || canal;
		const vkbur = oficinaDe((oferta.getProperty("/perfil") as Record<string, string> | undefined)?.oficina);
		// El regalo sale del centro y almacen de la cabecera (los mismos del pedido): SAP informa su stock ahi.
		const werks = String(oferta.getProperty("/perfil/centro") ?? "");
		const lgort = werks ? this.almacenDelPerfil() : "";
		return {
			kunnr,
			vkorg: m.orgVentas,
			vtweg: canalDoc,
			matnr: m.material,
			spart: sectorDeCabecera(canalDoc, m.sectorMaterial ?? m.sector, m.orgVentas),
			...(vkbur ? { vkbur } : {}),
			cantidad,
			...(werks ? { werks, ...(lgort ? { lgort } : {}) } : {})
		};
	}

	/**
	 * Lo que todavia no da la promocion: "Llevando 100 UN recibe 10 UN de PM-13008-C por cada 100 UN" y, si el material tiene una ZNA0, que su
	 * venta cruzada (Zeta) no se entrega (la clase de condicion es exclusiva; SFX428H-150-MTK con 50 UN no recibe nada). Vacio si no aplica.
	 */
	private textoProximoRegalo(promos: PromoRegalo[], cantidad: number): string {
		const i18n = this.i18n();
		const partes: string[] = [];
		const p = proximoRegalo(promos, cantidad);
		if (p) {
			partes.push(i18n.getText("regaloProximo", [cantidadTxt(p.desde), p.unidad || "UN", cantidadTxt(p.regaloPorCada), p.unidadRegalo || "UN", `${p.matnrRegalo} ${p.descRegalo}`.trim(), cantidadTxt(p.porCada), p.unidad || "UN"]) as string);
		}
		const excluidas = [...new Set(zetaExcluidasPorZna0(promos).map((z) => `${z.matnrRegalo} ${z.descRegalo}`.trim()))];
		if (excluidas.length) {
			partes.push(i18n.getText("regaloZetaExcluida", [excluidas.join(", ")]) as string);
		}
		return partes.join(" ");
	}

	/** Aviso largo (toast y detalle del material) de un regalo sin stock suficiente en el almacen de la cabecera; vacio si alcanza. */
	private textoSinStockRegalo(p: PromoRegalo): string {
		const falta = faltanteStock(p);
		if (falta <= 0) {
			return "";
		}
		const werks = String(this.modeloOferta().getProperty("/perfil/centro") ?? "");
		return this.i18n().getText("regaloSinStock", [`${p.matnrRegalo} ${p.descRegalo}`.trim(), this.almacenDelPerfil() || "—", werks, cantidadTxt(p.stockRegalo ?? 0), cantidadTxt(p.cantidadRegalo)]) as string;
	}

	/** "Con 200 UN de SFX428H-150-MTK recibe 20 UN de PM-13008-C FILTRO COMB de regalo." (uno por regalo). */
	private textoAvisoRegalo(material: string, cantidad: number, unidad: string, regalos: PromoRegalo[]): string {
		return regalos
			.map((p) => this.i18n().getText("regaloAviso", [cantidadTxt(cantidad), p.unidad || unidad, material, cantidadTxt(p.cantidadRegalo), p.unidadRegalo || "UN", `${p.matnrRegalo} ${p.descRegalo}`.trim()]) as string)
			.join("\n");
	}

	/** Fila de la tabla "Articulos gratis" del detalle del material: todas las promociones vigentes, con la que aplica resaltada. */
	private filaRegaloDetalle(p: PromoRegalo, cantidad: number): Record<string, unknown> {
		const i18n = this.i18n();
		const regla = i18n.getText("regaloRegla", [cantidadTxt(p.regaloPorCada), p.unidadRegalo || "UN", cantidadTxt(p.porCada), p.unidad || "UN"]) as string;
		const estado =
			p.estado === "A"
				? { estadoTxt: i18n.getText("regaloAplica", [cantidadTxt(cantidad), p.unidad || "UN", cantidadTxt(p.cantidadRegalo), p.unidadRegalo || "UN"]), estadoState: "Success", highlight: "Success" }
				: p.estado === "N"
					? { estadoTxt: i18n.getText("regaloNoAlcanza"), estadoState: "None", highlight: "None" }
					: p.estado === "E"
						? { estadoTxt: p.mensaje, estadoState: "Warning", highlight: "None" }
						: { estadoTxt: "", estadoState: "None", highlight: "None" };
		const stock =
			p.stockRegalo === undefined
				? { stockTxt: "", stockState: "None" }
				: {
						stockTxt: i18n.getText("regaloStockDetalle", [this.almacenDelPerfil() || "—", cantidadTxt(p.stockRegalo), p.unidadRegalo || "UN"]) as string,
						stockState: p.estado === "A" && faltanteStock(p) > 0 ? "Warning" : "None"
					};
		return {
			minimo: `${cantidadTxt(p.desde)} ${p.unidad || "UN"}`,
			articulo: p.matnrRegalo,
			descripcion: p.descRegalo,
			regla: p.tipo === "2" ? regla : `${regla} · ${i18n.getText("regaloIncluido") as string}`,
			...estado,
			...stock
		};
	}

	/** Promociones del material del detalle abierto, con la cantidad del dialogo. Solo repuestos leidos de SAP. */
	private async cargarRegalosDetalle(m: Vehiculo & Repuesto & { tipo: string }, cantidad: number): Promise<void> {
		const modelo = this.dialogoDetalle?.getModel("detalle") as JSONModel | undefined;
		const consulta = m.tipo === "repuestos" && m.origen === "sap" ? this.consultaRegalo({ orgVentas: m.orgVentas, sector: m.sectorOferta, sectorMaterial: m.sector, material: m.material }, cantidad) : undefined;
		if (!modelo || !consulta) {
			return;
		}
		const turno = ++this.turnoRegalosDetalle;
		modelo.setProperty("/cargandoRegalos", true);
		try {
			const promos = await consultarRegalos((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel, consulta);
			if (turno !== this.turnoRegalosDetalle) {
				return;
			}
			modelo.setProperty("/regalos", promos.map((p) => this.filaRegaloDetalle(p, cantidad)));
			modelo.setProperty("/avisoRegalo", this.textoAvisoRegalo(m.material, cantidad, "UN", regalosQueAplican(promos)));
			modelo.setProperty("/proximoRegalo", this.textoProximoRegalo(promos, cantidad));
			modelo.setProperty("/stockRegalo", regalosQueAplican(promos).map((p) => this.textoSinStockRegalo(p)).filter(Boolean).join("\n"));
		} catch (error) {
			// Las promociones son informativas: si SAP no responde, el material se puede agregar igual.
			console.warn(`[Cotizador] promociones de ${m.material}: ${(error as Error).message}`);
		} finally {
			if (turno === this.turnoRegalosDetalle) {
				modelo.setProperty("/cargandoRegalos", false);
			}
		}
	}

	/**
	 * Tramos de precio por cantidad del material (entidad Escala de SAP): las condiciones con escala que SAP le aplica a este cliente (Z300
	 * precio de lista, Z323 y Z324 descuento al contado) y el precio que da SAP en cada tramo. Pruebas del 28/10/2026: la tabla decia "Sin
	 * escalas" aunque MOT112999 baja de 34,06 a 29,63 y 25,45 soles con 12 y 24 UN. Solo repuestos leidos de SAP.
	 */
	private async cargarEscalasDetalle(m: Vehiculo & Repuesto & { tipo: string }, cantidad: number): Promise<void> {
		const modelo = this.dialogoDetalle?.getModel("detalle") as JSONModel | undefined;
		const oferta = this.modeloOferta();
		const kunnr = (oferta.getProperty("/cliente") as Cliente | null)?.kunnr;
		if (!modelo || !kunnr || !this.usarOData() || m.tipo !== "repuestos" || m.origen !== "sap") {
			return;
		}
		const canal = canalDe(String(oferta.getProperty("/perfil/busqueda/canal") ?? "11"));
		const canalDoc = this.canalDeDocumento(m.orgVentas, m.sectorOferta, "repuestos") || canal;
		const consulta = {
			kunnr,
			vkorg: m.orgVentas,
			vtweg: canalDoc,
			spart: sectorDeCabecera(canalDoc, m.sector, m.orgVentas),
			auart: CLASE_OFERTA_PRECIO,
			matnr: m.material,
			werks: String(oferta.getProperty("/perfil/centro") ?? ""),
			waers: (oferta.getProperty("/perfil/moneda") === "USD" ? "USD" : "PEN") as "PEN" | "USD",
			...this.extrasPrecio()
		};
		const turno = ++this.turnoEscalasDetalle;
		modelo.setProperty("/cargandoEscalas", true);
		try {
			const escalas = await consultarEscalas((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel, consulta);
			if (turno !== this.turnoEscalasDetalle) {
				return;
			}
			this.tramosDetalle = tramosDeEscalas(escalas);
			this.pintarEscalasDetalle(Math.max(1, Number(modelo.getProperty("/cantidad")) || cantidad));
		} catch (error) {
			// Las escalas son informativas: el precio de la cantidad elegida ya lo da SAP aunque esta consulta falle.
			console.warn(`[Cotizador] escalas de ${m.material}: ${(error as Error).message}`);
		} finally {
			if (turno === this.turnoEscalasDetalle) {
				modelo.setProperty("/cargandoEscalas", false);
			}
		}
	}

	/** Tabla de tramos con el de la cantidad elegida resaltado, y el aviso del siguiente tramo que baja el precio. */
	private pintarEscalasDetalle(cantidad: number): void {
		const modelo = this.dialogoDetalle?.getModel("detalle") as JSONModel | undefined;
		if (!modelo) {
			return;
		}
		const i18n = this.i18n();
		const simbolo = (moneda: string): string => (moneda === "USD" ? "US$" : moneda === "PEN" ? "S/" : moneda);
		const precioTxt = (importe: number, moneda: string): string => `${simbolo(moneda)} ${this.formatMonto(importe)}`;
		const valorTxt = (c: EscalaSap): string => (c.moneda === "%" ? `${cantidadTxt(c.valor)} %` : `${this.formatMonto(c.valor)} ${c.moneda}`);
		const vigente = tramoVigente(this.tramosDetalle, cantidad);
		const siguiente = siguienteTramo(this.tramosDetalle, cantidad);
		modelo.setProperty(
			"/escalas",
			this.tramosDetalle.map((t) => ({
				desde: `${cantidadTxt(t.desde)} ${t.unidad || "UN"}`,
				condiciones: t.condiciones.map((c) => `${c.descripcion}: ${valorTxt(c)}`).join(" · "),
				precio: precioTxt(t.precio, t.moneda),
				highlight: t === vigente ? "Success" : "None"
			}))
		);
		modelo.setProperty(
			"/proximoTramo",
			siguiente ? (i18n.getText("escalaSiguiente", [cantidadTxt(siguiente.desde), siguiente.unidad || "UN", precioTxt(siguiente.precio, siguiente.moneda)]) as string) : ""
		);
	}

	/** Linea de regalo (precio 0, solo lectura) colgada de la linea que la genera; va en su mismo grupo (= la misma oferta SAP). */
	private lineaDeRegalo(padre: Linea, p: PromoRegalo): Linea {
		const i18n = this.i18n();
		const detalle = i18n.getText("regaloLineaDetalle", [cantidadTxt(padre.cantidad), p.unidad || "UN", padre.material]) as string;
		const werks = String(this.modeloOferta().getProperty("/perfil/centro") ?? "");
		const avisoStock =
			faltanteStock(p) > 0 ? (i18n.getText("regaloSinStockLinea", [werks, this.almacenDelPerfil() || "—", cantidadTxt(p.stockRegalo ?? 0), cantidadTxt(p.cantidadRegalo)]) as string) : "";
		return {
			uid: `L${(this.contadorLinea += 1)}`,
			grupo: padre.grupo,
			orgVentas: padre.orgVentas,
			sector: padre.sector,
			sectorMaterial: padre.sectorMaterial,
			material: p.matnrRegalo,
			denominacion: p.descRegalo || p.matnrRegalo,
			detalle: p.tipo === "2" ? detalle : `${detalle} · ${i18n.getText("regaloIncluido") as string}`,
			cantidad: p.cantidadRegalo,
			precio: 0,
			total: 0,
			// Con impuestos en cero el grupo sigue mostrando sus totales (exige que todas sus lineas los traigan).
			isc: 0,
			igvImporte: 0,
			totalConImpuestos: 0,
			totalNeto: 0,
			impuestoIncluido: true,
			impuestoEstimado: padre.impuestoEstimado,
			bonificacion: true,
			sinTalla: true,
			mecanismo: p.mecanismo,
			...(p.spartRegalo ? { sectorRegalo: p.spartRegalo } : {}),
			...(avisoStock ? { avisoStock } : {}),
			origen: padre.uid
		};
	}

	/**
	 * Vuelve a pedir a SAP los regalos de cada linea de repuestos y deja en la oferta las lineas de regalo que tocan con su cantidad (pruebas del
	 * 28/10/2026: el cotizador anterior y VA21 los muestran al agregar el material; el Cotizador solo los mostraba despues de guardar). Las
	 * lineas de regalo de una linea se reemplazan solo si SAP respondio; si falla, quedan las que habia. Avisa cuando aparece o cambia un regalo.
	 */
	private async actualizarRegalos(): Promise<void> {
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		const padres = lineas.filter((l) => !l.bonificacion && !l.variante && !l.unica && !!l.uid && (l.precioPenSap !== undefined || l.precioFinal !== undefined));
		const consultas = padres.map((l) => ({ l, consulta: this.consultaRegalo(l, l.cantidad) })).filter((x) => !!x.consulta);
		if (consultas.length === 0) {
			return;
		}
		const turno = ++this.turnoRegalos;
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const respuestas = await Promise.all(
			consultas.map(async ({ l, consulta }) => ({
				uid: l.uid as string,
				promos: await consultarRegalos(odata, consulta as ConsultaRegalo).catch((e: Error) => {
					console.warn(`[Cotizador] promociones de la linea ${l.material}: ${e.message}`);
					return null;
				})
			}))
		);
		if (turno !== this.turnoRegalos) {
			return;
		}
		const porLinea = new Map(respuestas.filter((r) => r.promos !== null).map((r) => [r.uid, r.promos as PromoRegalo[]]));
		const avisos: string[] = [];
		const nuevas: Linea[] = [];
		for (const l of (oferta.getProperty("/lineas") as Linea[]) ?? []) {
			// Los regalos de promocion de una linea que SAP volvio a calcular se reemplazan (los de la moto, con talla, no se tocan).
			if (l.bonificacion && l.sinTalla && l.origen && porLinea.has(l.origen)) {
				continue;
			}
			nuevas.push(l);
			const promos = l.uid ? porLinea.get(l.uid) : undefined;
			if (!promos || l.bonificacion) {
				continue;
			}
			const aplican = regalosQueAplican(promos);
			aplican.forEach((p) => nuevas.push(this.lineaDeRegalo(l, p)));
			l.proximoRegalo = this.textoProximoRegalo(promos, l.cantidad);
			const clave = claveRegalos(promos);
			if (clave && clave !== this.regalosAvisados.get(l.uid as string)) {
				avisos.push(this.textoAvisoRegalo(l.material, l.cantidad, "UN", aplican));
				aplican.map((p) => this.textoSinStockRegalo(p)).filter(Boolean).forEach((t) => avisos.push(t));
			}
			this.regalosAvisados.set(l.uid as string, clave);
		}
		oferta.setProperty("/lineas", nuevas);
		this.recalcular();
		if (avisos.length) {
			MessageToast.show(avisos.join("\n"), { duration: 6000 });
		}
	}


	/* ---------- Acciones sobre el cliente (datos de ejemplo; en SAP: estado de cuenta FI, ZSDSCPP002 y ampliacion de area) ---------- */

	private async abrirCliente(nombre: string, datos: Record<string, unknown>): Promise<void> {
		if (!this.dialogosCliente[nombre]) {
			const dlg = (await Fragment.load({
				id: this.getView()?.getId(),
				name: `com.socopur.cotizador.view.fragment.${nombre}`,
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(dlg);
			dlg.setModel(new JSONModel(), "cli");
			this.dialogosCliente[nombre] = dlg;
		}
		const dlg = this.dialogosCliente[nombre];
		(dlg.getModel("cli") as JSONModel).setData(datos);
		this.dialogoClienteActual = dlg;
		dlg.open();
	}

	private clienteActual(): Cliente | null {
		return (this.modeloOferta().getProperty("/cliente") as Cliente | null) ?? null;
	}

	private areasTexto(claves: string[]): { key: string; text: string }[] {
		const todas = this.modeloMock().getProperty("/canalesArea") as { key: string; text: string }[];
		return todas.filter((a) => claves.includes(a.key));
	}

	public async onEstadoCuenta(): Promise<void> {
		const cl = this.clienteActual();
		if (!cl) {
			return;
		}
		const m = (n: number): string => `S/ ${this.formatMonto(n)}`;
		if (cl.credito) {
			// Datos reales: sin segmento elegido (mapeo por confirmar) se muestran todos los segmentos con su vigencia.
			const r = cl.credito;
			const i18n = this.i18n();
			await this.abrirCliente("EstadoCuenta", {
				real: true,
				linea: r.segmentoElegido ? m(r.segmentoElegido.limite) : (i18n.getText("cuentaVariosSegmentos") as string),
				saldo: textoPorMoneda(r.saldos, "saldo", (n) => this.formatMonto(n), String(this.modeloOferta().getProperty("/perfil/moneda") || "PEN")),
				disponible: r.disponible === null ? "\u2014" : m(r.disponible),
				vencido: textoPorMoneda(r.saldos, "vencido", (n) => this.formatMonto(n), String(this.modeloOferta().getProperty("/perfil/moneda") || "PEN")),
				vencidoEstado: r.hayVencido ? "Error" : "Success",
				segmentos: r.segmentos.map((s) => ({
					segmento: s.segmento,
					limite: this.formatMonto(s.limite),
					vigencia: s.vigenteHasta.startsWith("9") ? (i18n.getText("credSinVencimiento") as string) : s.vigenteHasta,
					estado: s.bloqueado ? (i18n.getText("credBloqueado") as string) : s.vigente ? (i18n.getText("credVigente") as string) : (i18n.getText("credLimiteVencido") as string),
					estadoState: s.bloqueado ? "Error" : s.vigente ? "Success" : "Warning"
				})),
				movimientos: cl.movimientos ?? []
			});
			return;
		}
		const ec = cl.estadoCuenta ?? { saldo: 0, vencido: 0, movimientos: [] };
		const linea = cl.lineaCredito ?? 0;
		await this.abrirCliente("EstadoCuenta", {
			linea: m(linea),
			saldo: m(ec.saldo),
			disponible: m(Math.max(0, linea - ec.saldo)),
			vencido: m(ec.vencido),
			vencidoEstado: ec.vencido > 0 ? "Error" : "Success",
			movimientos: ec.movimientos
		});
	}

	public async onFichaCompleta(): Promise<void> {
		const cl = this.clienteActual();
		if (cl) {
			await this.abrirCliente("FichaCliente", { ...cl, direcciones: this.direccionesDe(cl), areas: this.areasTexto(cl.areas ?? []), cambios: [] });
			void this.cargarHistorialCliente(cl);
		}
	}

	/** Historial de cambios del cliente (quien, cuando y que campo) en la ficha. Solo con SAP real y si el servicio ya publica ClienteCambio. */
	private async cargarHistorialCliente(cl: Cliente): Promise<void> {
		if (!this.usarOData() || !cl.kunnr) {
			return;
		}
		try {
			const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
			if (!(await serviciosDeCliente(odata)).historial) {
				return;
			}
			const cambios = await leerCambiosCliente(odata, cl.kunnr);
			(this.dialogosCliente["FichaCliente"]?.getModel("cli") as JSONModel | undefined)?.setProperty("/cambios", cambios);
		} catch {
			// el historial es informativo: si no se puede leer, la ficha se muestra sin el
		}
	}

	private direccionesDe(cl: Cliente): Direccion[] {
		return cl.direcciones?.length ? cl.direcciones : [{ id: "D1", alias: this.i18n().getText("direccionFiscal") as string, tipo: "Fiscal", texto: cl.direccion }];
	}

	public async onEditarCliente(): Promise<void> {
		const cl = this.clienteActual();
		if (!cl) {
			return;
		}
		const nombre = cl.nombre ?? "";
		// Con SAP real (y si el servicio ya publica la edicion) se guarda en SAP y se leen los bloqueos; si no, sigue simulado.
		let real = false;
		let bloqueoAviso = "";
		let nombreBloqueado = false;
		if (this.usarOData() && cl.kunnr) {
			const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
			const servicios = await serviciosDeCliente(odata);
			real = servicios.edicion;
			if (real && servicios.bloqueo) {
				const bloqueo = await leerBloqueoEdicion(odata, cl.kunnr);
				nombreBloqueado = !!bloqueo?.nombreBloqueado;
				bloqueoAviso = nombreBloqueado ? bloqueo?.nombreMotivo || (this.i18n().getText("editarNombreBloqueado") as string) : "";
			}
		}
		await this.abrirCliente("EditarCliente", {
			real,
			nombreBloqueado,
			bloqueoAviso,
			tipoDoc: cl.tipoDoc,
			doc: cl.doc,
			razon: nombre,
			telefono: cl.telefono,
			correo: cl.correo,
			original: { razon: nombre, telefono: cl.telefono, correo: cl.correo },
			direcciones: this.direccionesDe(cl).map((x) => ({ ...x })),
			tiposDireccion: [
				{ key: "Fiscal", text: this.i18n().getText("direccionFiscal") },
				{ key: "Envio", text: this.i18n().getText("direccionTipoEnvio") },
				{ key: "Otra", text: this.i18n().getText("direccionTipoOtra") }
			],
			errores: ""
		});
	}

	public onAgregarDireccion(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const lista = (modelo.getProperty("/direcciones") as Direccion[]) ?? [];
		modelo.setProperty("/direcciones", [...lista, { id: `D${Date.now()}`, alias: "", tipo: "Envio", texto: "" }]);
	}

	public onQuitarDireccion(event: Event): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const fila = (event.getSource() as unknown as Control).getBindingContext("cli")?.getObject() as Direccion | undefined;
		if (fila) {
			modelo.setProperty("/direcciones", (modelo.getProperty("/direcciones") as Direccion[]).filter((x) => x !== fila));
		}
	}

	/** Nombre o razon social como se compara y se guarda: sin espacios de mas. */
	private razonLimpia(valor: unknown): string {
		return String(valor ?? "").replace(/\s+/g, " ").trim();
	}

	/** Con el servicio de edicion publicado guarda en SAP (nombre, telefono y correo); si no, queda simulado (en SAP lo hace ZSDSCPP002). */
	public onGuardarCliente(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const i18n = this.i18n();
		const errores: string[] = [];
		const razon = this.razonLimpia(modelo.getProperty("/razon"));
		if (!razon) {
			errores.push(i18n.getText("altaErrRazon") as string);
		} else if (partirRazon(razon).length > 3) {
			errores.push(i18n.getText("altaErrRazonLarga") as string);
		}
		if (!/^9\d{8}$/.test(String(modelo.getProperty("/telefono") ?? "").replace(/\s/g, ""))) {
			errores.push(i18n.getText("altaErrCelular") as string);
		}
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(modelo.getProperty("/correo") ?? ""))) {
			errores.push(i18n.getText("altaErrEmail") as string);
		}
		const dirs = (modelo.getProperty("/direcciones") as Direccion[]) ?? [];
		if (!modelo.getProperty("/real") && dirs.some((x) => !x.texto.trim())) {
			errores.push(i18n.getText("editarErrDirecciones") as string);
		}
		if (!modelo.getProperty("/real") && !dirs.some((x) => x.tipo === "Fiscal")) {
			errores.push(i18n.getText("editarErrFiscal") as string);
		}
		modelo.setProperty("/errores", errores.join("\n"));
		if (errores.length) {
			return;
		}
		const oferta = this.modeloOferta();
		const cl = this.clienteActual();
		if (!cl) {
			return;
		}
		if (modelo.getProperty("/real") && cl.kunnr) {
			void this.guardarClienteEnSap(modelo, cl, razon);
			return;
		}
		const limpias = dirs.map((x) => ({ ...x, alias: x.alias.trim() || (i18n.getText("direccionSinNombre") as string), texto: x.texto.trim() }));
		const cambios: Record<string, unknown> = {
			nombre: razon,
			telefono: modelo.getProperty("/telefono"),
			correo: modelo.getProperty("/correo"),
			direcciones: limpias,
			direccion: (limpias.find((x) => x.tipo === "Fiscal") as Direccion).texto
		};
		Object.entries(cambios).forEach(([k, val]) => {
			oferta.setProperty(`/cliente/${k}`, val);
			this.modeloMock().setProperty(`/clientes/${cl.doc}/${k}`, val);
		});
		this.aplicarDireccionEnvio();
		this.dialogoClienteActual?.close();
		MessageToast.show(`${i18n.getText("editarOk")} (${i18n.getText("simulacion")})`);
	}

	/** PATCH de los campos que cambiaron. Las direcciones aun no se editan en SAP desde esta pantalla (ver contrato, seccion 2.3). */
	private async guardarClienteEnSap(modelo: JSONModel, cl: Cliente, razon: string): Promise<void> {
		const i18n = this.i18n();
		const orig = modelo.getProperty("/original") as Record<string, string>;
		const actual: Record<string, string> = {
			celular: String(modelo.getProperty("/telefono") ?? "").replace(/\s/g, ""),
			email: String(modelo.getProperty("/correo") ?? "")
		};
		const origen: Record<string, string> = { celular: orig.telefono, email: orig.correo };
		const cambios: CambiosCliente = {};
		for (const [k, v] of Object.entries(actual)) {
			if (v !== origen[k]) {
				(cambios as Record<string, string>)[k] = v;
			}
		}
		// El nombre viaja completo (las tres partes, aunque alguna quede vacia): la particion de SAP puede no coincidir con la de aqui.
		if (razon !== this.razonLimpia(orig.razon)) {
			const [razon1 = "", razon2 = "", razon3 = ""] = partirRazon(razon);
			Object.assign(cambios, { razon1, razon2, razon3 });
		}
		if (Object.keys(cambios).length === 0) {
			this.dialogoClienteActual?.close();
			return;
		}
		quitarTodosLosMensajes();
		this.dialogoClienteActual?.setBusy(true);
		try {
			await modificarClienteSap((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel, cl.kunnr as string, cambios);
			const oferta = this.modeloOferta();
			oferta.setProperty("/cliente/nombre", razon);
			oferta.setProperty("/cliente/telefono", actual.celular);
			oferta.setProperty("/cliente/correo", actual.email);
			this.dialogoClienteActual?.close();
			MessageToast.show(i18n.getText("editarOk") as string);
		} catch (error) {
			modelo.setProperty("/errores", i18n.getText("editarErrSap", [this.motivoDeError(error)]) as string);
		} finally {
			this.dialogoClienteActual?.setBusy(false);
		}
	}

	/** Deja elegida la direccion de envio: la ya elegida si sigue existiendo; si no, la primera de tipo envio o la fiscal. */
	private aplicarDireccionEnvio(): void {
		const oferta = this.modeloOferta();
		const cl = oferta.getProperty("/cliente") as Cliente | null;
		if (!cl) {
			oferta.setProperty("/opcionesDireccion", []);
			oferta.setProperty("/opcionesFactura", []);
			oferta.setProperty("/entregaDatos/direccionId", "");
			oferta.setProperty("/entregaDatos/direccionEnvio", "");
			oferta.setProperty("/entregaDatos/facturaId", "");
			oferta.setProperty("/entregaDatos/direccionFactura", "");
			return;
		}
		const dirs = this.direccionesDe(cl);
		if (!cl.direcciones?.length) {
			oferta.setProperty("/cliente/direcciones", dirs);
		}
		// Ultima opcion: direccion de un solo uso, que se guarda solo en la oferta (SAP crea una direccion propia del documento).
		oferta.setProperty("/opcionesDireccion", [...ordenarPorTexto(dirs, (d) => d.alias), { id: "__unica__", alias: this.i18n().getText("direccionUnica") as string, tipo: "", texto: "" }]);
		// Direccion de facturacion: todas las direcciones del cliente, la fiscal por defecto.
		const ordenadas = ordenarPorTexto(dirs, (d) => d.alias);
		oferta.setProperty("/opcionesFactura", ordenadas);
		const facturaActual = oferta.getProperty("/entregaDatos/facturaId") as string;
		const factura = dirs.find((x) => x.id === facturaActual) ?? dirs.find((x) => x.tipo === "Fiscal") ?? dirs[0];
		oferta.setProperty("/entregaDatos/facturaId", factura.id);
		oferta.setProperty("/entregaDatos/direccionFactura", factura.texto);
		const actual = oferta.getProperty("/entregaDatos/direccionId") as string;
		if (actual === "__unica__") {
			oferta.setProperty("/entregaDatos/direccionEnvio", oferta.getProperty("/entregaDatos/direccionUnica") ?? "");
			return;
		}
		const elegida = dirs.find((x) => x.id === actual) ?? dirs.find((x) => x.tipo === "Envio") ?? dirs[0];
		oferta.setProperty("/entregaDatos/direccionId", elegida.id);
		oferta.setProperty("/entregaDatos/direccionEnvio", elegida.texto);
	}

	public onCambiaDireccionEnvio(): void {
		const oferta = this.modeloOferta();
		const id = oferta.getProperty("/entregaDatos/direccionId") as string;
		if (id === "__unica__") {
			oferta.setProperty("/entregaDatos/direccionEnvio", oferta.getProperty("/entregaDatos/direccionUnica") ?? "");
			return;
		}
		const dirs = (oferta.getProperty("/cliente/direcciones") as Direccion[]) ?? [];
		oferta.setProperty("/entregaDatos/direccionEnvio", dirs.find((x) => x.id === id)?.texto ?? "");
	}

	public onCambiaDireccionFactura(): void {
		const oferta = this.modeloOferta();
		const id = oferta.getProperty("/entregaDatos/facturaId") as string;
		const dirs = (oferta.getProperty("/cliente/direcciones") as Direccion[]) ?? [];
		oferta.setProperty("/entregaDatos/direccionFactura", dirs.find((x) => x.id === id)?.texto ?? "");
	}

	public onCambiaDireccionUnica(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/direccionEnvio", String(oferta.getProperty("/entregaDatos/direccionUnica") ?? "").trim());
	}

	/**
	 * Transportistas: tabla con busqueda y paginado en el servidor (son unos 1700 proveedores de SAP). Sin SAP (prototipo) se usan los de EJEMPLO.
	 * Al pedido viaja el rol segun el transportista: ZT si es cliente, SP si solo es proveedor (aun no se envia: solo se muestra e imprime).
	 */
	private async cargarTransportistas(): Promise<void> {
		const oferta = this.modeloOferta();
		const texto = String(oferta.getProperty("/transp/texto") ?? "");
		const pagina = Number(oferta.getProperty("/transp/pagina")) || 1;
		const tamano = Number(oferta.getProperty("/transp/tamano")) || 10;
		oferta.setProperty("/transp/cargando", true);
		oferta.setProperty("/transp/error", "");
		try {
			const odata = this.usarOData() ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
			const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
			const r = odata
				? await buscarTransportistas(odata, texto, pagina, tamano)
				: buscarTransportistasMock((mock.getProperty("/transportistas") as TransportistaMock[]) ?? [], texto, pagina, tamano);
			oferta.setProperty("/transp/filas", r.filas);
			oferta.setProperty("/transp/total", r.total);
			oferta.setProperty("/transp/paginas", Math.max(1, Math.ceil(r.total / tamano)));
			oferta.setProperty("/transp/cargado", true);
		} catch (error) {
			oferta.setProperty("/transp/filas", []);
			oferta.setProperty("/transp/error", this.i18n().getText("transpError", [(error as Error).message]) as string);
		} finally {
			oferta.setProperty("/transp/cargando", false);
		}
	}

	public onBuscarTransportista(event: Event): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/transp/texto", (event.getSource() as SearchField).getValue().trim());
		oferta.setProperty("/transp/pagina", 1);
		void this.cargarTransportistas();
	}

	public onTranspTamano(): void {
		this.modeloOferta().setProperty("/transp/pagina", 1);
		void this.cargarTransportistas();
	}

	public onTranspAnterior(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/transp/pagina", Math.max(1, (Number(oferta.getProperty("/transp/pagina")) || 1) - 1));
		void this.cargarTransportistas();
	}

	public onTranspSiguiente(): void {
		const oferta = this.modeloOferta();
		const paginas = Number(oferta.getProperty("/transp/paginas")) || 1;
		oferta.setProperty("/transp/pagina", Math.min(paginas, (Number(oferta.getProperty("/transp/pagina")) || 1) + 1));
		void this.cargarTransportistas();
	}

	/** "Direcciones" de una fila: lista las sedes del transportista y deja elegir una. */
	public async onVerSedes(event: Event): Promise<void> {
		const fila = (event.getSource() as Control).getBindingContext("oferta")?.getObject() as FilaTransportista | undefined;
		if (!fila) {
			return;
		}
		let sedes: SedeTransportista[];
		try {
			const odata = this.usarOData() ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
			const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
			sedes = odata ? await cargarSedes(odata, fila.id) : (((mock.getProperty("/transportistas") as TransportistaMock[]) ?? []).find((t) => t.key === fila.id)?.sedes ?? []);
		} catch (error) {
			MessageBox.error(this.i18n().getText("transpSedeError", [(error as Error).message]) as string);
			return;
		}
		if (!this.dialogoSedes) {
			this.dialogoSedes = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.SedesTransportista",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoSedes);
			this.dialogoSedes.setModel(new JSONModel(), "sedes");
		}
		const actual = this.modeloOferta().getProperty("/entregaDatos/transportista") === fila.id ? String(this.modeloOferta().getProperty("/entregaDatos/sede") ?? "") : "";
		(this.dialogoSedes.getModel("sedes") as JSONModel).setData({ transportista: fila, sedes, elegida: actual || (sedes.length === 1 ? sedes[0].key : "") });
		this.dialogoSedes.open();
	}

	public onSedeSeleccion(event: ListBase$SelectionChangeEvent): void {
		const sede = event.getParameter("listItem")?.getBindingContext("sedes")?.getObject() as SedeTransportista | undefined;
		(this.dialogoSedes?.getModel("sedes") as JSONModel).setProperty("/elegida", sede?.key ?? "");
	}

	public onElegirSede(): void {
		const datos = (this.dialogoSedes?.getModel("sedes") as JSONModel).getData() as { transportista: FilaTransportista; sedes: SedeTransportista[]; elegida: string };
		const sede = datos.sedes.find((s) => s.key === datos.elegida);
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/transportista", datos.transportista.id);
		oferta.setProperty("/entregaDatos/transportistaTexto", datos.transportista.nombre);
		oferta.setProperty("/entregaDatos/transportistaRol", datos.transportista.rol);
		oferta.setProperty("/entregaDatos/transportistaKunnr", datos.transportista.kunnr);
		oferta.setProperty("/entregaDatos/transportistaLifnr", datos.transportista.lifnr);
		oferta.setProperty("/entregaDatos/sede", sede?.key ?? "");
		oferta.setProperty("/entregaDatos/sedeDireccion", sede?.direccion ?? "");
		this.dialogoSedes?.close();
	}

	public onCerrarSedes(): void {
		this.dialogoSedes?.close();
	}

	public onQuitarTransportista(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/transportista", "");
		oferta.setProperty("/entregaDatos/transportistaTexto", "");
		oferta.setProperty("/entregaDatos/transportistaRol", "");
		oferta.setProperty("/entregaDatos/transportistaKunnr", "");
		oferta.setProperty("/entregaDatos/transportistaLifnr", "");
		oferta.setProperty("/entregaDatos/sede", "");
		oferta.setProperty("/entregaDatos/sedeDireccion", "");
	}

	public async onAmpliarAbrir(): Promise<void> {
		const cl = this.clienteActual();
		if (!cl) {
			return;
		}
		const odata = this.usarOData() ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
		const conRetail = !!odata && !!cl.kunnr && (await ampliacionPublicada(odata).catch(() => false));
		// El filtro arranca en la organizacion del vendedor (si el cliente la tiene en alguna lista): con 100 areas o mas la ventana se hacia larga.
		await this.abrirCliente("AmpliarArea", {
			...this.areasParaAmpliar(cl),
			nueva: "",
			filtroOrg: String(this.modeloOferta().getProperty("/perfil/orgVentas") ?? ""),
			retail: { visible: conRetail, cargando: conRetail, gruposTodos: [] }
		});
		this.aplicarFiltroAmpliacion();
		if (conRetail && odata) {
			await this.cargarAmpliacionRetail(odata, cl.kunnr as string);
		}
	}

	/**
	 * Areas actuales del cliente (agrupadas por organizacion, canal y condicion: una fila por sector eran mas de 100) y las que se pueden pedir
	 * a datos maestros, para el dialogo de ampliacion. Sin filtrar: el filtro lo aplica aplicarFiltroAmpliacion.
	 */
	private areasParaAmpliar(cl: Cliente): { areasTodas: FilaAmpliacion[]; disponiblesTodas: (FilaPorOrg & { key: string; text: string })[] } {
		const i18n = this.i18n();
		const todas = this.modeloMock().getProperty("/canalesArea") as { key: string; text: string }[];
		const actuales = cl.areas ?? [];
		// Las areas de SAP vienen como organizacion/canal/sector: se comparan por organizacion/canal con la lista de areas que se pueden pedir.
		const actualesOrgCanal = areasOrgCanal(actuales);
		const canales = (this.modeloOferta().getProperty("/opciones/canales") as { key: string; text: string }[]) ?? [];
		const canal = (vtweg: string): string => canales.find((x) => x.key === vtweg)?.text ?? vtweg;
		// Con clientes de SAP se listan sus areas reales (todas, no solo las del vendedor) con la condicion de cada una.
		const condiciones = cl.condicionesAreas ?? [];
		const reales = opcionesAreaCliente(condiciones, organizacionesDe(condiciones)).map((o) => ({
			vkorg: o.vkorg,
			titulo: i18n.getText("ampliarAreaTitulo", [textoOrganizacion(o.vkorg), canal(o.vtweg)]) as string,
			detalle: i18n.getText("ampliarAreaDetalle", [o.sectores.join(", "), o.zterm || "—", o.waers || "—"]) as string
		}));
		const ejemplo = this.areasTexto(actuales).map((a) => ({ vkorg: a.key.split("/")[0], titulo: a.text, detalle: "" }));
		return {
			areasTodas: reales.length > 0 ? reales : ejemplo,
			disponiblesTodas: todas.filter((a) => !actualesOrgCanal.includes(a.key)).map((a) => ({ ...a, vkorg: a.key.split("/")[0] }))
		};
	}

	/** Filtro por organizacion del dialogo de ampliacion: se aplica a las areas actuales, a las retail pendientes y a las que se pueden pedir. */
	public onFiltrarAmpliacion(): void {
		this.aplicarFiltroAmpliacion();
	}

	private aplicarFiltroAmpliacion(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const areas = (modelo.getProperty("/areasTodas") as FilaAmpliacion[]) ?? [];
		const disponibles = (modelo.getProperty("/disponiblesTodas") as (FilaPorOrg & { key: string; text: string })[]) ?? [];
		const pendientes = (modelo.getProperty("/retail/gruposTodos") as FilaAmpliacion[]) ?? [];
		const orgs = organizacionesDe(areas, disponibles, pendientes);
		// Una organizacion que no esta en ninguna lista (p. ej. la del vendedor en un cliente de otra empresa) deja el filtro en "Todas".
		const org = orgs.includes(String(modelo.getProperty("/filtroOrg") ?? "")) ? String(modelo.getProperty("/filtroOrg")) : "";
		modelo.setProperty("/filtroOrg", org);
		modelo.setProperty("/orgsFiltro", [{ key: "", text: this.i18n().getText("ampliarFiltroTodas") as string }, ...orgs.map((o) => ({ key: o, text: textoOrganizacion(o) }))]);
		modelo.setProperty("/areas", filtrarPorOrg(areas, org));
		modelo.setProperty("/disponibles", filtrarPorOrg(disponibles, org));
		modelo.setProperty("/retail/grupos", filtrarPorOrg(pendientes, org));
		if (!filtrarPorOrg(disponibles, org).some((a) => a.key === modelo.getProperty("/nueva"))) {
			modelo.setProperty("/nueva", "");
		}
	}

	/** Lee de SAP lo que le falta al cliente para la ampliacion retail y lo pone en el dialogo. */
	private async cargarAmpliacionRetail(odata: ODataModel, kunnr: string): Promise<void> {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		modelo.setProperty("/retail/cargando", true);
		try {
			modelo.setProperty("/retail", this.datosRetail(await leerAmpliacion(odata, kunnr)));
		} catch (error) {
			modelo.setProperty("/retail", { visible: true, cargando: false, gruposTodos: [], puede: false, estadoTipo: "Error", estadoTexto: this.i18n().getText("ampliarRetailErrLectura", [this.motivoDeError(error)]) as string });
		}
		this.aplicarFiltroAmpliacion();
	}

	private datosRetail(e: EstadoAmpliacion | null): Record<string, unknown> {
		const i18n = this.i18n();
		const canales = (this.modeloOferta().getProperty("/opciones/canales") as { key: string; text: string }[]) ?? [];
		const enCurso = e?.estado === "A";
		const estadoTexto = enCurso ? i18n.getText("ampliarRetailEnCurso") : e?.estado === "E" ? i18n.getText("ampliarRetailFallo", [e.mensaje]) : "";
		const resumen = !e
			? i18n.getText("ampliarRetailSinCliente")
			: !e.pendiente
				? i18n.getText("ampliarRetailCompleto")
				: e.areasPendientes === 0
					? i18n.getText("ampliarRetailSoloDatos")
					: i18n.getText(e.sociedades ? "ampliarRetailFaltanSoc" : "ampliarRetailFaltan", [e.areasPendientes, e.sociedades]);
		return {
			visible: true,
			cargando: false,
			resumen,
			estadoTexto,
			estadoTipo: enCurso ? "Warning" : "Error",
			puede: !!e?.pendiente && !enCurso,
			// El boton amplia TODO lo pendiente (regla de ZSDSCPP002), aunque el filtro muestre una sola organizacion: el texto lo dice.
			accion: e?.areasPendientes ? i18n.getText("ampliarRetailAccionN", [e.areasPendientes]) : i18n.getText("ampliarRetailAccion"),
			gruposTodos: (e?.grupos ?? []).map((g) => ({
				vkorg: g.vkorg,
				titulo: i18n.getText("ampliarAreaTitulo", [textoOrganizacion(g.vkorg), canales.find((c) => c.key === g.vtweg)?.text ?? `canal ${g.vtweg}`]) as string,
				detalle: i18n.getText("ampliarRetailSectores", [g.sectores.join(", ")]) as string
			}))
		};
	}

	/** Amplia el cliente en SAP a las areas retail que le faltan (accion ampliarRetail; la hace un job de fondo) y recarga sus areas. */
	public onAmpliarRetail(): void {
		const cl = this.clienteActual();
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!cl?.kunnr || !odata) {
			return;
		}
		const kunnr = cl.kunnr;
		MessageBox.confirm(this.i18n().getText("ampliarRetailConfirmar", [cl.nombre, kunnr]) as string, {
			onClose: (accion: string) => {
				if (accion === MessageBox.Action.OK) {
					void this.ejecutarAmpliacionRetail(odata, kunnr, modelo);
				}
			}
		});
	}

	private async ejecutarAmpliacionRetail(odata: ODataModel, kunnr: string, modelo: JSONModel): Promise<void> {
		const i18n = this.i18n();
		modelo.setProperty("/retail/cargando", true);
		modelo.setProperty("/retail/puede", false);
		quitarTodosLosMensajes();
		try {
			const e = await ampliarRetail(odata, kunnr);
			modelo.setProperty("/retail", this.datosRetail(e));
			if (e.estado === "M") {
				await this.recargarAreasCliente(odata, kunnr);
				const cl = this.clienteActual();
				if (cl) {
					const { areasTodas, disponiblesTodas } = this.areasParaAmpliar(cl);
					modelo.setProperty("/areasTodas", areasTodas);
					modelo.setProperty("/disponiblesTodas", disponiblesTodas);
				}
				MessageToast.show(i18n.getText("ampliarRetailOk", [e.mensaje]) as string, { duration: 6000 });
			}
		} catch (error) {
			if (error instanceof AmpliacionEnProcesoError) {
				modelo.setProperty("/retail", { ...(modelo.getProperty("/retail") as object), cargando: false, puede: false, estadoTipo: "Warning", estadoTexto: i18n.getText("ampliarRetailEnCurso") as string });
			} else {
				modelo.setProperty("/retail", { ...(modelo.getProperty("/retail") as object), cargando: false, puede: true, estadoTipo: "Error", estadoTexto: i18n.getText("ampliarRetailRechazo", [this.motivoDeError(error)]) as string });
			}
		}
		this.aplicarFiltroAmpliacion();
	}

	/**
	 * Tras ampliar: vuelve a leer las areas del cliente en SAP, sin tocar el resto de la oferta (direccion, lineas). El area elegida en la
	 * oferta se conserva: con areas nuevas en la misma organizacion (p. ej. el canal 15) el desplegable volvia a "elegir" (prueba del 29/10/2026).
	 */
	private async recargarAreasCliente(odata: ODataModel, kunnr: string): Promise<void> {
		const encontrado = (await buscarClientes(odata, kunnr)).find((c) => c.kunnr === kunnr);
		const oferta = this.modeloOferta();
		const cl = this.clienteActual();
		if (!encontrado || !cl || cl.kunnr !== kunnr) {
			return;
		}
		const previa = String(oferta.getProperty("/areaClienteSel") ?? "");
		oferta.setProperty("/cliente", { ...cl, areas: encontrado.areas, condicionesAreas: encontrado.condicionesAreas });
		this.cargarAreasCliente();
		const misma = previa ? ((oferta.getProperty("/areasCliente") as OpcionAreaCliente[]) ?? []).find((o) => o.key === previa) : undefined;
		if (misma) {
			oferta.setProperty("/areaClienteSel", misma.key);
			this.aplicarAreaCliente(misma);
		}
		this.recalcular();
	}

	/**
	 * Areas que no son retail (p. ej. mayorista, con condiciones de pago y credito propias): el vendedor no las amplia, arma la solicitud para
	 * quien administra los datos maestros. Las retail se amplian en SAP con onAmpliarRetail.
	 * Se copia al portapapeles y, si el manifest trae un correo (config/ampliacionCorreo), se abre el correo ya redactado.
	 */
	public onAmpliarArea(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const cl = this.clienteActual();
		const clave = modelo.getProperty("/nueva") as string;
		if (!cl || !clave) {
			return;
		}
		const oferta = this.modeloOferta();
		const nueva = (modelo.getProperty("/disponibles") as { key: string; text: string }[]).find((a) => a.key === clave);
		const referencia = ((oferta.getProperty("/areasCliente") as { key: string; text: string }[]) ?? []).find((o) => o.key !== "" && o.key === oferta.getProperty("/areaClienteSel"));
		const { asunto, cuerpo } = textoSolicitudAmpliacion({
			cliente: cl.nombre,
			kunnr: cl.kunnr ?? "",
			documento: `${cl.tipoDoc} ${cl.doc}`.trim(),
			areaNueva: nueva?.text ?? clave,
			areaReferencia: referencia?.text,
			vendedor: String(oferta.getProperty("/perfil/vendedor") ?? ""),
			motivo: ""
		});
		const correo = String((this.getOwnerComponent() as UIComponent).getManifestEntry("/sap.ui5/config/ampliacionCorreo") ?? "");
		void navigator.clipboard?.writeText(`${asunto}\n\n${cuerpo}`).catch(() => undefined);
		if (correo) {
			window.open(`mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, "_self");
		}
		this.dialogoClienteActual?.close();
		MessageToast.show(this.i18n().getText(correo ? "ampliarSolicitudCorreo" : "ampliarSolicitudCopiada") as string, { duration: 6000 });
	}

	public onCerrarCliente(): void {
		this.dialogoClienteActual?.close();
	}

	/** Si el repuesto tiene escala por cantidad, el precio unitario se recalcula con la nueva cantidad. */
	private repreciarPorEscala(linea: Linea): void {
		if (linea.bonificacion) {
			return;
		}
		const m = (this.modeloMock().getProperty("/catalogo/repuestos") as Repuesto[]).find((x) => x.material === linea.material);
		if (m?.escala) {
			linea.precio = (this.filaPrecio({ ...(m as Vehiculo & Repuesto), tipo: "repuestos" }, linea.cantidad) as { final: number }).final;
		}
	}

	/** Editar la oferta: cambiar cantidad o quitar lineas (los vehiculos son de a una unidad). */
	public onCambiaCantidadLinea(event: Event): void {
		const linea = (event.getSource() as unknown as Control).getBindingContext("oferta")?.getObject() as Linea | undefined;
		if (!linea) {
			return;
		}
		linea.cantidad = Math.max(1, Number(linea.cantidad) || 1);
		this.repreciarPorEscala(linea);
		linea.total = this.redondear(linea.cantidad * linea.precio);
		this.modeloOferta().setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		void this.repreciarLineasSap();
	}

	public onQuitarLinea(event: Event): void {
		const linea = (event.getSource() as unknown as Button).getBindingContext("oferta")?.getObject() as Linea | undefined;
		if (!linea) {
			return;
		}
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]).filter((l) => l !== linea && !(linea.uid && l.origen === linea.uid));
		oferta.setProperty("/lineas", lineas);
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
	}

	/**
	 * Elegir una linea en la tabla del detalle abre su determinacion de precio, solo la de esa linea (pruebas del 28/10/2026: con 20 lineas o
	 * mas, todas abiertas a la vez no se podian revisar).
	 */
	public onElegirLineaPrecio(event: ListBase$SelectionChangeEvent): void {
		this.mostrarPrecioDe(event.getParameter("listItem")?.getBindingContext("oferta")?.getObject() as Linea | undefined);
	}

	/** Plegar el panel suelta la linea elegida; desplegarlo sin linea elegida muestra como elegir una. */
	public onExpandirPrecio(event: Panel$ExpandEvent): void {
		if (!event.getParameter("expand")) {
			this.mostrarPrecioDe(undefined);
		}
	}

	private mostrarPrecioDe(linea: Linea | undefined): void {
		((this.modeloOferta().getProperty("/lineas") as Linea[]) ?? []).forEach((l) => (l.verCondiciones = l === linea));
		this.recalcular();
	}

	/* ---------- Modalidad por oferta generada (define clase de oferta/pedido y el camino posterior) ---------- */

	/** Cada grupo (= una oferta) lleva su modalidad; por defecto la estandar de su tipo. */
	private aplicarModalidadGrupo(grupo: Grupo): void {
		const oferta = this.modeloOferta();
		const modalidades = oferta.getProperty("/modalidades") as Modalidad[];
		const elegidas = oferta.getProperty("/modalidadesGrupo") as Record<string, string>;
		const tipo = grupo.lineas.some((l) => l.unica) ? "vehiculos" : "repuestos";
		// La modalidad por defecto sigue el canal del perfil del vendedor (canal 10 -> mayorista, 11 -> mostrador/retail); si el perfil no
		// tiene un canal conocido, la de siempre. Antes era siempre mostrador (canal 11) y el documento salia en otro canal que el del perfil.
		const canalPerfil = canalDe(String(oferta.getProperty("/perfil/canal") ?? ""));
		const porDefecto = modalidadPorDefecto(tipo, canalPerfil) ?? (tipo === "vehiculos" ? "veh_retail" : "rep_mostrador");
		const opciones = modalidades.filter((m) => m.tipo === tipo || m.tipo === "ambos");
		// Repuestos con envio ya elegido: el grupo nuevo nace en despacho a cliente, igual que si se eligiera Envio despues.
		const porEntrega =
			tipo === "repuestos" && oferta.getProperty("/entrega") === "envio" && opciones.some((m) => m.key === MODALIDAD_DESPACHO) ? MODALIDAD_DESPACHO : porDefecto;
		let clave = elegidas[grupo.clave] ?? porEntrega;
		if (!opciones.some((m) => m.key === clave)) {
			clave = porDefecto;
		}
		const m = opciones.find((x) => x.key === clave) as Modalidad;
		const porConfirmar = this.i18n().getText("porConfirmar") as string;
		const i18n = this.i18n();
		grupo.modalidad = clave;
		grupo.opciones = opciones;
		grupo.claseOferta = m.claseOferta || porConfirmar;
		grupo.clasePedido = m.clasePedido || porConfirmar;
		grupo.canal = m.canal || "\u2014";
		// El titulo muestra el sector del material; si SAP exige otro sector para la cabecera de la oferta (canal 11 y 14 = 99), se dice.
		const primera = grupo.lineas[0];
		let sectorCabecera = "";
		if (primera) {
			const canalGrupo = canalDe(m.canal);
			// Con el sector PROPIO del material, como al guardar (gruposParaGuardar): en el canal 10 la cabecera lleva el del material (p. ej. 50),
			// no el 99 de mostrador con el que se agrupo la linea. Antes el aviso de area se calculaba con el 99 y bloqueaba el guardado.
			const sectorMaterial = primera.sectorMaterial ?? primera.sector;
			const sectorCab = sectorDeCabecera(canalGrupo, sectorMaterial, primera.orgVentas);
			sectorCabecera = sectorCab;
			const sectorTitulo = canalGrupo && sectorCab === sectorMaterial ? sectorCab : primera.sector;
			const base = `${primera.grupo} · ${i18n.getText("grupoOrg", [primera.orgVentas, sectorTitulo]) as string}`;
			grupo.titulo = canalGrupo && sectorCab !== sectorTitulo ? `${base} · ${i18n.getText("grupoSectorCab", [sectorCab]) as string}` : base;
		}
		// El cliente debe estar dado de alta en el area de ventas (organizacion + canal) de la modalidad
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const canalNum = canalDe(m.canal);
		const area = canalNum ? `${grupo.lineas[0]?.orgVentas}/${canalNum}` : "";
		grupo.areaFalta = !!cliente && !!area && faltaAreaDeVentas(cliente.areas, grupo.lineas[0]?.orgVentas, canalNum);
		// Dado de alta en la organizacion y el canal, pero no en el sector de la cabecera, en el de algun material o en el de un regalo de venta
		// cruzada que se envia: SAP rechaza la oferta.
		const sectoresLineas = sectoresDeLineas(grupo.lineas);
		const sectorFalta = !grupo.areaFalta && !!cliente && !!area ? sectorQueFalta(cliente.areas, grupo.lineas[0]?.orgVentas, canalNum, sectorCabecera, sectoresLineas) : undefined;
		if (grupo.areaFalta) {
			const nombre = (this.modeloMock().getProperty("/canalesArea") as { key: string; text: string }[]).find((x) => x.key === area)?.text ?? area;
			grupo.areaAviso = i18n.getText("areaFalta", [nombre]) as string;
		} else if (sectorFalta) {
			grupo.areaFalta = true;
			grupo.areaAviso = i18n.getText("sectorFalta", [`${area}/${sectorFalta}`]) as string;
		}
		// Condicion de pago, moneda y grupo de clientes del area de ESTE grupo: cambian por canal y sector, no son un dato del cliente.
		const cond = !grupo.areaFalta ? condicionDeArea(cliente?.condicionesAreas, grupo.lineas[0]?.orgVentas ?? "", canalNum, sectorCabecera) : undefined;
		grupo.condicionArea = cond ? (i18n.getText("condicionArea", [[cond.zterm, cond.ztermTexto].filter(Boolean).join(" ") || "—", cond.waers || "—", cond.grupoTexto || cond.grupo || "—"]) as string) : "";
		const monedaOferta = oferta.getProperty("/perfil/moneda") === "USD" ? "USD" : "PEN";
		grupo.condicionAviso = cond?.waers && cond.waers !== monedaOferta ? (i18n.getText("monedaAreaDistinta", [cond.waers, monedaOferta]) as string) : "";
		grupo.nota = m.nota;
	}

	public onCambiaModalidadGrupo(event: Event): void {
		const grupo = (event.getSource() as unknown as Control).getBindingContext("oferta")?.getObject() as Grupo | undefined;
		if (!grupo) {
			return;
		}
		const oferta = this.modeloOferta();
		const modalidades = oferta.getProperty("/modalidades") as Modalidad[];
		const m = modalidades.find((x) => x.key === grupo.modalidad);
		(oferta.getProperty("/modalidadesGrupo") as Record<string, string>)[grupo.clave] = grupo.modalidad ?? "";
		if (m) {
			oferta.setProperty("/entrega", m.expedicion);
		}
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();		// La modalidad define el canal del documento y con el el precio: se vuelve a pedir a SAP.
		void this.repreciarLineasSap();
	}



	/* ---------- Carga de detalle desde Excel (repuestos, ropa y accesorios) ---------- */

	private cargarXlsx(): Promise<XlsxLib> {
		const w = window as unknown as { XLSX?: XlsxLib };
		if (w.XLSX) {
			return Promise.resolve(w.XLSX);
		}
		return new Promise((resolve, reject) => {
			const s = document.createElement("script");
			s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
			s.onload = () => resolve((window as unknown as { XLSX: XlsxLib }).XLSX);
			s.onerror = () => reject(new Error("xlsx"));
			document.head.appendChild(s);
		});
	}

	private modeloExcel(): JSONModel {
		return this.dialogoExcel?.getModel("excel") as JSONModel;
	}

	private excelVacio(): Record<string, unknown> {
		return { hayArchivo: false, error: "", filas: [], lineas: [], modo: "agregar", nLineas: 0, hayValidas: false, txtAgregar: this.i18n().getText("excelAgregarNada") as string };
	}

	public async onCargarExcel(): Promise<void> {
		if (!this.dialogoExcel) {
			this.dialogoExcel = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.CargarExcel",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoExcel);
			this.dialogoExcel.setModel(new JSONModel(), "excel");
		}
		this.modeloExcel().setData(this.excelVacio());
		(this.byId("excelArchivo") as FileUploader | undefined)?.clear();
		this.dialogoExcel.open();
	}

	public onCerrarExcel(): void {
		this.dialogoExcel?.close();
	}

	public async onDescargarPlantilla(): Promise<void> {
		try {
			const X = await this.cargarXlsx();
			// Mismas columnas que la carga actual de ZSDP009 (lectura por posicion; la fila 1 es el encabezado).
			const hoja = X.utils.aoa_to_sheet([
				["Material", "Tipo", "Cantidad", "Color", "Condicion", "Modelo", "Marca", "Anio"],
				["LUB-1040", "R", 2, "", "", "", "", ""],
				["LUB-2075", "R", 1, "", "", "", "", ""],
				["VEH-LKP200", "V", 1, "Negro Mate", "CBU", "KPT 200", "Lifan", 2026]
			]);
			const libro = X.utils.book_new();
			X.utils.book_append_sheet(libro, hoja, "Detalle");
			X.writeFile(libro, "plantilla_cotizador.xlsx");
		} catch {
			this.modeloExcel().setProperty("/error", this.i18n().getText("excelLibError"));
		}
	}

	public async onExcelElegido(event: Event): Promise<void> {
		const archivos = (event as unknown as { getParameter(n: string): FileList | undefined }).getParameter("files");
		const archivo = archivos?.[0];
		const modelo = this.modeloExcel();
		const modo = (modelo.getProperty("/modo") as string) ?? "agregar";
		modelo.setData({ ...this.excelVacio(), modo });
		if (!archivo) {
			return;
		}
		// El selector no filtra por tipo (el filtro por extension hace lento el dialogo de Windows): se valida aqui.
		if (!/\.(xlsx|xls|csv)$/i.test(archivo.name)) {
			modelo.setProperty("/error", this.i18n().getText("excelFormato"));
			return;
		}
		try {
			const X = await this.cargarXlsx();
			const datos = await archivo.arrayBuffer();
			const libro = X.read(datos, { type: "array" });
			const filas = X.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, blankrows: false }) as unknown[][];
			this.validarExcel(filas);
		} catch (e) {
			const clave = (e as Error).message === "xlsx" ? "excelLibError" : "excelLeerError";
			modelo.setProperty("/error", this.i18n().getText(clave));
		}
	}

	/**
	 * Valida contra el catalogo (mock; luego sera el servicio). Columnas como en ZSDP009: A Material, B Tipo (V = vehiculo),
	 * C Cantidad, D Color, E Condicion, F Modelo, G Marca (no se usa), H Anio. La fila 1 es el encabezado.
	 * Mejora sobre ZSDP009: aqui tambien se avisa de cantidad invalida, repetidos, tipo distinto, atributos que no coinciden y stock.
	 */
	private validarExcel(filas: unknown[][]): void {
		const i18n = this.i18n();
		const mock = this.modeloMock();
		const vehiculos = mock.getProperty("/catalogo/vehiculos") as Vehiculo[];
		const repuestos = mock.getProperty("/catalogo/repuestos") as Repuesto[];
		const texto = (v: unknown): string => String(v ?? "").trim();
		const igual = (a: string, b: string | number): boolean => a === "" || a.toLowerCase() === String(b).toLowerCase();
		type Fila = { fila: number; material: string; denominacion: string; cantidad: number; estado: string; mensaje: string; mat?: string; esVeh?: boolean };
		const resultado: Fila[] = [];
		filas.slice(1).forEach((r, i) => {
			const material = texto(r[0]);
			if (!material) {
				return;
			}
			const fila = i + 2;
			const cantidad = Number(r[2]);
			const veh = vehiculos.find((m) => m.material.toLowerCase() === material.toLowerCase());
			const rep = repuestos.find((m) => m.material.toLowerCase() === material.toLowerCase());
			const item = veh ?? rep;
			if (!item) {
				resultado.push({ fila, material, denominacion: "", cantidad, estado: "Error", mensaje: i18n.getText("excelNoExiste", [material, fila]) as string });
				return;
			}
			if (!Number.isInteger(cantidad) || cantidad <= 0) {
				resultado.push({ fila, material, denominacion: item.denominacion, cantidad, estado: "Error", mensaje: i18n.getText("excelCantidadInvalida") as string });
				return;
			}
			const esVeh = !!veh;
			let estado = "Success";
			let mensaje = i18n.getText("excelOk") as string;
			const declaraVeh = texto(r[1]).toUpperCase() === "V";
			if (declaraVeh !== esVeh) {
				estado = "Warning";
				mensaje = i18n.getText("excelTipoDifiere", [i18n.getText(esVeh ? "excelVehiculo" : "excelRepuesto")]) as string;
			} else if (veh && !(igual(texto(r[3]), veh.color) && igual(texto(r[4]), veh.condicion) && igual(texto(r[7]), veh.anio))) {
				estado = "Warning";
				mensaje = i18n.getText("excelAtributosDifieren", [`${veh.color} \u00b7 ${veh.anio} \u00b7 ${veh.condicion}`]) as string;
			}
			const previa = esVeh ? undefined : resultado.find((x) => x.mat === item.material && x.estado !== "Error");
			if (previa) {
				previa.cantidad += cantidad;
				resultado.push({ fila, material, denominacion: item.denominacion, cantidad, estado: "Warning", mensaje: i18n.getText("excelRepetido") as string });
				return;
			}
			resultado.push({ fila, material, denominacion: item.denominacion, cantidad, estado, mensaje, mat: item.material, esVeh });
		});
		// Stock: se avisa, no se bloquea (se puede solicitar traslado)
		resultado.forEach((r) => {
			if (!r.mat || r.estado === "Error") {
				return;
			}
			const veh = vehiculos.find((m) => m.material === r.mat);
			const rep = repuestos.find((m) => m.material === r.mat);
			const disponible = veh ? veh.stockMio : (rep?.disponible ?? 0);
			if (r.cantidad > disponible) {
				r.estado = "Warning";
				r.mensaje = i18n.getText("excelSupera", [disponible]) as string;
			}
		});
		const errores = resultado.filter((r) => r.estado === "Error").length;
		const adv = resultado.filter((r) => r.estado === "Warning").length;
		const validas = resultado.filter((r) => r.estado === "Success").length;
		const lineas = resultado.filter((r) => r.mat).map((r) => ({ material: r.mat as string, cantidad: r.cantidad, esVeh: !!r.esVeh }));
		const modelo = this.modeloExcel();
		modelo.setData({
			hayArchivo: true,
			error: "",
			filas: resultado.map((r) => ({ ...r })),
			lineas,
			modo: (modelo.getProperty("/modo") as string) ?? "agregar",
			nLineas: lineas.reduce((acc, l) => acc + (l.esVeh ? l.cantidad : 1), 0),
			hayValidas: lineas.length > 0,
			txtValidas: i18n.getText("excelValidas", [validas]),
			txtAdvertencias: i18n.getText("excelAdvertencias", [adv]),
			txtErrores: i18n.getText("excelErrores", [errores])
		});
		this.textoAgregarExcel();
	}

	private textoAgregarExcel(): void {
		const modelo = this.modeloExcel();
		const n = modelo.getProperty("/nLineas") as number;
		const reemplaza = modelo.getProperty("/modo") === "reemplazar";
		const clave = n === 0 ? "excelAgregarNada" : reemplaza ? "excelReemplazar" : "excelAgregar";
		modelo.setProperty("/txtAgregar", this.i18n().getText(clave, [n]));
	}

	public onCambiaModoExcel(): void {
		this.textoAgregarExcel();
	}

	public onAgregarExcel(): void {
		const modelo = this.modeloExcel();
		const lineas = (modelo.getProperty("/lineas") as { material: string; cantidad: number; esVeh: boolean }[]) ?? [];
		const mock = this.modeloMock();
		const vehiculos = mock.getProperty("/catalogo/vehiculos") as Vehiculo[];
		const repuestos = mock.getProperty("/catalogo/repuestos") as Repuesto[];
		const oferta = this.modeloOferta();
		// Como ZSDP009: "reemplazar" vacia el detalle antes de cargar; "agregar" suma a lo que ya hay.
		if (modelo.getProperty("/modo") === "reemplazar") {
			oferta.setProperty("/lineas", []);
		}
		let total = 0;
		lineas.forEach((l) => {
			if (l.esVeh) {
				const m = vehiculos.find((x) => x.material === l.material);
				if (!m) {
					return;
				}
				const base = { ...(m as Vehiculo & Repuesto), tipo: "vehiculos", detalle: `${m.color} \u00b7 ${m.anio} \u00b7 ${m.condicion}` };
				const final = (this.filaPrecio(base, 1) as { final: number }).final;
				for (let k = 0; k < l.cantidad; k++) {
					this.agregarLinea(base, 1, final);
					total++;
				}
			} else {
				const m = repuestos.find((x) => x.material === l.material);
				if (m) {
					const base = { ...(m as Vehiculo & Repuesto), tipo: "repuestos" };
					this.agregarLinea(base, l.cantidad, (this.filaPrecio(base, l.cantidad) as { final: number }).final);
					total++;
				}
			}
		});
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		this.dialogoExcel?.close();
		MessageToast.show(this.i18n().getText("excelAgregadas", [total]) as string);
	}

	public onCambiaCantidad(): void {
		this.calcularVista();
	}

	/**
	 * Vista previa (Story 1.5): lista -> condicion -> promocion -> final, antes de agregar, en USD y PEN.
	 * Si no aplica condicion o promocion, lo dice en vez de omitir la linea.
	 * El redondeo (Story 1.9) no se aplica todavia: la regla la define Socopur.
	 */
	private calcularVista(): void {
		const oferta = this.modeloOferta();
		const m = oferta.getProperty("/materialElegido") as (Vehiculo & Repuesto & { tipo: string }) | null;
		if (!m) {
			return;
		}
		const i18n = this.i18n();
		const cantidad = Math.max(1, Number(oferta.getProperty("/vista/cantidad")) || 1);
		const listaUsd = m.precioUsd;
		const condicionUsd = this.redondear(listaUsd * (m.condicionPct / 100));
		const promoUsd = m.promocion?.monto ?? 0;
		const finalUsd = this.redondear(listaUsd - condicionUsd - promoUsd);
		// Con precio real de SAP, en soles se usa el que calculo SAP (no el tipo de cambio del perfil).
		const final = m.origen === "sap" && m.precioPenSap !== undefined && oferta.getProperty("/perfil/moneda") !== "USD" ? m.precioPenSap : this.aMoneda(finalUsd);
		// El precio de lista de vehiculos ya incluye el ISC; con cliente SAP separa neto + ISC (+ IGV, 0 en las pruebas de DEV).
		const hayCliente = !!oferta.getProperty("/cliente");
		const iscPct = m.iscPct ?? 0;
		const netoUsd = this.redondear(finalUsd / (1 + iscPct / 100));
		const iscUsd = this.redondear(finalUsd - netoUsd);

		oferta.setProperty("/vista", {
			cantidad,
			conImpuestos: hayCliente,
			sinClienteVisible: !hayCliente,
			hayIsc: hayCliente && iscPct > 0,
			netoTxt: this.dual(netoUsd),
			iscEtq: `${i18n.getText("isc")} (${iscPct}%)`,
			iscTxt: this.dual(iscUsd),
			igvTxt: this.dual(0),
			maxCantidad: m.tipo === "vehiculos" ? 1 : 9999,
			final,
			finalUsd,
			listaTxt: this.dual(listaUsd),
			condicionEtq: m.condicionPct
				? `${i18n.getText("condicionPrecio")} (−${m.condicionPct}%)`
				: (i18n.getText("condicionPrecio") as string),
			condicionTxt: m.condicionPct ? `− ${this.dual(condicionUsd)}` : (i18n.getText("sinCondicion") as string),
			promoEtq: m.promocion ? `${i18n.getText("promocion")} — ${m.promocion.nombre}` : (i18n.getText("promocion") as string),
			promoTxt: m.promocion ? `− ${this.dual(promoUsd)}` : (i18n.getText("sinPromocion") as string),
			finalDualTxt: this.dual(finalUsd),
			finalTxt: this.formatMonto(final),
			totalTxt: this.formatMonto(this.redondear(final * cantidad))
		});
	}

	/** Agrega la linea al carrito; el grupo (org. ventas + sector) sale del material. */
	public onAgregar(): void {
		const oferta = this.modeloOferta();
		const m = oferta.getProperty("/materialElegido") as (Vehiculo & Repuesto & { tipo: string; detalle: string }) | null;
		const vista = oferta.getProperty("/vista") as { cantidad: number; final: number } | undefined;
		if (!m || !vista) {
			return;
		}
		this.agregarLinea(m, vista.cantidad, vista.final);
		oferta.setProperty("/materialElegido", null);
		oferta.setProperty("/vista", {});
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
	}

	/* ---------- Stock por almacen, transito y solicitud de traslado ---------- */

	public formatFecha(iso: string): string {
		if (!iso) {
			return "";
		}
		const [y, m, d] = iso.split("-");
		return `${d}/${m}/${y}`;
	}

	/** Se abre desde el material elegido (vehiculo) o desde una fila de la lista de materiales elegidos. */
	public async onVerStock(event: Event): Promise<void> {
		const ctx = (event.getSource() as unknown as Control).getBindingContext("oferta");
		const material = (ctx ? ctx.getObject() : this.modeloOferta().getProperty("/materialElegido")) as
			| (Vehiculo & Repuesto & { tipo: string })
			| null;
		if (material) {
			await this.abrirStock(material);
		}
	}

	/* ---------- Detalle del material: lista de precios, descuentos, escalas, regalos y stock ---------- */

	/** Boton "Ver detalle" de una fila de la lista de materiales elegidos. */
	public async onVerDetalle(event: Event): Promise<void> {
		const fila = (event.getSource() as unknown as Control).getBindingContext("oferta")?.getObject() as (Vehiculo & Repuesto & { tipo: string }) | undefined;
		if (fila) {
			await this.abrirDetalle(fila);
		}
	}

	private async abrirDetalle(material: Vehiculo & Repuesto & { tipo: string }): Promise<void> {
		if (!this.dialogoDetalle) {
			this.dialogoDetalle = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.DetalleMaterial",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoDetalle);
			this.dialogoDetalle.setModel(new JSONModel(), "detalle");
		}
		this.detalleMaterial = material;
		const cantidad = Math.max(1, Number((material as { cantidad?: number }).cantidad) || 1);
		(this.dialogoDetalle.getModel("detalle") as JSONModel).setData(this.datosDetalle(material, cantidad));
		this.dialogoDetalle.open();
		this.tramosDetalle = [];
		void this.cargarRegalosDetalle(material, cantidad);
		void this.cargarEscalasDetalle(material, cantidad);
	}

	/** Todo lo que se muestra sale de SAP: precios de lista (Mayorista/Retail), precio del cliente, condiciones de la simulacion y stock. */
	private datosDetalle(m: Vehiculo & Repuesto & { tipo: string }, cantidad: number): Record<string, unknown> {
		const i18n = this.i18n();
		const extra = m as Vehiculo & Repuesto & { tipo: string; precioMay?: string; precioRet?: string };
		const fila = this.filaPrecio(m, cantidad) as { final: number; totalTxt: string };
		const moneda = this.modeloOferta().getProperty("/perfil/moneda") === "USD" ? "US$" : "S/";
		const tuPrecio = m.origen === "sap" && m.precioPenSap !== undefined ? `${moneda} ${this.formatMonto(fila.final)}` : "—";
		const stock = (this.datosStock(m).filas as { ubicacion: string; esMio: boolean; disponible: number }[]) ?? [];
		return {
			material: m.material,
			denominacion: m.denominacion,
			precioRet: extra.precioRet || "—",
			precioMay: extra.precioMay || "—",
			esRepuesto: m.tipo === "repuestos",
			maxCantidad: m.tipo === "vehiculos" ? 1 : 9999,
			// Mayorista y Retail son precios de lista de repuestos; el vehiculo tiene su precio por variante y cliente.
			precios: [
				...(m.tipo === "repuestos"
					? [
							{ nombre: i18n.getText("precioMayorista") as string, importe: extra.precioMay || "—", resaltado: false },
							{ nombre: i18n.getText("precioRetail") as string, importe: extra.precioRet || "—", resaltado: false }
						]
					: []),
				{ nombre: i18n.getText("precioTuPrecio") as string, importe: tuPrecio, resaltado: true }
			],
			descuentos: descuentosAplicados(m.condiciones ?? []),
			// Las escalas por cantidad las llena cargarEscalasDetalle (entidad Escala) y los articulos gratis cargarRegalosDetalle (entidad
			// Regalo): las dos con lo que devuelve SAP, sin inventar datos.
			escalas: [],
			regalos: [],
			avisoRegalo: "",
			proximoRegalo: "",
			stockRegalo: "",
			cargandoRegalos: false,
			proximoTramo: "",
			cargandoEscalas: false,
			stock,
			cantidad,
			totalTxt: fila.totalTxt
		};
	}

	/** Al cambiar la cantidad SAP vuelve a calcular el precio y las condiciones (las escalas dependen de la cantidad). */
	public async onDetalleCantidad(): Promise<void> {
		const modelo = this.dialogoDetalle?.getModel("detalle") as JSONModel | undefined;
		const material = this.detalleMaterial;
		if (!modelo || !material) {
			return;
		}
		const cantidad = Math.max(1, Number(modelo.getProperty("/cantidad")) || 1);
		if (material.origen === "sap" && !(await this.completarPreciosSap([material], cantidad))) {
			return;
		}
		modelo.setData(this.datosDetalle(material, cantidad));
		this.pintarEscalasDetalle(cantidad);
		await this.cargarRegalosDetalle(material, cantidad);
	}

	public onDetalleAgregar(): void {
		const modelo = this.dialogoDetalle?.getModel("detalle") as JSONModel | undefined;
		const material = this.detalleMaterial;
		if (!modelo || !material) {
			return;
		}
		const cantidad = Math.max(1, Number(modelo.getProperty("/cantidad")) || 1);
		const oferta = this.modeloOferta();
		this.agregarLinea(material, cantidad, (this.filaPrecio(material, cantidad) as { final: number }).final);
		// Sale de la lista de elegidos para no agregarlo dos veces con "Agregar todos".
		const restantes = ((oferta.getProperty("/elegidosLista") as { material: string }[]) ?? []).filter((f) => f.material !== material.material);
		oferta.setProperty("/elegidosLista", restantes);
		oferta.setProperty("/guardado", { visible: false, texto: "" });
		this.recalcular();
		void this.repreciarLineasSap();
		this.onDetalleCerrar();
	}

	public onDetalleCerrar(): void {
		this.dialogoDetalle?.close();
	}

	/** Se abre desde una fila de resultados del buscador, sin haber elegido el material todavia. */
	public async onVerStockFila(event: Event): Promise<void> {
		const ctx = (event.getSource() as unknown as Control).getBindingContext("busqueda");
		const objeto = ctx?.getObject() as (Vehiculo & Repuesto) | undefined;
		if (objeto) {
			await this.abrirStock({ ...objeto, tipo: objeto.stockMio !== undefined ? "vehiculos" : "repuestos" });
		}
	}

	private async abrirStock(material: Vehiculo & Repuesto & { tipo: string }): Promise<void> {
		if (!this.dialogoStock) {
			this.dialogoStock = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.StockAlmacen",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoStock);
			this.dialogoStock.setModel(new JSONModel(), "stock");
		}
		(this.dialogoStock.getModel("stock") as JSONModel).setData(this.datosStock(material));
		this.dialogoStock.open();
		void this.cargarStockEnCentros(material);
	}

	/**
	 * Con SAP real, el stock de repuestos se completa con los demas centros de la organizacion del vendedor, con su disponible (ATP). Es solo
	 * para ver donde hay; si la lectura falla queda la fila del almacen propio que ya se mostraba.
	 */
	private async cargarStockEnCentros(m: Vehiculo & Repuesto & { tipo: string }): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		const modelo = this.dialogoStock?.getModel("stock") as JSONModel | undefined;
		if (!odata || !modelo || !this.usarOData() || m.tipo !== "repuestos" || !m.orgVentas) {
			return;
		}
		const canal = canalDe(String(this.modeloOferta().getProperty("/perfil/busqueda/canal") ?? "11"));
		const vtweg = this.canalDeDocumento(m.orgVentas, m.sectorOferta, "repuestos") || canal;
		const mio = ((modelo.getProperty("/filas") as FilaStock[]) ?? []).find((f) => f.esMio);
		modelo.setProperty("/cargando", true);
		try {
			const stock = await stockEnCentros(odata, m.orgVentas, vtweg, m.material);
			if (modelo.getProperty("/material") !== m) {
				return; // mientras tanto se abrio el stock de otro material
			}
			const filas = filasDeStockEnCentros(stock, this.almacenPropio(mio?.fisico ?? 0, mio?.disponible ?? 0), (w) => this.nombreCentro(w)).map((f) => ({
				...f,
				comprometido: f.fisico - f.disponible
			}));
			modelo.setProperty("/filas", filas);
			modelo.setProperty("/totalDisponible", filas.reduce((acc, f) => acc + f.disponible, 0));
			modelo.setProperty("/alerta", filas[0].disponible > 0 ? "" : (this.i18n().getText("sinStockMio") as string));
		} catch {
			// informativo: queda la fila del almacen propio
		} finally {
			modelo.setProperty("/cargando", false);
		}
	}

	/** Centro y almacen del perfil del vendedor, con el stock que ya se conoce de ese almacen. */
	private almacenPropio(fisico: number, disponible: number): { werks: string; lgort: string; fisico: number; disponible: number } {
		return { werks: String(this.modeloOferta().getProperty("/perfil/centro") ?? ""), lgort: this.almacenDelPerfil(), fisico, disponible };
	}

	private nombreCentro(werks: string): string {
		return ((this.modeloMock().getProperty("/opciones/centros") as Record<string, string>) ?? {})[werks] ?? "";
	}

	public onCerrarStock(): void {
		this.dialogoStock?.close();
	}

	/**
	 * Semantica real de ZSDP009 (lectura DS4/130): fisico = MARD-LABST; disponible = chequeo ATP de SAP;
	 * comprometido = fisico - disponible. No distingue "reservado". En vehiculos comprometido es siempre 0.
	 * Si el ATP cuenta el transito depende de su configuracion: por confirmar.
	 */
	private datosStock(m: Vehiculo & Repuesto & { tipo: string }): Record<string, unknown> {
		const mock = this.modeloMock();
		const i18n = this.i18n();
		const guardadas = mock.getProperty(`/stock/${m.material}`) as FilaStock[] | undefined;
		const base: FilaStock[] =
			guardadas ??
			(m.tipo === "vehiculos"
				? [
						{ ubicacion: "1101 · Pucallpa-Centenario · 0004 TDA CENTEN", esMio: true, fisico: m.stockMio, disponible: m.stockMio, transito: 0 },
						{ ubicacion: "Otros centros", esMio: false, fisico: m.stockOtros, disponible: m.stockOtros, transito: 0 }
					]
				: this.usarOData()
					? // Con SAP real, el centro y almacen del perfil (antes decia siempre 1101 Pucallpa, tambien a un vendedor de Lima).
						filasDeStockEnCentros([], this.almacenPropio(m.total, m.disponible), (w) => this.nombreCentro(w))
					: [
							{ ubicacion: "1101 · Pucallpa-Centenario · 0001 CENTENARIO", esMio: true, fisico: m.total, disponible: m.disponible, transito: 0 }
						]);
		const filas = base.map((f) => ({ ...f, comprometido: f.fisico - f.disponible }));
		const mio = filas.find((f) => f.esMio);
		return {
			titulo: i18n.getText("stockDe", [`${m.material} · ${m.denominacion}`]) as string,
			material: m,
			// La solicitud de traslado todavia es simulada (numero inventado): con SAP real no se ofrece.
			puedeSolicitar: !this.usarOData(),
			cargando: false,
			filas,
			transito: (mock.getProperty(`/transito/${m.material}`) as unknown[]) ?? [],
			totalDisponible: filas.reduce((acc, f) => acc + f.disponible, 0),
			alerta: !mio || mio.disponible <= 0 ? (i18n.getText("sinStockMio") as string) : ""
		};
	}

	public async onSolicitarTraslado(event: Event): Promise<void> {
		const ctx = (event.getSource() as unknown as Control).getBindingContext("stock");
		const fila = ctx?.getObject() as (FilaStock & { comprometido: number }) | undefined;
		const stock = this.dialogoStock?.getModel("stock") as JSONModel;
		const material = stock.getProperty("/material") as Vehiculo & Repuesto;
		const filas = stock.getProperty("/filas") as FilaStock[];
		const mio = filas.find((f) => f.esMio);
		if (!fila) {
			return;
		}
		if (!this.dialogoSolicitud) {
			this.dialogoSolicitud = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.SolicitudTraslado",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoSolicitud);
			this.dialogoSolicitud.setModel(new JSONModel(), "solped");
		}
		(this.dialogoSolicitud.getModel("solped") as JSONModel).setData({
			material: `${material.material} · ${material.denominacion}`,
			denominacion: material.denominacion,
			origen: fila.ubicacion,
			destino: mio?.ubicacion ?? "",
			cantidad: 1,
			max: Math.max(1, fila.disponible),
			anticipo: false,
			comentario: "",
			creada: false,
			mensaje: ""
		});
		this.dialogoSolicitud.open();
	}

	/** SIMULADO: el flujo real y su aprobacion se definen con Socopur. */
	public onCrearSolicitud(): void {
		const modelo = this.dialogoSolicitud?.getModel("solped") as JSONModel;
		const oferta = this.modeloOferta();
		const previas = (oferta.getProperty("/solpeds") as unknown[]) ?? [];
		const numero = `SP-${String(4521 + previas.length).padStart(6, "0")}`;
		const datos = modelo.getData() as { denominacion: string; origen: string; destino: string; cantidad: number };
		previas.push({
			numero,
			denominacion: datos.denominacion,
			origen: datos.origen,
			destino: datos.destino,
			cantidad: datos.cantidad,
			estado: this.i18n().getText("solEstadoAprob") as string
		});
		oferta.setProperty("/solpeds", previas);
		modelo.setProperty("/creada", true);
		modelo.setProperty("/mensaje", `${this.i18n().getText("solCreada", [numero])} (${this.i18n().getText("simulacion")})`);
	}

	public onCerrarSolicitud(): void {
		this.dialogoSolicitud?.close();
	}

	/* ---------- VIN: el sistema lo propone y se bloquea al crear el pedido (decision del 29/09) ---------- */

	private esVehiculo(linea: Linea): boolean {
		return !linea.bonificacion && linea.orgVentas.endsWith("01");
	}

	public formatHora(iso: string): string {
		if (!iso) {
			return "";
		}
		const d = new Date(iso);
		return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	}

	private fechaHora(iso: string): string {
		const d = new Date(iso);
		const dd = String(d.getDate()).padStart(2, "0");
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		return `${dd}/${mm}/${d.getFullYear()} ${this.formatHora(iso)}`;
	}

	/** Solo se ofrecen VINs del centro de la oferta (un VIN de otro centro fallaba recien en la entrega). */
	private opcionesVin(material: string): { key: string; text: string; enabled: boolean }[] {
		const i18n = this.i18n();
		const todos = (this.modeloMock().getProperty(`/vins/${material}`) as Vin[]) ?? [];
		return todos
			.filter((v) => v.ubic.startsWith("1101"))
			.sort((a, b) => a.ingreso.localeCompare(b.ingreso))
			.map((v) =>
				v.estado === "Disponible"
					? { key: v.vin, text: `${v.vin} · ${i18n.getText("vinIngreso", [this.formatFecha(v.ingreso)])}`, enabled: true }
					: {
							key: v.vin,
							text: `${v.vin} · ${i18n.getText("vinReservadoPor", [v.reservadoPor ?? "", this.formatHora(v.hasta ?? "")])}`,
							enabled: false
						}
			);
	}

	/** Propone para cada unidad el VIN disponible mas antiguo que no este ya elegido en otra fila. */
	private armarFilasVin(vehiculos: Linea[]): FilaVin[] {
		const usados = new Set<string>();
		return vehiculos.flatMap((l) =>
			Array.from({ length: Math.max(1, l.cantidad) }, () => {
				const opciones = this.opcionesVin(l.material);
				const propuesto = opciones.find((o) => o.enabled && !usados.has(o.key));
				if (propuesto) {
					usados.add(propuesto.key);
				}
				return { material: l.material, denominacion: l.denominacion, detalle: l.detalle, opciones, vin: propuesto?.key ?? "" };
			})
		);
	}

	/** Reglas de liberacion (propuesta pendiente de confirmar con Socopur; luego saldran de una tabla de configuracion Y). */
	private evaluarLiberacion(o: OfertaGuardada): Liberacion {
		const i18n = this.i18n();
		const oferta = this.modeloOferta();
		const clase = o.clasePedido ?? "";
		if (!/^Z\d{3}$/.test(clase)) {
			return { estado: "Error", texto: i18n.getText("libSinClase") as string, automatica: false, bloquea: true };
		}
		if (o.areaFalta) {
			return { estado: "Error", texto: i18n.getText("libSinArea") as string, automatica: false, bloquea: true };
		}
		if (["Z316", "Z362", "Z363"].includes(clase)) {
			return { estado: "Warning", texto: i18n.getText("libSinCargo") as string, automatica: false, bloquea: false };
		}
		if (oferta.getProperty("/perfil/formaPago") === "C000") {
			return { estado: "Success", texto: i18n.getText("libContado") as string, automatica: true, bloquea: false };
		}
		// Matriz del 09/10/2026: el credito Retail (Z311/Z116) siempre queda con Z1 de facturacion en la Bandeja de Credito.
		if (["Z311", "Z116"].includes(clase)) {
			return { estado: "Warning", texto: i18n.getText("libCreditoRetail") as string, automatica: false, bloquea: false };
		}
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		if (!cliente || cliente.estadoState === "Error") {
			return { estado: "Warning", texto: i18n.getText("libCreditoBloq") as string, automatica: false, bloquea: false };
		}
		if ((cliente.estadoCuenta?.vencido ?? 0) > 0) {
			return { estado: "Warning", texto: i18n.getText("libCreditoVencido") as string, automatica: false, bloquea: false };
		}
		const linea = cliente.lineaCredito ?? 0;
		if ((o.total ?? 0) > linea) {
			return { estado: "Warning", texto: i18n.getText("libCreditoExcede", [this.formatMonto(linea)]) as string, automatica: false, bloquea: false };
		}
		return { estado: "Success", texto: i18n.getText("libCreditoOk") as string, automatica: true, bloquea: false };
	}

	/** Paso "Validar la oferta" (equivale a VA23) antes de crear el pedido. */
	public async onCopiarPedido(): Promise<void> {
		if (!this.dialogoValidar) {
			this.dialogoValidar = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.ValidarPedido",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoValidar);
			this.dialogoValidar.setModel(new JSONModel(), "validar");
		}
		const oferta = this.modeloOferta();
		const guardadas = (oferta.getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [];
		const modalidades = oferta.getProperty("/modalidades") as Modalidad[];
		const formas = oferta.getProperty("/formasPago") as { key: string; text: string }[];
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const filas = guardadas.map((o) => {
			const lib = this.evaluarLiberacion(o);
			return {
				numero: o.numero,
				titulo: o.titulo,
				modalidadTxt: modalidades.find((m) => m.key === o.modalidad)?.texto ?? "",
				clasePedido: /^Z\d{3}$/.test(o.clasePedido ?? "") ? o.clasePedido : "\u2014",
				totalTxt: this.formatMonto(o.total ?? 0),
				liberacion: lib.texto,
				estado: lib.estado,
				bloquea: lib.bloquea
			};
		});
		(this.dialogoValidar.getModel("validar") as JSONModel).setData({
			cliente: cliente?.nombre ?? "",
			formaPago: formas.find((f) => f.key === oferta.getProperty("/perfil/formaPago"))?.text ?? "",
			entrega: this.i18n().getText(oferta.getProperty("/entrega") === "envio" ? "entregaEnvio" : "entregaRecojo") as string,
			filas,
			hayBloqueo: filas.some((f) => f.bloquea)
		});
		this.dialogoValidar.open();
	}

	public onCerrarValidar(): void {
		this.dialogoValidar?.close();
	}

	public async onContinuarPedido(): Promise<void> {
		this.dialogoValidar?.close();
		await this.continuarConVin();
	}

	private async continuarConVin(): Promise<void> {
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		const vehiculos = lineas.filter((l) => this.esVehiculo(l));
		// Ofertas guardadas en SAP (con ?odata=1): no hay dialogo, SAP asigna el VIN (asignarVin) al crear el pedido. Al guardar, las lineas
		// se vuelven a leer del documento SAP y ya no traen la variante, por eso se decide por la oferta guardada y no por la linea.
		const guardadas = (oferta.getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [];
		const guardadasEnSap = this.usarOData() && guardadas.length > 0 && guardadas.every((o) => !!o.cotizId && !!o.grupoNo);
		if (guardadasEnSap) {
			// Ofertas de SAP: el vendedor elige el VIN entre los libres de SAP (el mas antiguo ya viene marcado).
			const filasSap = await this.armarFilasVinSap(guardadas);
			if (filasSap.length > 0) {
				await this.abrirDialogoVin(filasSap, true);
				return;
			}
		}
		if (!vehiculos.length || guardadasEnSap) {
			this.crearPedidos([]);
			return;
		}
		if (!this.dialogoVin) {
			this.dialogoVin = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.AsignarVin",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoVin);
			this.dialogoVin.setModel(new JSONModel(), "asignar");
		}
		const horas = this.modeloMock().getProperty("/perfil/bloqueoHoras") as number;
		const filas = this.armarFilasVin(vehiculos);
		(this.dialogoVin.getModel("asignar") as JSONModel).setData({
			filas,
			aviso: "",
			avisoTipo: "Warning",
			valido: false,
			bloqueoNota: this.i18n().getText("vinBloqueoNota", [horas]) as string
		});
		this.validarVin();
		this.dialogoVin.open();
	}

	private async abrirDialogoVin(filas: FilaVin[], sap: boolean): Promise<void> {
		if (!this.dialogoVin) {
			this.dialogoVin = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.AsignarVin",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoVin);
			this.dialogoVin.setModel(new JSONModel(), "asignar");
		}
		const horas = this.modeloMock().getProperty("/perfil/bloqueoHoras") as number;
		(this.dialogoVin.getModel("asignar") as JSONModel).setData({
			filas,
			sap,
			aviso: "",
			avisoTipo: "Warning",
			valido: false,
			bloqueoNota: this.i18n().getText("vinBloqueoNota", [horas]) as string
		});
		this.validarVin();
		this.dialogoVin.open();
	}

	/**
	 * Reserva en SAP el VIN de cada vehiculo del grupo sobre la OFERTA, antes de crear el pedido (SAP no graba el pedido de un vehiculo sin
	 * VIN). Las posiciones que ya tienen VIN se dejan como estan. Devuelve "material: motivo" de las que no se pudieron reservar.
	 */
	private async reservarVinsDelGrupo(odata: ODataModel, cotizId: string, grupoNo: string, elegidos: Record<string, string>, usuario: string): Promise<string[]> {
		let items: VinAsignado[];
		try {
			items = await leerVinsGrupo(odata, cotizId, grupoNo);
		} catch (error) {
			return [this.motivoDeError(error)];
		}
		const errores: string[] = [];
		for (const i of items) {
			if (i.vhcle || i.vin) {
				continue;
			}
			try {
				await asignarVinItem(odata, cotizId, i.posnr, elegidos[i.posnr] || undefined, usuario);
			} catch (error) {
				errores.push(`${i.material}: ${this.motivoDeError(error)}`);
			}
		}
		return errores;
	}

	/**
	 * Una fila por vehiculo de las ofertas guardadas en SAP, con los VIN libres de SAP (entidad Vehiculo) del mas antiguo al mas nuevo.
	 * El mas antiguo no usado en otra fila viene marcado. Si un vehiculo no se puede resolver (cantidad mayor a 1, error de lectura) se
	 * devuelve vacio y el pedido sigue con la asignacion automatica de SAP.
	 */
	private async armarFilasVinSap(guardadas: OfertaGuardada[]): Promise<FilaVin[]> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const i18n = this.i18n();
		const usados = new Set<string>();
		const filas: FilaVin[] = [];
		const vista = this.getView();
		vista?.setBusy(true);
		try {
			for (const o of guardadas) {
				const items = await leerVinsGrupo(odata, o.cotizId as string, o.grupoNo as string);
				for (const item of items) {
					const lineaPantalla = ((this.modeloOferta().getProperty("/lineas") as Linea[]) ?? []).find((l) => l.material === item.material);
					const base = {
						material: item.material,
						posnr: item.posnr,
						denominacion: lineaPantalla?.denominacion ?? item.material,
						detalle: [item.material, item.variante].filter(Boolean).join(" · ")
					};
					if (item.vhcle) {
						// VIN ya reservado en la oferta: se muestra fijo y el pedido sale con ese.
						usados.add(item.vhcle);
						filas.push({ ...base, opciones: [{ key: item.vhcle, text: `${item.vin || item.vhcle} · ${i18n.getText("vinReservado") as string}`, enabled: true }], vin: item.vhcle, fijo: true });
						continue;
					}
					if ((item.cantidad ?? 1) > 1 || !item.werks || !item.vkorg || !item.vtweg) {
						return [];
					}
					const libres = await leerVinsLibres(odata, { vkorg: item.vkorg, vtweg: item.vtweg, matnr: item.material, werks: item.werks, variante: item.variante || undefined });
					const propuesto = libres.find((v) => !usados.has(v.vhcle));
					if (propuesto) {
						usados.add(propuesto.vhcle);
					}
					const opciones = libres.map((v, idx) => ({
						key: v.vhcle,
						text: [
							v.vin,
							[v.color, v.condicion, v.anio].filter(Boolean).join(" "),
							v.ingreso ? (i18n.getText("vinIngreso", [this.formatFecha(v.ingreso)]) as string) : "",
							idx === 0 ? (i18n.getText("vinSugerido") as string) : ""
						]
							.filter(Boolean)
							.join(" · "),
						enabled: true
					}));
					filas.push({ ...base, opciones, vin: propuesto?.vhcle ?? "" });
				}
			}
		} catch {
			return [];
		} finally {
			vista?.setBusy(false);
		}
		return filas;
	}

	public onCambiaVin(): void {
		this.validarVin();
	}

	/** Cada unidad necesita un VIN y no se puede repetir el mismo en dos filas. */
	private validarVin(): void {
		const modelo = this.dialogoVin?.getModel("asignar") as JSONModel;
		const filas = modelo.getProperty("/filas") as FilaVin[];
		const elegidos = filas.map((f) => f.vin).filter((v) => v);
		const duplicado = new Set(elegidos).size !== elegidos.length;
		const faltan = filas.some((f) => !f.vin);
		const avisoActual = modelo.getProperty("/avisoTipo") === "Error" ? (modelo.getProperty("/aviso") as string) : "";
		modelo.setProperty("/valido", !duplicado && !faltan);
		if (duplicado) {
			modelo.setProperty("/aviso", this.i18n().getText("vinDuplicado") as string);
			modelo.setProperty("/avisoTipo", "Warning");
		} else if (faltan) {
			modelo.setProperty("/aviso", this.i18n().getText("vinSinDisponible") as string);
			modelo.setProperty("/avisoTipo", "Warning");
		} else if (!avisoActual) {
			modelo.setProperty("/aviso", "");
		}
	}

	/**
	 * SIMULADO. En SAP: comprobar que cada VIN sigue libre y bloquearlo en la misma operacion
	 * (bloqueo ENQUEUE_E_VLCVEHICLE + accion VELO), para que dos vendedores no tomen el mismo.
	 */
	public onCrearPedido(): void {
		const modelo = this.dialogoVin?.getModel("asignar") as JSONModel;
		if (modelo.getProperty("/sap")) {
			// VIN real elegido (Vhcle por posicion): se crea el pedido y asignarVin valida ese VIN en SAP.
			const elegidos: Record<string, string> = {};
			(modelo.getProperty("/filas") as FilaVin[]).forEach((f) => (elegidos[f.posnr as string] = f.vin));
			this.dialogoVin?.close();
			void this.crearPedidosSap((this.modeloOferta().getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [], elegidos);
			return;
		}
		const mock = this.modeloMock();
		const i18n = this.i18n();
		const filas = modelo.getProperty("/filas") as FilaVin[];
		const buscar = (f: FilaVin): { unidad?: Vin; indice: number } => {
			const lista = (mock.getProperty(`/vins/${f.material}`) as Vin[]) ?? [];
			const indice = lista.findIndex((v) => v.vin === f.vin);
			return { unidad: lista[indice], indice };
		};

		// 1) Alguien pudo tomarlo mientras el vendedor decidia
		const conflicto = filas.find((f) => buscar(f).unidad?.estado !== "Disponible");
		if (conflicto) {
			const tomo = buscar(conflicto).unidad?.reservadoPor ?? "otro vendedor";
			const vehiculos = filas.map((f) => ({ material: f.material, denominacion: f.denominacion, detalle: f.detalle, cantidad: 1 })) as unknown as Linea[];
			modelo.setProperty("/filas", this.armarFilasVin(vehiculos));
			modelo.setProperty("/avisoTipo", "Error");
			modelo.setProperty("/aviso", i18n.getText("vinConflicto", [conflicto.vin, tomo]) as string);
			this.validarVin();
			return;
		}

		// 2) Bloqueo: dueno y vencimiento visibles
		const horas = mock.getProperty("/perfil/bloqueoHoras") as number;
		const hasta = new Date(Date.now() + horas * 3600000).toISOString();
		const dueno = mock.getProperty("/perfil/vendedor") as string;
		filas.forEach((f) => {
			const { indice } = buscar(f);
			mock.setProperty(`/vins/${f.material}/${indice}/estado`, "Reservado");
			mock.setProperty(`/vins/${f.material}/${indice}/reservadoPor`, dueno);
			mock.setProperty(`/vins/${f.material}/${indice}/hasta`, hasta);
		});
		this.crearPedidos(filas.map((f) => ({ material: f.material, vin: f.vin, hasta })));
		this.dialogoVin?.close();
	}

	public onCerrarVin(): void {
		this.dialogoVin?.close();
	}

	/**
	 * Con ?odata=1, ofertas guardadas en SAP y sin vehiculos (asignarVin aun no esta conectado) crea los pedidos
	 * reales; en cualquier otro caso sigue simulado.
	 */
	private crearPedidos(asignaciones: { material: string; vin: string; hasta: string }[]): void {
		const guardadas = (this.modeloOferta().getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [];
		const real =
			this.usarOData() && guardadas.length > 0 && guardadas.every((o) => o.cotizId && o.grupoNo);
		if (real) {
			void this.crearPedidosSap(guardadas);
			return;
		}
		if (this.usarOData()) {
			// Con ?odata=1 se explica por que sigue simulado, para no confundirlo con un fallo.
			const sinGuardarEnSap = guardadas.some((o) => !o.cotizId || !o.grupoNo);
			MessageBox.information(this.i18n().getText(sinGuardarEnSap ? "pedidoSimuladoSinGuardar" : "pedidoSimuladoVehiculo") as string);
		}
		this.crearPedidosSimulado(asignaciones);
	}

	/** Fila de la tabla de pedidos con el estado real de SAP (credito, bloqueos, liberado y total con IGV). */
	private filaPedidoReal(real: GrupoEstado | null, numeroPedido: string, numeroOferta: string, detalle: string, clasePedido: string, impuestos?: { isc: number; igv: number } | null): Record<string, string> {
		const i18n = this.i18n();
		const bloqueo = this.bloqueoDelPedido(real, clasePedido, numeroPedido);
		const textoBloqueo = bloqueo
			? bloqueo.fila.map((f) => i18n.getText(f.clave, f.parametros) as string).join(" \u00b7 ")
			: (i18n.getText("pedidoEstadoNoLeido") as string);
		const liberado = real?.Liberado === "X";
		const pendienteCobro = !!bloqueo && bloqueo.destinos.length === 1 && bloqueo.destinos[0] === "caja";
		return {
			numero: numeroPedido,
			oferta: numeroOferta,
			detalle,
			vin: "\u2014",
			bloqueo: "\u2014",
			clasePedido,
			estado: real?.Rechazado === "X" ? (i18n.getText("pedidoRechazado") as string) : !real ? (i18n.getText("pedidoPendiente") as string) : liberado ? (i18n.getText("pedidoLiberado") as string) : pendienteCobro ? (i18n.getText("pedidoPendienteCobro") as string) : (i18n.getText("pedidoBloqueado") as string),
			estadoState: real?.Rechazado === "X" ? "Error" : liberado ? "Success" : "Warning",
			liberacion: textoBloqueo,
			liberacionState: !real ? "Warning" : liberado ? "Success" : "Warning",
			totalSap: real && real.TotalPedido !== undefined && real.TotalPedido !== "" ? this.textoTotalSap(real, impuestos) : "\u2014"
		};
	}

	/**
	 * Bloqueo real del pedido segun la matriz de credito (Story 1.19). Muestra lo que SAP dejo en el pedido; si no coincide con la matriz,
	 * lo registra en el log para revisarlo con el funcional. Null si no se pudo leer el estado.
	 */
	private bloqueoDelPedido(real: GrupoEstado | null, clasePedido: string, numeroPedido: string): BloqueoPedido | null {
		const bloqueo = evaluarBloqueoPedido(real, clasePedido, String(this.modeloOferta().getProperty("/perfil/formaPago") ?? ""));
		if (bloqueo?.discrepancia) {
			console.warn(`[Cotizador] pedido ${numeroPedido} (clase ${clasePedido || "?"}): ${bloqueo.discrepancia}. Estado real: FAKSK=${real?.BloqueoFactura || "-"} LIFSK=${real?.BloqueoEntrega || "-"} CMGST=${real?.EstadoCredito || "-"}`);
		}
		return bloqueo;
	}

	/** Que debe hacer el vendedor despues de crear el pedido, segun el bloqueo real de SAP: Caja, Creditos o Case Management; sin bloqueo no hay siguiente paso. */
	private avisarSiguientePaso(estados: { real: GrupoEstado | null; clase: string; numeroPedido: string }[]): void {
		const i18n = this.i18n();
		const claves = new Set<string>();
		for (const e of estados) {
			this.bloqueoDelPedido(e.real, e.clase, e.numeroPedido)?.avisos.forEach((a) => claves.add(a));
		}
		const textos = [...claves].map((c) => i18n.getText(c) as string);
		this.modeloOferta().setProperty(
			"/avisoPedido",
			textos.length === 0 ? { texto: "", tipo: "None" } : { texto: textos.join(" "), tipo: claves.has("pedidoAvisoCaja") && claves.size === 1 ? "Information" : "Warning" }
		);
	}

	/** Total del pedido; con ISC e IGV separados de la oferta se muestran como dos lineas, si no, el impuesto va en un solo valor como lo da SAP. */
	private textoTotalSap(real: GrupoEstado, impuestos?: { isc: number; igv: number } | null): string {
		const neto = Number(real.NetoPedido);
		const total = Number(real.TotalPedido);
		const i18n = this.i18n();
		if (impuestos && Math.abs(neto + impuestos.isc + impuestos.igv - total) < 0.01) {
			const igv = impuestos.igv === 0 && neto > 0 ? (i18n.getText("igvExonerado") as string) : (i18n.getText("igv") as string);
			return `${this.formatMonto(neto)} + ${i18n.getText("isc")} ${this.formatMonto(impuestos.isc)} + ${igv} ${this.formatMonto(impuestos.igv)} = ${this.formatMonto(total)} ${real.MonedaPedido}`;
		}
		return `${this.formatMonto(neto)} + ${i18n.getText("igv")} ${this.formatMonto(Number(real.ImpuestoPedido))} = ${this.formatMonto(total)} ${real.MonedaPedido}`;
	}

	/** ISC e IGV reales de una oferta SAP (suma de sus posiciones); null si el servicio no los devuelve. */
	private async impuestosDeOferta(odata: ODataModel, numeroOferta: string): Promise<{ isc: number; igv: number } | null> {
		try {
			const detalle = await cargarDetalleOferta(odata, numeroOferta);
			if (detalle.lineas.length === 0 || !detalle.lineas.every((l) => l.isc !== undefined && l.igvImporte !== undefined)) {
				return null;
			}
			return { isc: this.redondear(detalle.lineas.reduce((a, l) => a + (l.isc ?? 0), 0)), igv: this.redondear(detalle.lineas.reduce((a, l) => a + (l.igvImporte ?? 0), 0)) };
		} catch {
			return null;
		}
	}

	/**
	 * Al abrir una oferta guardada, vuelve a mostrar lo que el vendedor eligio al guardarla: forma de pago, fecha y tipo de entrega (recojo o envio con
	 * su direccion y transportista) y la modalidad de venta. El documento SAP solo trae el cliente y las posiciones; lo demas esta en la cotizacion.
	 * Se llama cuando el cliente y sus direcciones ya estan cargados.
	 */
	private async restaurarDatosGuardados(cotizId: string, numeroOferta: string): Promise<void> {
		const componente = this.getOwnerComponent() as UIComponent;
		const odata = componente.getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		try {
			const datos = await leerDatosGuardados(odata, cotizId);
			const oferta = this.modeloOferta();
			oferta.setProperty("/entrega", datos.entrega);
			oferta.setProperty("/perfil/expedicion", datos.vsbed);
			if (datos.fechaEntrega) {
				oferta.setProperty("/fechaEntrega", datos.fechaEntrega);
			}
			if (datos.zterm) {
				const formas = (oferta.getProperty("/formasPago") as { key: string; text: string }[]) ?? [];
				if (!formas.some((f) => f.key === datos.zterm)) {
					oferta.setProperty("/formasPago", [...formas, { key: datos.zterm, text: datos.zterm }]);
				}
				oferta.setProperty("/perfil/formaPago", datos.zterm);
			}
			// Modalidad de la oferta abierta: se guarda por grupo y la pantalla la toma de aqui al recalcular.
			const guardada = datos.grupos.find((g) => sinCeros(g.vbelnOferta) === sinCeros(numeroOferta));
			const grupo = (oferta.getProperty("/grupos") as Grupo[] | undefined)?.[0];
			if (guardada?.modalidad && grupo) {
				(oferta.getProperty("/modalidadesGrupo") as Record<string, string>)[grupo.clave] = guardada.modalidad;
			}
			if (datos.entrega === "envio") {
				await this.restaurarEnvio(odata, datos);
			}
			this.recalcular();
		} catch (error) {
			console.warn(`[Cotizador] datos guardados de la oferta ${numeroOferta}: ${(error as Error).message}`);
		}
	}

	/** Vuelve a elegir la direccion de envio (o la de un solo uso) y el transportista con su sede, tal como se guardaron. */
	private async restaurarEnvio(odata: ODataModel, datos: Awaited<ReturnType<typeof leerDatosGuardados>>): Promise<void> {
		const oferta = this.modeloOferta();
		const cl = oferta.getProperty("/cliente") as Cliente | null;
		if (cl) {
			if (datos.addrnumberWe === ENVIO_UNICO) {
				oferta.setProperty("/entregaDatos/direccionId", "__unica__");
				oferta.setProperty("/entregaDatos/direccionUnica", datos.direccionUnica);
			} else {
				const dir = this.direccionesDe(cl).find((d) => d.addrnumber === datos.addrnumberWe && (d.kunn2 || cl.kunnr) === (datos.kunnrWe || cl.kunnr));
				if (dir) {
					oferta.setProperty("/entregaDatos/direccionId", dir.id);
				}
			}
			this.aplicarDireccionEnvio();
		}
		if (!datos.kunnrZt && datos.lifnrSp) {
			// Transportista que solo es proveedor (SP): no tiene sedes de cliente, solo su nombre.
			const sp = await leerTransportistaPorLifnr(odata, datos.lifnrSp).catch(() => undefined);
			oferta.setProperty("/entregaDatos/transportista", sp?.id ?? datos.lifnrSp);
			oferta.setProperty("/entregaDatos/transportistaTexto", sp?.nombre ?? datos.lifnrSp);
			oferta.setProperty("/entregaDatos/transportistaRol", "SP");
			oferta.setProperty("/entregaDatos/transportistaKunnr", "");
			oferta.setProperty("/entregaDatos/transportistaLifnr", datos.lifnrSp);
			oferta.setProperty("/entregaDatos/sede", "");
			oferta.setProperty("/entregaDatos/sedeDireccion", "");
			return;
		}
		if (!datos.kunnrZt) {
			return;
		}
		let fila: FilaTransportista | undefined;
		let sedes: SedeTransportista[] = [];
		try {
			fila = await leerTransportistaPorKunnr(odata, datos.kunnrZt);
			sedes = fila ? await cargarSedes(odata, fila.id) : [];
		} catch {
			fila = undefined;
		}
		const sede = sedes.find((s) => s.key === datos.addrnumberZt);
		oferta.setProperty("/entregaDatos/transportista", fila?.id ?? datos.kunnrZt);
		oferta.setProperty("/entregaDatos/transportistaTexto", fila?.nombre ?? datos.kunnrZt);
		oferta.setProperty("/entregaDatos/transportistaRol", "ZT");
		oferta.setProperty("/entregaDatos/transportistaKunnr", datos.kunnrZt);
		oferta.setProperty("/entregaDatos/transportistaLifnr", fila?.lifnr ?? "");
		oferta.setProperty("/entregaDatos/sede", datos.addrnumberZt);
		oferta.setProperty("/entregaDatos/sedeDireccion", sede?.direccion ?? "");
	}

	/** Al abrir una oferta SAP sin pedido, deja lista la clave de cotizacion y grupo para habilitar Copiar a pedido. */
	private async prepararPedidoDeOfertaAbierta(cotizId: string, numeroOferta: string): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		try {
			const cot = (await odata
				.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, {
					$select: "CotizId",
					$expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,VbelnPedido,AuartPedido,Modalidad" } },
					$$ownRequest: true
				})
				.requestObject()) as { _Grupo?: { GrupoNo: string; VbelnOferta: string; VbelnPedido: string; AuartPedido: string; Modalidad?: string }[] };
			const g = (cot._Grupo ?? []).find((x) => sinCeros(x.VbelnOferta) === sinCeros(numeroOferta) && !x.VbelnPedido);
			if (!g) {
				return;
			}
			const oferta = this.modeloOferta();
			oferta.setProperty("/ofertasGuardadas", [
				{
					numero: numeroOferta,
					cotizId,
					grupoNo: g.GrupoNo,
					titulo: (oferta.getProperty("/grupos/0/titulo") as string) ?? (oferta.getProperty("/titulo") as string),
					lineas: (oferta.getProperty("/lineas") as Linea[]) ?? [],
					// Sin modalidad el dialogo "Validar antes de crear el pedido" la mostraba vacia al reabrir la oferta.
					modalidad: (g.Modalidad || (oferta.getProperty("/grupos/0/modalidad") as string) || "").toLowerCase(),
					clasePedido: g.AuartPedido,
					total: oferta.getProperty("/totales/total") as number
				}
			]);
			oferta.setProperty("/guardado", { visible: true, texto: this.i18n().getText("guardadoOk", [numeroOferta]) as string });
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
		}
	}

	/** Oferta anulada o rechazada: aviso, una fila "Rechazado" y la pantalla queda en solo lectura (la bloquea que haya filas en /pedidos). */
	private marcarOfertaAnulada(numeroOferta: string, clasePedido = ""): void {
		const i18n = this.i18n();
		const oferta = this.modeloOferta();
		oferta.setProperty("/avisoPedido", { texto: i18n.getText("anularAviso") as string, tipo: "Warning" });
		oferta.setProperty("/pedidos", [{ numero: "—", oferta: numeroOferta, detalle: "—", vin: "—", bloqueo: "—", clasePedido, estado: i18n.getText("pedidoRechazado") as string, estadoState: "Error", liberacion: "—", liberacionState: "None", totalSap: "—" }]);
		oferta.setProperty("/anulacion", { visible: false, cotizId: "", grupoNo: "" });
	}

	/** Muestra el boton "Anular pedido" solo si el grupo tiene pedido y no esta ya por anular (Y) ni anulado (X). */
	private mostrarAnulacion(grupo: { cotizId: string; grupoNo: string; estado: string; hayPedido: boolean } | null): void {
		const puede = !!grupo && grupo.hayPedido && grupo.estado !== "Y" && grupo.estado !== "X";
		this.modeloOferta().setProperty("/anulacion", { visible: puede && this.usarOData(), cotizId: grupo?.cotizId ?? "", grupoNo: grupo?.grupoNo ?? "" });
	}

	/** Pide el motivo y anula el pedido del grupo (SAP lo hace en segundo plano: devuelve el VIN, rechaza pedido y oferta). */
	public onAnularPedido(): void {
		const oferta = this.modeloOferta();
		const datos = oferta.getProperty("/anulacion") as { cotizId: string; grupoNo: string } | undefined;
		const numero = (oferta.getProperty("/pedidos/0/numero") as string) ?? "";
		const i18n = this.i18n();
		if (!datos?.cotizId || !datos.grupoNo) {
			MessageBox.error(i18n.getText("anularSinDatos") as string);
			return;
		}
		const motivo = new TextArea({ width: "100%", rows: 3, maxLength: 200, placeholder: i18n.getText("anularMotivo") as string, liveChange: () => confirmar.setEnabled(motivo.getValue().trim().length > 0) });
		const confirmar = new Button({
			text: i18n.getText("anularConfirmar") as string,
			type: "Reject",
			enabled: false,
			press: () => {
				const texto = motivo.getValue().trim();
				dialogo.close();
				void this.anularPedidoSap(datos.cotizId, datos.grupoNo, texto);
			}
		});
		const dialogo: Dialog = new Dialog({
			title: i18n.getText("anularTitulo", [numero]) as string,
			type: "Message",
			content: [new Text({ text: i18n.getText("anularExplicacion") as string }), motivo],
			beginButton: confirmar,
			endButton: new Button({ text: i18n.getText("cancelar") as string, press: () => dialogo.close() }),
			afterClose: () => dialogo.destroy()
		});
		this.getView()?.addDependent(dialogo);
		dialogo.open();
	}

	private async anularPedidoSap(cotizId: string, grupoNo: string, motivo: string): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const i18n = this.i18n();
		const vista = this.getView();
		vista?.setBusy(true);
		MessageToast.show(i18n.getText("anularEnCurso") as string, { duration: 6000 });
		try {
			const r = await anularGrupo(odata, cotizId, grupoNo, motivo, {}, await correoUsuarioBtp());
			const numeroOferta = (this.modeloOferta().getProperty("/pedidos/0/oferta") as string) ?? "";
			if (r.estado === "X") {
				MessageToast.show(i18n.getText("anularOk") as string);
			} else if (r.estado === "R") {
				MessageBox.error(i18n.getText("anularRevisar", [r.mensaje || "—"]) as string);
			} else {
				MessageBox.warning(i18n.getText("anularPendiente") as string);
			}
			// Se vuelve a leer el estado real: anulado (X) o con el aviso de revision (R).
			await this.cargarPedidoReal(cotizId, numeroOferta);
		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			vista?.setBusy(false);
		}
	}

	/** Al abrir una oferta que ya tiene pedido, muestra el pedido REAL (antes salia un numero de ejemplo). */
	private async cargarPedidoReal(cotizId: string, numeroOferta: string): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		try {
			const cot = (await odata
				.bindContext(`/Cotizacion(CotizId=${cotizId},IsActiveEntity=true)`, undefined, {
					$select: "CotizId",
					$expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,VbelnPedido,AuartPedido,Estado" } },
					$$ownRequest: true
				})
				.requestObject()) as { _Grupo?: { GrupoNo: string; VbelnOferta: string; VbelnPedido: string; AuartPedido: string; Estado: string }[] };
			const delGrupo = (cot._Grupo ?? []).find((x) => sinCeros(x.VbelnOferta) === sinCeros(numeroOferta) && (x.VbelnPedido || x.Estado === "X"));
			this.mostrarAnulacion(delGrupo ? { cotizId, grupoNo: delGrupo.GrupoNo, estado: delGrupo.Estado, hayPedido: !!delGrupo.VbelnPedido } : null);
			if (delGrupo?.Estado === "X") {
				// Anulado: el grupo ya no tiene numero de pedido; se deja una fila que lo diga y el aviso.
				this.marcarOfertaAnulada(numeroOferta, delGrupo.AuartPedido ?? "");
				return;
			}
			const g = delGrupo;
			if (!g) {
				return;
			}
			const real = await leerEstadoPedido(odata, cotizId, g.GrupoNo);
			const oferta = this.modeloOferta();
			this.avisarSiguientePaso([{ real, clase: g.AuartPedido, numeroPedido: g.VbelnPedido }]);
			const base = this.filaPedidoReal(real, g.VbelnPedido, numeroOferta, (oferta.getProperty("/grupos/0/titulo") as string) ?? "\u2014", g.AuartPedido, await this.impuestosDeOferta(odata, numeroOferta));
			// Igual que al crear el pedido: una fila por vehiculo con su VIN (solo lectura; aqui no se asigna nada).
			let vins: { material: string; color: string; vin: string }[] = [];
			try {
				vins = await leerVinsGrupo(odata, cotizId, g.GrupoNo);
			} catch {
				vins = [];
			}
			const horas = this.modeloMock().getProperty("/perfil/bloqueoHoras");
			oferta.setProperty(
				"/pedidos",
				vins.length === 0
					? [base]
					: vins.map((v) => ({ ...base, detalle: `${v.material} \u00b7 ${v.color}`, vin: v.vin || "\u2014", bloqueo: v.vin ? (this.i18n().getText("vinBloqueadoHoras", [horas]) as string) : "\u2014" }))
			);
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
		}
	}

	/** Un pedido real por cada oferta guardada (accion crearPedido). Se detiene en el primer rechazo de SAP. */
	private async crearPedidosSap(guardadas: OfertaGuardada[], elegidos: Record<string, string> = {}): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const vista = this.getView();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const filas: Record<string, string>[] = [];
		const numeros: string[] = [];
		const estadosReales: { real: GrupoEstado | null; clase: string; numeroPedido: string }[] = [];
		const creados: { cotizId: string; grupoNo: string }[] = [];
		vista?.setBusy(true);
		// Antes de llamar a SAP: si el disponible del almacen no alcanza, se dice aqui (SAP lo rechazaria igual) y no se crea nada.
		const faltan = await this.lineasSinDisponible();
		if (faltan.length > 0) {
			vista?.setBusy(false);
			MessageBox.error(i18n.getText("pedidoSinDisponible", [faltan.join("\n")]) as string);
			return;
		}
		const usuario = await correoUsuarioBtp();
		// SAP exige el VIN para grabar el pedido de un vehiculo: primero se reserva sobre la oferta. Si alguno no se puede reservar no se crea
		// ningun pedido y se dice cual (los ya reservados quedan para esta oferta). Con un SAP anterior el VIN se asigna despues del pedido.
		if (await historialPublicado(odata)) {
			const sinVin: string[] = [];
			for (const o of guardadas) {
				sinVin.push(...(await this.reservarVinsDelGrupo(odata, o.cotizId as string, o.grupoNo as string, elegidos, usuario)));
			}
			if (sinVin.length > 0) {
				vista?.setBusy(false);
				MessageBox.error(i18n.getText("vinNoReservado", [sinVin.join("\n")]) as string);
				return;
			}
		}
		// SAP crea el pedido en segundo plano: puede tardar hasta un minuto; se avisa para que no parezca colgado.
		MessageToast.show(i18n.getText("creandoPedidoEspera") as string, { duration: 6000 });
		try {
			for (const o of guardadas) {
				const pedido = await crearPedidoGrupo(odata, o.cotizId as string, o.grupoNo as string, {}, usuario);
				numeros.push(pedido.vbelnPedido);
				creados.push({ cotizId: o.cotizId as string, grupoNo: o.grupoNo as string });
				// Estado REAL leido de SAP (vista GrupoEstado sobre VBAK); si no se puede leer, se dice que no hay informacion.
				const real = await leerEstadoPedido(odata, o.cotizId as string, o.grupoNo as string);
				estadosReales.push({ real, clase: o.clasePedido ?? "", numeroPedido: pedido.vbelnPedido });
				const base = this.filaPedidoReal(real, pedido.vbelnPedido, o.numero, o.titulo, o.clasePedido ?? "", await this.impuestosDeOferta(odata, o.numero));
				const vins = await this.asignarVinsDelGrupo(odata, o.cotizId as string, o.grupoNo as string, elegidos, usuario);
				if (vins.length === 0) {
					filas.push(base);
				}
				// Con el VIN asignado SAP lo vincula en VELO en segundo plano (Z650); se espera el resultado para mostrarlo en cada fila.
				const vinculos = await this.esperarVinculosDelGrupo(odata, o.cotizId as string, o.grupoNo as string, vins);
				// Una fila por vehiculo, con su VIN; si SAP no pudo asignarlo la fila lo dice (el pedido ya existe, el VIN queda pendiente).
				vins.forEach((v) => filas.push({ ...base, detalle: `${v.material} · ${v.color}`, vin: v.vin || v.error || "—", bloqueo: v.vin ? (vinculos.get(v.posnr) ?? (i18n.getText("vinBloqueadoHoras", [this.modeloMock().getProperty("/perfil/bloqueoHoras")]) as string)) : "—" }));
			}
		} catch (error) {
			if (error instanceof OfertaEnProcesoError) {
				MessageBox.information(error.message);
			} else {
				const motivo = this.motivoDeError(error);
				// Sin stock disponible en el almacen: se explica la causa mas probable y que hacer.
				const ayuda = /stock disponible/i.test(motivo) ? ` ${i18n.getText("pedidoSinStockAyuda") as string}` : "";
				MessageBox.error(`${i18n.getText("pedidoError", [motivo]) as string}${ayuda}`);
			}
		} finally {
			vista?.setBusy(false);
		}
		if (numeros.length > 0) {
			oferta.setProperty("/pedidos", filas);
			// El boton "Anular pedido" actua sobre el primer pedido creado (igual que al abrir una oferta ya guardada).
			this.mostrarAnulacion({ ...creados[0], estado: "P", hayPedido: true });
			this.avisarSiguientePaso(estadosReales);
			oferta.setProperty("/guardado", { visible: true, texto: i18n.getText("pedidosCreados", [numeros.join(", ")]) as string });
		}
	}

	/**
	 * Asigna el VIN de cada vehiculo del grupo despues de crear el pedido (asignarVin: SAP propone el mas antiguo del mismo modelo,
	 * centro y variante). Si falla para un vehiculo, el pedido queda y ese vehiculo queda "VIN pendiente" con el motivo.
	 */
	private async asignarVinsDelGrupo(odata: ODataModel, cotizId: string, grupoNo: string, elegidos: Record<string, string> = {}, usuario = ""): Promise<(VinAsignado & { error?: string })[]> {
		let items: VinAsignado[] = [];
		try {
			items = await leerVinsGrupo(odata, cotizId, grupoNo);
		} catch (error) {
			// Antes se devolvia [] y el pedido salia sin VIN y sin explicacion; ahora la fila dice por que.
			return [{ posnr: "", material: "", vhcle: "", vin: "", color: "", variante: "", error: this.motivoDeError(error) }];
		}
		const resultado: (VinAsignado & { error?: string })[] = [];
		for (const i of items) {
			if (i.vin) {
				resultado.push(i);
				continue;
			}
			try {
				resultado.push(await asignarVinItem(odata, cotizId, i.posnr, elegidos[i.posnr] || undefined, usuario));
			} catch (error) {
				resultado.push({ ...i, error: (error as Error).message });
			}
		}
		return resultado;
	}

	/**
	 * Espera el vinculo del VIN con VELO (lo hace SAP en segundo plano tras asignarVin) y devuelve el texto de cada posicion: "Vinculado en VELO",
	 * "Vinculando..." si aun sigue, o el motivo del error. Sin el campo Item.VinculoEstado en el servicio (version anterior) devuelve un mapa vacio y
	 * la fila conserva el texto de bloqueo de antes. Nunca falla: es informativo.
	 */
	private async esperarVinculosDelGrupo(odata: ODataModel, cotizId: string, grupoNo: string, vins: (VinAsignado & { error?: string })[]): Promise<Map<string, string>> {
		const textos = new Map<string, string>();
		if (!vins.some((v) => v.vhcle && !v.error) || !(await entidadTieneCampo(odata, "Item", "VinculoEstado"))) {
			return textos;
		}
		const i18n = this.i18n();
		try {
			MessageToast.show(i18n.getText("vinculandoVelo") as string, { duration: 6000 });
			const estados = await esperarVinculos(() => leerVinsGrupo(odata, cotizId, grupoNo));
			const motivo = [...estados.values()].includes("E") ? await leerMotivoVinculo(odata, cotizId) : "";
			estados.forEach((estado, posnr) => {
				textos.set(posnr, estado === "V" ? (i18n.getText("vinculadoVelo") as string) : estado === "E" ? (i18n.getText("vinculoError", [motivo || "—"]) as string) : (i18n.getText("vinculoPendiente") as string));
			});
		} catch (error) {
			console.warn(`[Cotizador] estado del vinculo con VELO: ${(error as Error).message}`);
		}
		return textos;
	}

	/** SIMULADO: un pedido por cada oferta guardada; el pedido nace pendiente de liberacion. */
	private crearPedidosSimulado(asignaciones: { material: string; vin: string; hasta: string }[]): void {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const guardadas = (oferta.getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [];
		const pendientes = [...asignaciones];
		const filas: Record<string, string>[] = [];
		const numeros: string[] = [];
		guardadas.forEach((o, i) => {
			const numero = String(1300001600 + i);
			numeros.push(numero);
			const lib = this.evaluarLiberacion(o);
			const vehiculos = o.lineas.filter((l) => this.esVehiculo(l));
			if (vehiculos.length) {
				vehiculos.forEach((l) => {
					const idx = pendientes.findIndex((a) => a.material === l.material);
					const a = idx >= 0 ? pendientes.splice(idx, 1)[0] : undefined;
					filas.push({
						numero,
						oferta: o.numero,
						detalle: `${l.denominacion} · ${l.detalle}`,
						vin: a?.vin ?? "\u2014",
						bloqueo: a ? this.fechaHora(a.hasta) : "\u2014",
						clasePedido: o.clasePedido ?? "",
						estado: lib.automatica ? (i18n.getText("pedidoLiberado") as string) : (i18n.getText("pedidoBloqueado") as string),
						estadoState: lib.automatica ? "Success" : "Warning",
						liberacion: lib.texto,
						liberacionState: lib.estado
					});
				});
			} else {
				filas.push({
					numero,
					oferta: o.numero,
					detalle: `${o.titulo}`,
					vin: "\u2014",
					bloqueo: "\u2014",
					clasePedido: o.clasePedido ?? "",
					estado: lib.automatica ? (i18n.getText("pedidoLiberado") as string) : (i18n.getText("pedidoBloqueado") as string),
					estadoState: lib.automatica ? "Success" : "Warning",
					liberacion: lib.texto,
					liberacionState: lib.estado
				});
			}
		});
		oferta.setProperty("/pedidos", filas);
		oferta.setProperty("/guardado", {
			visible: true,
			texto: `${i18n.getText("pedidosCreados", [numeros.join(", ")])} (${i18n.getText("simulacion")})`
		});
	}

	public onCancelarBusqueda(): void {
		this.dialogoBusqueda?.close();
	}

	public onCerrarBusqueda(): void {
		this.modeloBusqueda().setProperty("/elegido", null);
	}

	/** El cliente se busca en SAP con ?odata=1 o publicada fuera de localhost; si no, sigue la busqueda simulada. */
	private usarOData(): boolean {
		return usarODataActual();
	}

	/** Busqueda real de cliente (vista YI_COTIZ_CLIENTE). Con varias coincidencias se abre una ventana para elegir. */
	private async buscarClienteReal(texto: string): Promise<void> {
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		// Sin errores viejos en el gestor de mensajes: el motivo que se muestra es el de esta busqueda.
		quitarTodosLosMensajes();
		try {
			// El cliente se busca en TODAS las organizaciones: es de toda la empresa. Si no esta dado de alta en la organizacion y el canal
			// de la oferta, la pantalla lo avisa y permite ampliar el area de ventas.
			const encontrados = await buscarClientes(odata, texto);
			if (encontrados.length === 0) {
				oferta.setProperty("/cliente", null);
				oferta.setProperty("/clienteNoEncontrado", true);
				this.iniciarAlta(texto);
				this.refrescarTrasCliente();
			} else if (encontrados.length === 1) {
				this.aplicarClienteSap(encontrados[0]);
			} else {
				this.abrirSelectorCliente(encontrados);
			}
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataClienteError", [this.motivoDeError(error)]) as string, { duration: 8000 });
		}
	}

	/** Ventana para elegir entre varios clientes (nombre, documento y numero SAP), con filtro mientras se escribe. */
	private abrirSelectorCliente(encontrados: ClienteSap[]): void {
		const i18n = this.i18n();
		const modelo = new JSONModel({ clientes: encontrados });
		const plantilla = new StandardListItem({
			title: "{nombre}",
			description: "{tipoDoc} {doc} · N° {kunnr}",
			info: "{= ${bloqueado} ? 'Bloqueado' : '' }",
			infoState: "Error"
		});
		const dialogo = new SelectDialog({
			title: i18n.getText("elegirCliente", [encontrados.length]) as string,
			items: { path: "/clientes", template: plantilla },
			growing: false
		});
		dialogo.attachSearch((evento) => {
			const valor = ((evento.getParameter("value") as string | undefined) ?? "").toUpperCase();
			const enlace = dialogo.getBinding("items") as ListBinding;
			enlace.filter(
				valor
					? [
							new Filter({
								filters: [
									new Filter({ path: "nombre", test: (v: string) => (v ?? "").toUpperCase().includes(valor) }),
									new Filter({ path: "doc", test: (v: string) => (v ?? "").includes(valor) }),
									new Filter({ path: "kunnr", test: (v: string) => (v ?? "").includes(valor) })
								],
								and: false
							})
						]
					: []
			);
		});
		dialogo.attachConfirm((evento) => {
			const item = evento.getParameter("selectedItem") as StandardListItem | undefined;
			const elegido = item?.getBindingContext()?.getObject() as ClienteSap | undefined;
			if (elegido) {
				this.aplicarClienteSap(elegido);
			}
			dialogo.destroy();
		});
		// Al elegir o cancelar se libera la ventana, para no acumular una por cada busqueda.
		dialogo.attachCancel(() => dialogo.destroy());
		dialogo.setModel(modelo);
		this.getView()?.addDependent(dialogo);
		dialogo.open("");
	}

	private clienteDeSap(elegido: ClienteSap): Cliente {
		return {
			kunnr: elegido.kunnr,
			doc: elegido.doc,
			tipoDoc: elegido.tipoDoc,
			nombre: elegido.nombre,
			estado: elegido.bloqueado ? "Bloqueado" : "",
			estadoState: elegido.bloqueado ? "Error" : "None",
			condicion: elegido.ztermTexto,
			grupo: elegido.grupoTexto || elegido.grupo,
			telefono: "",
			correo: "",
			direccion: elegido.direccion,
			// Sin esto el cliente de SAP caia en las areas de ejemplo y siempre faltaba el area de ventas (p. ej. 1103/10).
			areas: elegido.areas,
			condicionesAreas: elegido.condicionesAreas
		};
	}

	private aplicarClienteSap(elegido: ClienteSap): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/cliente", this.clienteDeSap(elegido));
		oferta.setProperty("/clienteNoEncontrado", false);
		// Un cliente encontrado cierra el formulario de alta que haya quedado abierto de una busqueda anterior.
		oferta.setProperty("/altaAbierta", false);
		this.refrescarTrasCliente();
		void this.cargarDatosCliente(elegido.kunnr, elegido.bloqueado);
	}

	/**
	 * Al abrir una oferta o pedido ya creado, el documento solo trae el numero y el nombre del cliente: se completan sus datos reales (documento,
	 * condicion, grupo, direccion, credito, contacto). No se recalcula ni se cambia nada de la oferta: es solo para mostrar.
	 */
	private async completarClienteDeDocumento(kunnr: string): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata || !kunnr) {
			return;
		}
		try {
			const encontrados = await buscarClientes(odata, kunnr, [], 1);
			const elegido = encontrados.find((c) => c.kunnr === kunnr) ?? encontrados[0];
			if (!elegido) {
				return;
			}
			this.modeloOferta().setProperty("/cliente", this.clienteDeSap(elegido));
			void this.cargarDatosCliente(elegido.kunnr, elegido.bloqueado);
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataClienteError", [this.motivoDeError(error)]) as string, { duration: 8000 });
		}
	}

	/**
	 * Credito, movimientos, direcciones y contacto reales del cliente, cada uno por su lado: si uno falla se avisa y los demas siguen.
	 * Todo es informativo; la liberacion del pedido la decide Creditos.
	 */
	private async cargarDatosCliente(kunnr: string, bloqueado: boolean): Promise<void> {
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		const i18n = this.i18n();
		const [credito, movimientos, direcciones, contacto] = await Promise.allSettled([
			cargarCreditoCliente(odata, kunnr, fechaLocalISO()),
			cargarMovimientos(odata, kunnr),
			cargarDirecciones(odata, kunnr, i18n.getText("direccionFiscal") as string),
			cargarContacto(odata, kunnr)
		]);
		// Si entre tanto se cambio de cliente, no se pisan los datos del nuevo.
		if ((oferta.getProperty("/cliente") as Cliente | null)?.kunnr !== kunnr) {
			return;
		}
		const fallos: string[] = [];
		if (credito.status === "fulfilled") {
			const moneda = String(oferta.getProperty("/perfil/moneda") || "PEN");
			// El mapeo segmento de credito <-> organizacion de ventas no esta confirmado: no se elige segmento.
			const resumen = resumirCredito(credito.value.segmentos, credito.value.saldos, moneda);
			oferta.setProperty("/cliente/credito", resumen);
			if (!bloqueado) {
				const { texto, estado } = this.estadoDeCredito(resumen.estado);
				oferta.setProperty("/cliente/estado", texto);
				oferta.setProperty("/cliente/estadoState", estado);
			}
		} else {
			fallos.push((credito.reason as Error).message);
		}
		if (movimientos.status === "fulfilled") {
			oferta.setProperty("/cliente/movimientos", movimientos.value);
		} else {
			fallos.push((movimientos.reason as Error).message);
		}
		if (direcciones.status === "fulfilled" && direcciones.value.length) {
			oferta.setProperty("/cliente/direcciones", direcciones.value);
			oferta.setProperty("/cliente/direccion", direcciones.value.find((d) => d.tipo === "Fiscal")?.texto ?? direcciones.value[0].texto);
			this.aplicarDireccionEnvio();
		} else if (direcciones.status === "rejected") {
			fallos.push((direcciones.reason as Error).message);
		}
		if (contacto.status === "fulfilled") {
			oferta.setProperty("/cliente/correo", contacto.value.correo);
			oferta.setProperty("/cliente/telefono", contacto.value.telefono);
		} else {
			fallos.push((contacto.reason as Error).message);
		}
		if (fallos.length) {
			MessageToast.show(i18n.getText("odataCreditoError", [fallos[0]]) as string);
		}
	}

	private estadoDeCredito(estado: EstadoCuenta): { texto: string; estado: string } {
		const i18n = this.i18n();
		switch (estado) {
			case "AlDia":
				return { texto: i18n.getText("credAlDia") as string, estado: "Success" };
			case "Vencido":
				return { texto: i18n.getText("credVencido") as string, estado: "Error" };
			case "Bloqueado":
				return { texto: i18n.getText("credBloqueado") as string, estado: "Error" };
			case "LimiteVencido":
				return { texto: i18n.getText("credLimiteVencido") as string, estado: "Warning" };
			default:
				return { texto: i18n.getText("credSinDatos") as string, estado: "None" };
		}
	}

	/**
	 * Areas de ventas del cliente (de las organizaciones del vendedor) para elegir en el perfil. Un cliente puede tener condiciones distintas
	 * por canal y por sector; con una sola opcion se aplica sola, con varias el vendedor elige.
	 */
	private cargarAreasCliente(): void {
		const oferta = this.modeloOferta();
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const org = String(oferta.getProperty("/perfil/orgVentas") ?? "");
		const orgs = [org, orgVehiculosDe(org) ?? ""].filter(Boolean);
		const canales = (oferta.getProperty("/opciones/canales") as { key: string; text: string }[]) ?? [];
		const opciones = opcionesAreaCliente(cliente?.condicionesAreas, orgs).map((o) => ({
			...o,
			text: this.textoAreaCliente(o, canales.find((c) => c.key === o.vtweg)?.text ?? `canal ${o.vtweg}`)
		}));
		// Con varias opciones se agrega una vacia al inicio: sin ella el desplegable parece tener una elegida y no aplica nada.
		oferta.setProperty("/areasCliente", opciones.length > 1 ? [{ key: "", text: this.i18n().getText("areaClienteElegir") as string }, ...opciones] : opciones);
		oferta.setProperty("/areaClienteSel", opciones.length === 1 ? opciones[0].key : "");
		if (opciones.length === 1) {
			this.aplicarAreaCliente(opciones[0]);
		}
	}

	private textoAreaCliente(o: OpcionAreaCliente, canal: string): string {
		const sectores = o.sectores.length > 3 ? `${o.sectores[0]}-${o.sectores[o.sectores.length - 1]}` : o.sectores.join(", ");
		return this.i18n().getText("areaClienteOpcion", [textoOrganizacion(o.vkorg), canal, sectores, o.zterm || "—", o.waers || "—"]) as string;
	}

	public onCambiaAreaCliente(): void {
		const oferta = this.modeloOferta();
		const elegida = ((oferta.getProperty("/areasCliente") as OpcionAreaCliente[]) ?? []).find((o) => o.key !== "" && o.key === oferta.getProperty("/areaClienteSel"));
		if (elegida) {
			this.aplicarAreaCliente(elegida);
		}
	}

	/** El area elegida fija el canal, la forma de pago y la moneda del perfil con lo que SAP tiene para ese cliente en esa area. */
	private aplicarAreaCliente(o: OpcionAreaCliente): void {
		const oferta = this.modeloOferta();
		// La ficha del cliente mostraba la primera fila de SAP; ahora muestra la condicion y el grupo del area elegida.
		if (oferta.getProperty("/cliente")) {
			oferta.setProperty("/cliente/condicion", o.ztermTexto || o.zterm);
			oferta.setProperty("/cliente/grupo", o.grupoTexto || o.grupo);
		}
		const canales = (oferta.getProperty("/opciones/canales") as { key: string }[]) ?? [];
		if (canales.some((c) => c.key === o.vtweg) && oferta.getProperty("/perfil/canal") !== o.vtweg) {
			oferta.setProperty("/perfil/canal", o.vtweg);
			void this.onCambiaCanal();
		}
		const formas = (oferta.getProperty("/formasPago") as { key: string }[]) ?? [];
		if (o.zterm && formas.some((f) => f.key === o.zterm)) {
			oferta.setProperty("/perfil/formaPago", o.zterm);
		}
		if ((o.waers === "PEN" || o.waers === "USD") && oferta.getProperty("/perfil/moneda") !== o.waers) {
			oferta.setProperty("/perfil/moneda", o.waers);
			this.onCambiaMoneda();
		}
	}

	private refrescarTrasCliente(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/direccionId", "");
		this.cargarAreasCliente();
		this.aplicarDireccionEnvio();
		this.recalcular();
		// El precio de SAP depende del cliente: las lineas ya agregadas se vuelven a preciar con el cliente nuevo.
		void this.repreciarLineasSap();
	}

	public onBuscarCliente(): void {
		const doc = (this.byId("buscarCliente") as SearchField).getValue().trim();
		if (this.usarOData() && doc !== "") {
			void this.buscarClienteReal(doc);
			return;
		}
		const oferta = this.modeloOferta();
		const clientes = this.modeloMock().getProperty("/clientes") as Record<string, Cliente>;
		const cliente = clientes[doc];
		oferta.setProperty("/cliente", cliente ?? null);
		oferta.setProperty("/entregaDatos/direccionId", "");
		this.aplicarDireccionEnvio();
		if (oferta.getProperty("/materialElegido")) {
			this.calcularVista();
		}
		oferta.setProperty("/clienteNoEncontrado", !cliente && doc !== "");
		if (!cliente && doc !== "") {
			this.iniciarAlta(doc);
		}
		this.recalcular();
	}

	/* ---------- Alta de cliente inline (datos de ZSCPBP01; la consulta a APIDNI es SIMULADA) ---------- */

	private altaVacia(doc: string): Record<string, unknown> {
		const tipoDoc = tipoDocPorNumero(doc);
		// Con una sola opcion (RUC 20 = empresa) queda elegida; si no (DNI: senora o senor; RUC 10: cualquiera) la elige el vendedor.
		const tipos = tiposClientePara(tipoDoc, doc);
		return {
			tipoCliente: tipos.length === 1 ? tipos[0] : "",
			// Que campos se ven: los de persona (nombres y apellidos) o la razon social. Con DNI, persona desde el inicio.
			persona: tipoDoc !== "RUC" || esPersona(tipos.length === 1 ? tipos[0] : ""),
			tipoDoc,
			doc,
			// Con SAP real el alta y la consulta van a SAP: el aviso de simulacion es solo del modo ejemplo.
			conSap: this.usarOData(),
			// Un solo campo; al crear se reparte en las tres partes de SAP (partirRazon).
			razon: "",
			// Persona (tipo 0001 o 0002), como la rama de persona de ZSCPBP01.
			nombres: "",
			apePat: "",
			apeMat: "",
			dep: "",
			prov: "",
			dist: "",
			provincias: [],
			distritos: [],
			dir1: "",
			dir2: "",
			dir3: "",
			celular: "",
			email: "",
			errores: "",
			nota: "",
			notaTipo: "Information"
		};
	}

	private iniciarAlta(doc: string): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/altaAbierta", true);
		oferta.setProperty("/alta", this.altaVacia(doc));
		oferta.setProperty("/ubigeo", this.modeloMock().getProperty("/ubigeo") ?? []);
		oferta.setProperty("/tiposCliente", this.opcionesTipoCliente(String(oferta.getProperty("/alta/tipoDoc") ?? ""), doc));
		void this.usarUbigeoReal();
	}

	/** Tipos de cliente (tratamiento del BP en SAP) que admite el documento, con sus textos. */
	private opcionesTipoCliente(tipoDoc: string, doc: string): { key: string; text: string }[] {
		const textos: Record<string, string> = {
			[TIPO_CLIENTE.senora]: this.i18n().getText("tipoClienteSenora") as string,
			[TIPO_CLIENTE.senor]: this.i18n().getText("tipoClienteSenor") as string,
			[TIPO_CLIENTE.empresa]: this.i18n().getText("tipoClienteEmpresa") as string
		};
		return tiposClientePara(tipoDoc, doc).map((key) => ({ key, text: textos[key] }));
	}

	/** Al cambiar el tipo o el numero de documento se ajustan los tipos de cliente posibles (DNI = persona, RUC 20 = empresa). */
	public onCambiaDocAlta(): void {
		const oferta = this.modeloOferta();
		const opciones = this.opcionesTipoCliente(String(oferta.getProperty("/alta/tipoDoc") ?? ""), String(oferta.getProperty("/alta/doc") ?? ""));
		oferta.setProperty("/tiposCliente", opciones);
		if (!opciones.some((o) => o.key === oferta.getProperty("/alta/tipoCliente"))) {
			oferta.setProperty("/alta/tipoCliente", opciones.length === 1 ? opciones[0].key : "");
		}
		this.onCambiaTipoCliente();
	}

	public onCambiaTipoCliente(): void {
		const oferta = this.modeloOferta();
		const tipo = String(oferta.getProperty("/alta/tipoCliente") ?? "");
		oferta.setProperty("/alta/persona", esPersona(tipo) || (!tipo && oferta.getProperty("/alta/tipoDoc") !== "RUC"));
	}

	/** Con SAP real y el catalogo publicado, los desplegables de departamento/provincia/distrito usan la lista real en vez de la de ejemplo. */
	private async usarUbigeoReal(): Promise<void> {
		if (!this.usarOData()) {
			return;
		}
		try {
			const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
			if (!(await serviciosDeCliente(odata)).ubigeo) {
				return;
			}
			const arbol = await cargarUbigeo(odata);
			if (arbol.length) {
				this.modeloOferta().setProperty("/ubigeo", arbol);
			}
		} catch {
			// si el catalogo real no se puede leer queda el de ejemplo
		}
	}

	public onCancelarAlta(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/altaAbierta", false);
		oferta.setProperty("/clienteNoEncontrado", false);
	}

	public onCambiaDpto(): void {
		const oferta = this.modeloOferta();
		const dep = oferta.getProperty("/alta/dep") as string;
		const nodo = (oferta.getProperty("/ubigeo") as { dep: string; provincias: { prov: string; distritos: string[] }[] }[]).find((x) => x.dep === dep);
		oferta.setProperty("/alta/provincias", nodo?.provincias ?? []);
		oferta.setProperty("/alta/prov", "");
		oferta.setProperty("/alta/distritos", []);
		oferta.setProperty("/alta/dist", "");
	}

	public onCambiaProv(): void {
		const oferta = this.modeloOferta();
		const provs = oferta.getProperty("/alta/provincias") as { prov: string; distritos: string[] }[];
		const nodo = provs.find((p) => p.prov === oferta.getProperty("/alta/prov"));
		oferta.setProperty("/alta/distritos", nodo?.distritos ?? []);
		oferta.setProperty("/alta/dist", "");
	}

	/**
	 * Story 1.2: razon social, direccion y ubigeo de SUNAT (RUC) o RENIEC (DNI) por la entidad DocumentoIdentidad (SAP llama a tools.devex.pe).
	 * Sin conexion, sin token o con un numero que no existe, SAP lo dice y el alta sigue a mano. Sin la entidad publicada: los datos de ejemplo.
	 */
	public async onConsultarApi(): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const doc = String(oferta.getProperty("/alta/doc") ?? "").trim();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		const elegido = String(oferta.getProperty("/alta/tipoDoc") ?? "");
		// SUNAT y RENIEC solo responden por RUC y DNI: el carnet y el pasaporte se llenan a mano.
		if (elegido === "CE" || elegido === "PAS") {
			oferta.setProperty("/alta/nota", i18n.getText("altaApiSoloRucDni") as string);
			oferta.setProperty("/alta/notaTipo", "Information");
			return;
		}
		if (this.usarOData() && odata && (await documentoPublicado(odata))) {
			const tipo = tipoDeDocumento(doc, elegido);
			const errorDoc = validarDocumento(tipo, doc, true);
			if (errorDoc) {
				oferta.setProperty("/alta/nota", i18n.getText({ dniFormato: "altaErrDni", dniFalso: "altaErrDniFalso", rucFormato: "altaErrRuc", rucDigito: "altaErrRucDigito", ceFormato: "altaErrCe", pasFormato: "altaErrPas" }[errorDoc]) as string);
				oferta.setProperty("/alta/notaTipo", "Warning");
				return;
			}
			oferta.setProperty("/alta/consultando", true);
			try {
				const d = await consultarDocumento(odata, tipo, doc);
				if (!d.ok) {
					oferta.setProperty("/alta/nota", d.mensaje || (i18n.getText("altaApiSinDatos") as string));
					oferta.setProperty("/alta/notaTipo", "Warning");
					return;
				}
				oferta.setProperty("/alta/tipoDoc", tipo);
				this.onCambiaDocAlta();
				oferta.setProperty("/alta/razon", d.nombre);
				// DNI: RENIEC trae nombres y apellidos por separado; sin ellos el nombre completo queda en Nombres para que el vendedor lo reparta.
				if (tipo === "DNI") {
					oferta.setProperty("/alta/nombres", d.apePat ? d.nombres : d.nombre);
					oferta.setProperty("/alta/apePat", d.apePat);
					oferta.setProperty("/alta/apeMat", d.apeMat);
				}
				const [d1, d2, d3] = partirRazon(d.direccion);
				oferta.setProperty("/alta/dir1", d1 ?? "");
				oferta.setProperty("/alta/dir2", d2 ?? "");
				oferta.setProperty("/alta/dir3", d3 ?? "");
				oferta.setProperty("/alta/dep", d.departamento);
				this.onCambiaDpto();
				oferta.setProperty("/alta/prov", d.provincia);
				this.onCambiaProv();
				oferta.setProperty("/alta/dist", d.distrito);
				oferta.setProperty("/alta/errores", "");
				oferta.setProperty("/alta/nota", i18n.getText("altaApiSap", [d.mensaje]) as string);
				oferta.setProperty("/alta/notaTipo", conAdvertencia(d) ? "Warning" : "Success");
			} catch (error) {
				oferta.setProperty("/alta/nota", i18n.getText("altaApiError", [this.motivoDeError(error)]) as string);
				oferta.setProperty("/alta/notaTipo", "Warning");
			} finally {
				oferta.setProperty("/alta/consultando", false);
			}
			return;
		}
		const r = (this.modeloMock().getProperty("/apiDocumentos") as Record<string, { tipoDoc: string; razon: string; nombres?: string; apePat?: string; apeMat?: string; direccion: string; dep: string; prov: string; dist: string; ubigeoApi: string; formato: string }>)[doc];
		if (!r) {
			oferta.setProperty("/alta/nota", i18n.getText("altaApiSinDatos"));
			oferta.setProperty("/alta/notaTipo", "Warning");
			return;
		}
		const partir = (t: string, n: number): string[] => [t.slice(0, n), t.slice(n, 2 * n), t.slice(2 * n, 3 * n)];
		const [d1, d2, d3] = partir(r.direccion, 35);
		oferta.setProperty("/alta/razon", r.razon);
		oferta.setProperty("/alta/nombres", r.nombres ?? "");
		oferta.setProperty("/alta/apePat", r.apePat ?? "");
		oferta.setProperty("/alta/apeMat", r.apeMat ?? "");
		oferta.setProperty("/alta/dir1", d1);
		oferta.setProperty("/alta/dir2", d2);
		oferta.setProperty("/alta/dir3", d3);
		oferta.setProperty("/alta/dep", r.dep);
		this.onCambiaDpto();
		oferta.setProperty("/alta/prov", r.prov);
		this.onCambiaProv();
		oferta.setProperty("/alta/dist", r.dist);
		oferta.setProperty("/alta/errores", "");
		oferta.setProperty("/alta/nota", i18n.getText("altaApiOk", [r.ubigeoApi, r.formato]));
		oferta.setProperty("/alta/notaTipo", "Success");
	}

	public onCrearCliente(): void {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const a = oferta.getProperty("/alta") as Record<string, string>;
		const clientes = this.modeloMock().getProperty("/clientes") as Record<string, Cliente>;
		const errores: string[] = [];
		const doc = (a.doc ?? "").trim();
		// El digito verificador del RUC se exige con SAP real; el RUC de ejemplo del prototipo no lo cumple.
		const errorDoc = validarDocumento(a.tipoDoc, doc, this.usarOData());
		if (errorDoc) {
			errores.push(i18n.getText({ dniFormato: "altaErrDni", dniFalso: "altaErrDniFalso", rucFormato: "altaErrRuc", rucDigito: "altaErrRucDigito", ceFormato: "altaErrCe", pasFormato: "altaErrPas" }[errorDoc]) as string);
		}
		if (!this.usarOData() && clientes[doc]) {
			errores.push(i18n.getText("altaErrExiste") as string);
		}
		const persona = esPersona(a.tipoCliente);
		const razon = this.razonLimpia(a.razon);
		const partesRazon = partirRazon(razon);
		if (!tiposClientePara(a.tipoDoc, doc).includes(a.tipoCliente)) {
			errores.push(i18n.getText("altaErrTipoCliente") as string);
		} else if (persona) {
			// Persona: nombres y apellido paterno obligatorios; el materno puede faltar (SAP valida lo mismo).
			if (!this.razonLimpia(a.nombres)) {
				errores.push(i18n.getText("altaErrNombres") as string);
			} else if (!partirNombres(a.nombres)) {
				errores.push(i18n.getText("altaErrNombresLargos") as string);
			}
			if (!this.razonLimpia(a.apePat)) {
				errores.push(i18n.getText("altaErrApePat") as string);
			}
		} else if (!razon) {
			errores.push(i18n.getText("altaErrRazon") as string);
		} else if (partesRazon.length > 3) {
			errores.push(i18n.getText("altaErrRazonLarga") as string);
		}
		if (!a.dep || !a.prov || !a.dist) {
			errores.push(i18n.getText("altaErrUbigeo") as string);
		}
		if (!(a.dir1 ?? "").trim()) {
			errores.push(i18n.getText("altaErrDireccion") as string);
		}
		if (!/^9\d{8}$/.test((a.celular ?? "").replace(/\s/g, ""))) {
			errores.push(i18n.getText("altaErrCelular") as string);
		}
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email ?? "")) {
			errores.push(i18n.getText("altaErrEmail") as string);
		}
		oferta.setProperty("/alta/errores", errores.join("\n"));
		if (errores.length) {
			return;
		}
		const [razon1 = "", razon2 = "", razon3 = ""] = persona ? [] : partesRazon;
		const datos = { ...a, razon1, razon2, razon3, titulo: a.tipoCliente, nombres: this.razonLimpia(a.nombres), apePat: this.razonLimpia(a.apePat), apeMat: this.razonLimpia(a.apeMat) };
		if (this.usarOData()) {
			void this.crearClienteEnSap(datos as unknown as DatosAlta, doc);
			return;
		}
		this.crearClienteSimulado(datos, doc);
	}

	/**
	 * Alta real (entidad ClienteAlta). Si el servicio aun no la publica, sigue el alta simulada. Tras crear, se vuelve a leer el cliente por su
	 * documento con la misma busqueda de siempre, asi la oferta usa los datos que SAP guardo. Un documento ya existente no se duplica.
	 */
	private async crearClienteEnSap(a: DatosAlta, doc: string): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		oferta.setProperty("/alta/errores", "");
		quitarTodosLosMensajes();
		this.getView()?.setBusy(true);
		try {
			const servicios = await serviciosDeCliente(odata);
			if (!servicios.alta) {
				this.crearClienteSimulado(a as unknown as Record<string, string>, doc);
				return;
			}
			// Servicio anterior a la v1.2 del alta: solo empresas, y sin los campos nuevos (SAP rechazaria la peticion entera).
			if (!servicios.persona && esPersona(a.titulo)) {
				oferta.setProperty("/alta/errores", i18n.getText("altaErrPersonaSap") as string);
				return;
			}
			const datos = servicios.persona ? a : { ...a, titulo: undefined, nombres: undefined, apePat: undefined, apeMat: undefined };
			const r = await crearClienteSap(odata, { ...datos, doc });
			if (!r.kunnr) {
				oferta.setProperty("/alta/errores", i18n.getText("altaErrSap", [r.mensaje || (i18n.getText("altaErrSinNumero") as string)]) as string);
				return;
			}
			const encontrados = (await buscarClientes(odata, doc)).filter((c) => c.kunnr === r.kunnr);
			oferta.setProperty("/altaAbierta", false);
			oferta.setProperty("/clienteNoEncontrado", false);
			if (encontrados.length) {
				this.aplicarClienteSap(encontrados[0]);
			}
			// Desde la v1.3 del alta el mismo job amplia al cliente a las demas areas retail; si eso falla el cliente igual quedo creado.
			const sinAmpliar = r.creado && /no se amplio/i.test(r.mensaje);
			if (sinAmpliar) {
				MessageBox.warning(i18n.getText("altaCreadoSinAmpliar", [r.kunnr, r.mensaje]) as string);
			} else {
				MessageToast.show(r.creado ? (i18n.getText("altaCreadoSap", [r.kunnr]) as string) : (i18n.getText("altaYaExistia", [r.kunnr]) as string), { duration: 6000 });
			}
		} catch (error) {
			if (error instanceof AltaEnProcesoError) {
				oferta.setProperty("/altaAbierta", false);
				MessageBox.information(i18n.getText("altaEnProceso", [a.doc]) as string);
			} else {
				oferta.setProperty("/alta/errores", i18n.getText("altaErrSap", [this.motivoDeError(error)]) as string);
			}
		} finally {
			this.getView()?.setBusy(false);
		}
	}

	/** SIMULADO: en SAP se crea el Business Partner (una sola transaccion, con control de duplicados por documento). */
	private crearClienteSimulado(a: Record<string, string>, doc: string): void {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const clientes = this.modeloMock().getProperty("/clientes") as Record<string, Cliente>;
		// Las partes se cortaron entre palabras: SAP las muestra unidas con un espacio. Una persona se muestra con nombres y apellidos.
		const partes = esPersona(a.titulo) ? [a.nombres, a.apePat, a.apeMat] : [a.razon1, a.razon2, a.razon3];
		const nombre = partes.map((t) => (t ?? "").trim()).filter(Boolean).join(" ");
		const nuevo: Cliente = {
			doc,
			tipoDoc: a.tipoDoc,
			nombre,
			estado: i18n.getText("altaEstadoNuevo") as string,
			estadoState: "Information",
			condicion: i18n.getText("altaCondicionNueva") as string,
			grupo: "02 Retail",
			telefono: a.celular,
			correo: a.email,
			direccion: `${a.dir1}${a.dir2}${a.dir3}, ${a.dist}, ${a.prov}, ${a.dep}`.trim(),
			lineaCredito: 0,
			areas: ["1101/11", "1103/11"],
			direcciones: [{ id: "D1", alias: i18n.getText("direccionFiscal") as string, tipo: "Fiscal", texto: `${a.dir1}${a.dir2}${a.dir3}, ${a.dist}, ${a.prov}, ${a.dep}`.trim() }]
		};
		clientes[doc] = nuevo;
		oferta.setProperty("/cliente", nuevo);
		oferta.setProperty("/entregaDatos/direccionId", "");
		this.aplicarDireccionEnvio();
		oferta.setProperty("/altaAbierta", false);
		oferta.setProperty("/clienteNoEncontrado", false);
		MessageToast.show(`${i18n.getText("altaCreado", [nombre])} (${i18n.getText("simulacion")})`);
	}

	/**
	 * Con ?odata=1 y una oferta NUEVA guarda en SAP y muestra los numeros reales (una oferta por grupo).
	 * Sin la bandera, o al modificar una oferta existente (la accion Edit aun no esta conectada), sigue simulado.
	 */
	public async onGuardar(): Promise<void> {
		const oferta = this.modeloOferta();
		if (this.usarOData() && !(oferta.getProperty("/numero") as string)) {
			const previas = (oferta.getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [];
			if (previas.some((o) => o.cotizId)) {
				// Guardar de nuevo crea OTRA oferta en SAP: se pide confirmacion para evitar duplicados por doble clic.
				const i18n = this.i18n();
				MessageBox.confirm(i18n.getText("guardarOtraVez", [previas.map((o) => o.numero).join(", ")]) as string, {
					actions: [i18n.getText("guardarOtraVezSi") as string, MessageBox.Action.CANCEL],
					emphasizedAction: MessageBox.Action.CANCEL,
					onClose: (accion: string) => {
						if (accion === i18n.getText("guardarOtraVezSi")) {
							void this.guardarEnSap();
						}
					}
				});
				return;
			}
			await this.guardarEnSap();
			return;
		}
		this.guardarSimulado();
	}

	/** Despues de guardar, vuelve a leer las posiciones del documento SAP: asi aparecen los regalos que SAP agrega solo. */
	private async refrescarLineasDesdeSap(odata: ODataModel, numeros: string[]): Promise<void> {
		try {
			const detalles = await Promise.all(numeros.map((n) => cargarDetalleOferta(odata, n)));
			const oferta = this.modeloOferta();
			oferta.setProperty("/lineas", detalles.flatMap((d) => d.lineas.map((l) => ({ ...l }))));
			this.recalcular();
			this.instantanea = JSON.stringify(oferta.getProperty("/lineas") ?? []);
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
		}
	}

	/**
	 * Entrega que viaja a SAP: con envio, el destinatario WE (la direccion elegida) y el transportista: ZT con su numero de cliente o, si solo
	 * es proveedor, SP con su numero de proveedor. Con recojo solo el tipo.
	 */
	private entregaParaGuardar(cliente: Cliente): { datos?: EntregaParaGuardar; error?: string } {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		if (oferta.getProperty("/entrega") !== "envio") {
			return { datos: oferta.getProperty("/entrega") === "recojo" ? { tipo: "02" } : undefined };
		}
		const datos: EntregaParaGuardar = { tipo: "01" };
		const id = oferta.getProperty("/entregaDatos/direccionId") as string;
		if (id === "__unica__") {
			const calle = String(oferta.getProperty("/entregaDatos/direccionUnica") ?? "").trim();
			if (!calle) {
				return { error: i18n.getText("guardarEnvioSinDireccion") as string };
			}
			datos.kunnrWe = cliente.kunnr;
			datos.addrnumberWe = ENVIO_UNICO;
			datos.direccionUnica = { nombre: cliente.nombre, calle };
		} else {
			const dir = ((oferta.getProperty("/cliente/direcciones") as Direccion[]) ?? []).find((x) => x.id === id);
			if (!dir?.addrnumber) {
				return { error: i18n.getText("guardarEnvioSinDireccion") as string };
			}
			datos.kunnrWe = dir.kunn2 || cliente.kunnr;
			datos.addrnumberWe = dir.addrnumber;
		}
		const rol = oferta.getProperty("/entregaDatos/transportistaRol") as string;
		if (rol === "ZT") {
			datos.kunnrZt = (oferta.getProperty("/entregaDatos/transportistaKunnr") as string) || undefined;
			datos.addrnumberZt = (oferta.getProperty("/entregaDatos/sede") as string) || undefined;
		} else if (rol === "SP") {
			datos.lifnrSp = (oferta.getProperty("/entregaDatos/transportistaLifnr") as string) || undefined;
		}
		return { datos };
	}

	/** Total del grupo con impuestos cuando se conocen (lo que paga el cliente); si no, la suma de las lineas, que ya traen el IGV en el precio. */
	private totalDeGrupo(g: Grupo): number {
		return g.totalConImp ?? g.subtotal;
	}

	/** Arma lo que necesita el servicio a partir del carrito y llama a guardarCotizacion. */
	private async guardarEnSap(): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		// Los regalos se piden de nuevo con las cantidades finales: los Zeta viajan con la oferta (SAP no los agrega) y una oferta reabierta
		// trae los suyos como lineas leidas, sin el mecanismo con que se envian.
		await this.actualizarRegalos();
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const grupos = (oferta.getProperty("/grupos") as Grupo[]) ?? [];
		if (!cliente?.kunnr) {
			MessageBox.error(i18n.getText("guardarSinCliente") as string);
			return;
		}
		if (!oferta.getProperty("/perfil/vendedor")) {
			MessageBox.error(i18n.getText("vendIdRequerido") as string);
			return;
		}
		if (!oferta.getProperty("/perfil/formaPago")) {
			// Sin forma de pago no viaja Zterm y SAP usa la del maestro del cliente: el bloqueo (contado o credito) no se puede anticipar.
			MessageBox.error(i18n.getText("guardarSinFormaPago") as string);
			return;
		}
		if (grupos.length === 0 || grupos.every((g) => g.lineas.length === 0)) {
			MessageBox.error(i18n.getText("guardarSinLineas") as string);
			return;
		}
		// El cliente debe estar dado de alta en el area de ventas (organizacion, canal y sector) de cada grupo: si no, SAP rechaza toda la oferta.
		const grupoSinArea = grupos.find((g) => g.areaFalta);
		if (grupoSinArea) {
			MessageBox.error(i18n.getText("guardarAreaFalta", [grupoSinArea.titulo, grupoSinArea.areaAviso ?? ""]) as string);
			return;
		}
		const sinPrecio = ((oferta.getProperty("/lineas") as Linea[]) ?? []).filter((l) => l.sinPrecioVigente);
		if (sinPrecio.length) {
			MessageBox.error(i18n.getText("guardarSinPrecio", [sinPrecio.map((l) => l.material).join(", ")]) as string);
			return;
		}
		const entrega = this.entregaParaGuardar(cliente);
		if (entrega.error) {
			MessageBox.error(entrega.error);
			return;
		}
		const perfil = oferta.getProperty("/perfil") as Record<string, string>;
		const usuarioBtp = await correoUsuarioBtp();
		const datos: OfertaParaGuardar = {
			kunnr: cliente.kunnr,
			usuarioBtp,
			moneda: perfil.moneda || "PEN",
			// La forma de pago elegida en la pantalla viaja a SAP; antes el pedido heredaba la del maestro del cliente.
			zterm: perfil.formaPago || "",
			pernr: perfil.pernr || "",
			vsbed: this.condicionExpedicion(),
			entrega: entrega.datos,
			comentario: (oferta.getProperty("/entregaDatos/comentario") as string) ?? "",
			grupos: gruposParaGuardar(grupos, perfil, (centro) => almacenDeCentro(centro, this.modeloMock().getProperty("/opciones/almacenPorCentro") ?? {}, perfil.almacen, perfil.centro))
		};
		// Un centro que no esta asignado a la organizacion/canal hace que SAP rechace la oferta (visto con el 1103 en 1103/10).
		const centrosPorArea = (this.modeloMock().getProperty("/opciones/centrosPorArea") as Record<string, string[]>) ?? {};
		const centroMalo = datos.grupos.find((g) => g.lineas.some((l) => !centroValidoParaArea(centrosPorArea, g.vkorg, g.vtweg, l.centro)));
		if (centroMalo) {
			MessageBox.error(i18n.getText("guardarCentroInvalido", [perfil.centro, `${centroMalo.vkorg}/${centroMalo.vtweg}`]) as string);
			return;
		}
		// Los mensajes de errores anteriores (p. ej. un PIN mal escrito al identificarse) no son de este guardado: si se dejan, el motivo sale equivocado.
		quitarTodosLosMensajes();
		const vista = this.getView();
		vista?.setBusy(true);
		try {
			const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
			const resultado = await guardarCotizacion(odata, datos);
			const numeros = resultado.ofertas.map((o) => o.vbelnOferta);
			await this.refrescarLineasDesdeSap(odata, numeros);
			// Tras releer SAP los grupos pueden cambiar de sector (p. ej. canal 11 -> 99): el titulo se toma de ahi.
			const gruposSap = (oferta.getProperty("/grupos") as Grupo[]) ?? [];
			oferta.setProperty(
				"/ofertasGuardadas",
				grupos.map((g, i) => ({
					numero: numeros[i] ?? "",
					cotizId: resultado.cotizId,
					grupoNo: resultado.ofertas[i]?.grupoNo,
					titulo: gruposSap[i]?.titulo ?? g.titulo,
					lineas: g.lineas,
					modalidad: g.modalidad,
					clasePedido: g.clasePedido,
					// Con lo que devolvio SAP: tras releer la oferta las lineas quedan en neto y el subtotal no lleva el IGV.
					total: this.totalDeGrupo(gruposSap[i] ?? g),
					areaFalta: g.areaFalta
				}))
			);
			oferta.setProperty("/pedidos", []);
			oferta.setProperty("/vigencia", this.calcularVigencia(new Date().toISOString().slice(0, 10), false));
			oferta.setProperty("/guardado", { visible: true, texto: i18n.getText("guardadoOk", [numeros.join(", ")]) as string });
			oferta.setProperty("/historial/cotizId", resultado.cotizId);
			// Ya esta en SAP: el respaldo del navegador sobra.
			this.descartarRespaldo();
		} catch (error) {
			if (error instanceof OfertaEnProcesoError) {
				MessageBox.information(error.message);
			} else {
				MessageBox.error(i18n.getText("guardarError", [this.motivoDeError(error)]) as string);
			}
		} finally {
			vista?.setBusy(false);
		}
	}

	/**
	 * Motivo real de un error de OData. Cuando un $batch falla UI5 deja "HTTP request was not processed because $batch failed" y el
	 * motivo verdadero esta en la causa o en los mensajes del servicio; se muestran para no ocultar lo que dijo SAP.
	 */
	private motivoDeError(error: unknown): string {
		const e = error as Error & { cause?: Error };
		const partes = [e.cause?.message ?? ""];
		if (!partes[0] || e.message.includes("$batch failed")) {
			const mensajes = mensajesVigentes();
			partes.push(...mensajes.filter((m) => m.type === "Error" && m.message && !m.message.includes("$batch failed")).map((m) => m.message as string));
		}
		const unicos = [...new Set(partes.filter(Boolean))];
		return unicos.length ? unicos.join(" | ") : e.message;
	}

	/** SIMULADO: muestra cuantas ofertas saldrian, una por grupo, con numeros inventados. */
	private guardarSimulado(): void {
		const oferta = this.modeloOferta();
		const grupos = oferta.getProperty("/grupos") as Grupo[];
		const existente = oferta.getProperty("/numero") as string;
		const numeros = existente
			? grupos.map((_, i) => (i === 0 ? existente : `${existente}-${i + 1}`))
			: grupos.map((_, i) => String(4530 + i).padStart(7, "0"));
		oferta.setProperty(
			"/ofertasGuardadas",
			grupos.map((g, i) => ({ numero: numeros[i], titulo: g.titulo, lineas: g.lineas, modalidad: g.modalidad, clasePedido: g.clasePedido, total: this.totalDeGrupo(g), areaFalta: g.areaFalta }))
		);
		oferta.setProperty("/pedidos", []);
		const texto = this.i18n().getText(existente ? "guardadoActualizada" : "guardadoOk", [existente ? existente : numeros.join(", ")]) as string;
		// Como en SAP: al crear o modificar, el fin de validez se recalcula desde hoy (+ dias del perfil); renovar = modificar y guardar.
		oferta.setProperty("/vigencia", this.calcularVigencia(new Date().toISOString().slice(0, 10), false));
		oferta.setProperty("/guardado", {
			visible: true,
			texto: `${texto} (${this.i18n().getText("simulacion")})`
		});
	}


	/* ---------- Impresion: PDF oficial de SAP (formulario ZFRSD_COTIVTA) o, sin oferta grabada, vista previa del borrador ---------- */

	private esc(t: unknown): string {
		return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	/** Vista previa del borrador (oferta aun no grabada en SAP): un documento por grupo, cada uno en su propia pagina al imprimir. */
	private armarHtmlOferta(): string {
		const oferta = this.modeloOferta();
		const mock = this.modeloMock();
		const i18n = this.i18n();
		const e = (t: unknown): string => this.esc(t);
		const m = (n: number): string => this.formatMonto(n);
		const grupos = (oferta.getProperty("/grupos") as Grupo[]) ?? [];
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const empresa = mock.getProperty("/empresa") as { razon: string; ruc: string; direccion: string; telefono: string };
		const bancos = (mock.getProperty("/cuentasBancarias") as { banco: string; moneda: string; cuenta: string; cci: string }[]) ?? [];
		const perfil = oferta.getProperty("/perfil") as Record<string, string>;
		const formas = (oferta.getProperty("/formasPago") as { key: string; text: string }[]) ?? [];
		const ed = oferta.getProperty("/entregaDatos") as Record<string, string>;
		const envio = oferta.getProperty("/entrega") === "envio";
		const numero = (oferta.getProperty("/numero") as string) || (i18n.getText("impresionBorrador") as string);
		const vigencia = (oferta.getProperty("/vigencia/texto") as string) ?? "";
		const fecha = new Date().toLocaleDateString("es-PE");
		const modalidades = oferta.getProperty("/modalidades") as Modalidad[];
		const estilo = "font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#222;";
		const tabla = "width:100%;border-collapse:collapse;margin-top:6px;";
		const th = "border-bottom:2px solid #444;text-align:left;padding:4px;";
		const td = "border-bottom:1px solid #ddd;padding:4px;";
		const der = "text-align:right;";
		const paginas = grupos.map((g, idx) => {
			const filas = g.lineas
				.map(
					(l) =>
						`<tr><td style="${td}">${e(l.bonificacion ? "" : l.material)}</td><td style="${td}">${e(l.denominacion)}${l.bonificacion && l.talla ? ` (${i18n.getText("impresionTalla")} ${e(l.talla)})` : ""}</td><td style="${td}">${e(l.detalle)}</td><td style="${td}${der}">${l.cantidad}</td><td style="${td}${der}">${l.bonificacion ? e(i18n.getText("impresionRegalo")) : m(l.precio)}</td><td style="${td}${der}">${l.bonificacion ? "\u2014" : m(l.total)}</td></tr>`
				)
				.join("");
			const isc = this.redondear(g.lineas.reduce((acc, l) => acc + l.total - l.total / (1 + (l.iscPct ?? 0) / 100), 0));
			const neto = this.redondear(g.subtotal - isc);
			const igvG = g.lineas.every((l) => l.impuesto !== undefined) ? this.redondear(g.lineas.reduce((acc, l) => acc + (l.impuesto ?? 0), 0)) : 0;
			const mod = modalidades.find((x) => x.key === g.modalidad);
			const dirEnvio = envio ? ed.direccionEnvio : (i18n.getText("recojoTexto") as string);
			const transportista = envio && ed.transportistaTexto ? `${ed.transportistaTexto}${ed.sede ? ` \u00b7 ${ed.sedeDireccion}` : ""}` : "\u2014";
			const num = grupos.length > 1 ? `${numero}-${idx + 1}` : numero;
			return `<div style="${estilo}${idx > 0 ? "page-break-before:always;margin-top:24px;" : ""}">
<table style="width:100%"><tr><td><b style="font-size:15px">${e(empresa.razon)}</b><br/>${e(empresa.ruc)}<br/>${e(empresa.direccion)}<br/>${e(empresa.telefono)}</td>
<td style="text-align:right"><b style="font-size:14px">${e(i18n.getText("impresionOferta"))} N\u00b0 ${e(num)}</b><br/>${e(i18n.getText("impresionFecha"))}: ${e(fecha)}<br/>${e(i18n.getText("hdrVigencia"))}: ${e(vigencia)}</td></tr></table>
<hr/>
<table style="width:100%"><tr><td style="vertical-align:top;width:50%"><b>${e(i18n.getText("hdrCliente"))}</b><br/>${e(cliente?.nombre ?? "")}<br/>${e(cliente?.tipoDoc ?? "")} ${e(cliente?.doc ?? "")}<br/>${e(i18n.getText("direccionFactura"))}: ${e(cliente?.direccion ?? "")}</td>
<td style="vertical-align:top"><b>${e(i18n.getText("secEntrega"))}</b><br/>${e(envio ? i18n.getText("entregaEnvio") : i18n.getText("entregaRecojo"))}: ${e(dirEnvio)}<br/>${e(i18n.getText("transportista"))}: ${e(transportista)}</td></tr>
<tr><td style="vertical-align:top;padding-top:6px">${e(i18n.getText("vendedor"))}: ${e(perfil.vendedor)}<br/>${e(i18n.getText("formaPago"))}: ${e(formas.find((f) => f.key === perfil.formaPago)?.text ?? "")}</td>
<td style="vertical-align:top;padding-top:6px">${e(i18n.getText("tipoCambio"))}: ${e(perfil.tipoCambio)}<br/>${e(i18n.getText("modalidad"))}: ${e(mod?.texto ?? "")}</td></tr></table>
<table style="${tabla}"><thead><tr><th style="${th}">${e(i18n.getText("colMaterial"))}</th><th style="${th}">${e(i18n.getText("colDescripcion"))}</th><th style="${th}">${e(i18n.getText("colDetalle"))}</th><th style="${th}${der}">${e(i18n.getText("colCantidad"))}</th><th style="${th}${der}">${e(i18n.getText("colPrecio"))} (${e(perfil.moneda || "PEN")})</th><th style="${th}${der}">${e(i18n.getText("colTotalLinea"))}</th></tr></thead><tbody>${filas}</tbody></table>
<table style="width:40%;margin-left:60%;margin-top:8px"><tr><td>${e(i18n.getText("valorNeto"))}</td><td style="${der}">${m(neto)}</td></tr>${isc > 0 ? `<tr><td>${e(i18n.getText("iscIncluido"))}</td><td style="${der}">${m(isc)}</td></tr>` : ""}<tr><td>${e(i18n.getText("igv"))}</td><td style="${der}">${m(igvG)}</td></tr><tr><td><b>${e(i18n.getText("totalOferta"))}</b></td><td style="${der}"><b>${e(perfil.moneda || "PEN")} ${m(g.subtotal + igvG)}</b></td></tr></table>
${ed.comentario ? `<p><b>${e(i18n.getText("impresionObs"))}:</b> ${e(ed.comentario)}</p>` : ""}
<p style="margin-top:14px"><b>${e(i18n.getText("impresionCuentas"))}</b></p>
<table style="${tabla}">${bancos.map((b) => `<tr><td style="${td}">${e(b.banco)} (${e(b.moneda)})</td><td style="${td}">${e(b.cuenta)}</td><td style="${td}">CCI ${e(b.cci)}</td></tr>`).join("")}</table>
<p style="color:#777;margin-top:14px">${e(i18n.getText("impresionLegal"))}</p></div>`;
		});
		return `<div>${paginas.join("")}</div>`;
	}

	public async onVistaOferta(): Promise<void> {
		// Oferta grabada en SAP: el formato oficial lo genera SAP. El borrador sigue con la vista previa.
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		const numeros = numerosParaImprimir((oferta.getProperty("/ofertasGuardadas") as OfertaGuardada[]) ?? [], String(oferta.getProperty("/numero") ?? ""));
		if (this.usarOData() && odata && numeros.length > 0 && (await pdfPublicado(odata))) {
			await this.abrirPdfsSap(odata, numeros);
			return;
		}
		await this.abrirVistaHtml(this.armarHtmlOferta(), this.i18n().getText("impresionNota") as string);
	}

	/** Dialogo de vista previa con su boton Imprimir: borrador de la oferta o formato de vehiculos. */
	private async abrirVistaHtml(html: string, nota: string): Promise<void> {
		if (!this.dialogoVistaOferta) {
			this.dialogoVistaOferta = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.VistaOferta",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoVistaOferta);
			this.dialogoVistaOferta.setModel(new JSONModel(), "print");
		}
		(this.dialogoVistaOferta.getModel("print") as JSONModel).setData({ html, nota });
		this.dialogoVistaOferta.open();
	}

	public onCerrarVistaOferta(): void {
		this.dialogoVistaOferta?.close();
	}

	/** PDF de cada oferta grabada, generado por SAP con su formulario; se abre en otra pestana para imprimirlo o guardarlo. */
	private async abrirPdfsSap(odata: ODataModel, numeros: string[]): Promise<void> {
		if (!this.dialogoImprimirSap) {
			this.dialogoImprimirSap = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.ImprimirSap",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoImprimirSap);
			this.dialogoImprimirSap.setModel(new JSONModel(), "pdf");
		}
		this.urlsPdf.forEach((url) => URL.revokeObjectURL(url));
		this.urlsPdf = [];
		const modelo = this.dialogoImprimirSap.getModel("pdf") as JSONModel;
		const i18n = this.i18n();
		modelo.setData({ cargando: true, filas: [] });
		this.dialogoImprimirSap.open();
		const filas: { titulo: string; url: string; nombre: string; html: string; error: string }[] = [];
		const conFormatoVehiculo = await impresionPublicada(odata);
		for (const numero of numeros) {
			const titulo = i18n.getText("impresionSapOferta", [numero]) as string;
			try {
				// Vehiculos: formato simple de Socopur con los datos de SAP; lo demas, el PDF del formulario de SAP.
				const impresion = conFormatoVehiculo ? await leerImpresion(odata, numero) : { tipo: "R" as const };
				if (impresion.tipo === "V" && impresion.datos) {
					filas.push({ titulo, url: "", nombre: "", html: htmlVehiculo(impresion.datos, this.textosVehiculo(), this.urlLogo()), error: "" });
					continue;
				}
				const pdf = await leerPdfOferta(odata, numero);
				const url = URL.createObjectURL(new Blob([pdf.bytes], { type: "application/pdf" }));
				this.urlsPdf.push(url);
				filas.push({ titulo, url, nombre: pdf.nombre, html: "", error: "" });
			} catch (error) {
				filas.push({ titulo, url: "", nombre: "", html: "", error: this.motivoDeError(error) });
			}
		}
		modelo.setData({ cargando: false, filas });
	}

	public onAbrirPdfSap(evento: Event): void {
		const url = (evento.getSource() as Button).getBindingContext("pdf")?.getProperty("url") as string | undefined;
		if (url) {
			window.open(url, "_blank");
		}
	}

	/** Descarga con el nombre de la oferta: guardado desde el visor, el archivo tomaria el codigo de la direccion blob. */
	public onDescargarPdfSap(evento: Event): void {
		const contexto = (evento.getSource() as Button).getBindingContext("pdf");
		const url = contexto?.getProperty("url") as string | undefined;
		if (!url) {
			return;
		}
		const enlace = document.createElement("a");
		enlace.href = url;
		enlace.download = (contexto?.getProperty("nombre") as string) || "Oferta.pdf";
		document.body.appendChild(enlace);
		enlace.click();
		enlace.remove();
	}

	public async onVerFormatoVehiculo(evento: Event): Promise<void> {
		const html = (evento.getSource() as Button).getBindingContext("pdf")?.getProperty("html") as string | undefined;
		if (html) {
			await this.abrirVistaHtml(html, this.i18n().getText("impVehNota") as string);
		}
	}

	/** Logo del formato (el de los documentos de Socopur), con direccion absoluta: el marco de impresion no hereda la ruta de la app. */
	private urlLogo(): string {
		return new URL(sap.ui.require.toUrl("com/socopur/cotizador/img/logo-scp.png"), document.baseURI).href;
	}

	private textosVehiculo(): TextosVehiculo {
		const i18n = this.i18n();
		const claves = ["caracteristicas", "valorVenta", "isc", "igv", "precioVenta", "tipoCambio", "cuentas", "banco", "cuentaSoles", "cuentaDolares", "dirFiscal", "dirEmision", "telefono", "nroOferta", "fechaOferta", "validoHasta", "cliente", "documento", "correo", "celular", "dirFactura", "dirLlegada", "vendedor", "tienda", "condicionPago", "moneda", "transportista", "codigo", "descripcion", "marca", "unidad", "cantidad", "observacion", "legal", "privacidad"];
		return Object.fromEntries(claves.map((c) => [c, i18n.getText(`impVeh_${c}`) as string]));
	}

	public onCerrarImprimirSap(): void {
		this.dialogoImprimirSap?.close();
	}

	/** Imprime en un marco oculto (sin ventanas emergentes); el navegador permite "Guardar como PDF". */
	public onImprimirAhora(): void {
		const html = (this.dialogoVistaOferta?.getModel("print") as JSONModel).getProperty("/html") as string;
		const marco = document.createElement("iframe");
		marco.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
		document.body.appendChild(marco);
		const doc = marco.contentWindow?.document;
		if (!doc) {
			return;
		}
		doc.open();
		doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.esc(this.i18n().getText("impresionOferta"))}</title></head><body>${html}</body></html>`);
		doc.close();
		marco.contentWindow?.focus();
		// El logo del formato de vehiculos debe estar cargado antes de imprimir, o sale en blanco.
		const imagenes = Array.from(doc.images).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((listo) => { img.onload = () => listo(); img.onerror = () => listo(); })));
		void Promise.all(imagenes).then(() => {
			setTimeout(() => {
				marco.contentWindow?.print();
				setTimeout(() => marco.remove(), 2000);
			}, 300);
		});
	}

	/** Vigencia de la oferta: fecha + dias del perfil (en SAP ZTSD_CONFIG_OFER campo 01 = 7 dias). */
	private calcularVigencia(fechaIso: string, bloqueada: boolean): Record<string, unknown> {
		const i18n = this.i18n();
		const dias = Number(this.modeloMock().getProperty("/perfil/vigenciaDias")) || 7;
		const vence = new Date(fechaIso);
		vence.setDate(vence.getDate() + dias);
		const hoy = new Date(new Date().toISOString().slice(0, 10));
		const restan = Math.round((vence.getTime() - hoy.getTime()) / 86400000);
		const fecha = vence.toISOString().slice(0, 10).split("-").reverse().join("/");
		if (bloqueada) {
			return { nueva: false, vencida: false, texto: i18n.getText("vigenciaPedido") as string, estado: "None", hasta: "" };
		}
		const vencida = restan < 0;
		return {
			nueva: false,
			vencida,
			hasta: fecha,
			estado: vencida ? "Error" : restan <= 2 ? "Warning" : "Success",
			texto: vencida ? (i18n.getText("vigenciaVencida", [fecha]) as string) : (i18n.getText("vigenciaHasta", [fecha, restan]) as string)
		};
	}

	/**
	 * Con ?odata=1 y una oferta real renueva en SAP (accion renovar: extiende la validez de la cabecera, no toca las posiciones y se
	 * omite si la oferta ya tiene pedido). En cualquier otro caso sigue simulado.
	 */
	public async onRenovar(): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const numero = String(oferta.getProperty("/numero") ?? "");
		const cab = (this.modeloMock().getProperty("/ofertas") as { numero: string; cotizId?: string }[] | undefined)?.find((o) => o.numero === numero);
		if (!this.usarOData() || !cab?.cotizId || !/^\d{10}$/.test(numero)) {
			oferta.setProperty("/vigencia", this.calcularVigencia(new Date().toISOString().slice(0, 10), false));
			MessageToast.show(`${i18n.getText("vigenciaRenovada")} (${i18n.getText("simulacion")})`);
			return;
		}
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
		const vista = this.getView();
		vista?.setBusy(true);
		try {
			const r = await renovarCotizacion(odata, cab.cotizId, await correoUsuarioBtp());
			if (r.error) {
				MessageBox.error(r.error);
				return;
			}
			const hasta = r.grupos.find((g) => g.vbelnOferta === numero)?.vigenciaHasta;
			if (hasta) {
				oferta.setProperty("/vigencia", this.vigenciaDesdeFechaHasta(hasta));
			}
			MessageToast.show(i18n.getText("vigenciaRenovada") as string);
		} catch (error) {
			MessageBox.error((error as Error).message);
		} finally {
			vista?.setBusy(false);
		}
	}

	/** Vigencia para mostrar a partir de la fecha de fin que devuelve SAP (aaaa-mm-dd). */
	private vigenciaDesdeFechaHasta(isoHasta: string): Record<string, unknown> {
		const i18n = this.i18n();
		const vence = new Date(isoHasta.slice(0, 10));
		const hoy = new Date(new Date().toISOString().slice(0, 10));
		const restan = Math.round((vence.getTime() - hoy.getTime()) / 86400000);
		const fecha = vence.toISOString().slice(0, 10).split("-").reverse().join("/");
		const vencida = restan < 0;
		return {
			nueva: false,
			vencida,
			hasta: fecha,
			estado: vencida ? "Error" : restan <= 2 ? "Warning" : "Success",
			texto: vencida ? (i18n.getText("vigenciaVencida", [fecha]) as string) : (i18n.getText("vigenciaHasta", [fecha, restan]) as string)
		};
	}

	/** Clonar: abre una oferta nueva con el mismo cliente y las mismas lineas (regalos recalculados). */
	public onClonar(): void {
		const oferta = this.modeloOferta();
		const lineas = ((oferta.getProperty("/lineas") as Linea[]) ?? []).filter((l) => !l.bonificacion).map((l) => ({ ...l, uid: undefined, origen: undefined }));
		this.modeloMock().setProperty("/clonacion", { cliente: oferta.getProperty("/cliente"), lineas: JSON.parse(JSON.stringify(lineas)) });
		this.router.navTo("nueva");
	}

	/**
	 * Cliente armado solo con lo que trae hoy el servicio de cotizaciones (nombre y documento).
	 * El resto de la ficha (condicion, credito, direcciones, estado de cuenta, areas de venta) necesita
	 * consultas propias al backend que todavia no existen; por eso queda en blanco.
	 */
	private clienteBasico(cabecera: { doc: string; cliente?: string; cotizId?: string }): Cliente | null {
		if (!cabecera.cotizId || !cabecera.cliente) {
			return null;
		}
		const doc = cabecera.doc ?? "";
		return {
			doc,
			tipoDoc: doc.length === 11 ? "RUC" : doc.length === 8 ? "DNI" : "",
			nombre: cabecera.cliente,
			estado: "",
			estadoState: "None",
			condicion: "",
			grupo: "",
			telefono: "",
			correo: "",
			direccion: ""
		};
	}

	/** Carga cabecera y posiciones del documento SAP (solo con ?odata=1, que es cuando la lista trae ofertas reales). */
	private async cargarDetalleReal(numeroOferta: string): Promise<void> {
		const componente = this.getOwnerComponent() as UIComponent;
		const odata = componente.getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		try {
			const detalle = await cargarDetalleOferta(odata, numeroOferta);
			const oferta = this.modeloOferta();
			const clienteActual = oferta.getProperty("/cliente") as Cliente | null;
			if (clienteActual) {
				oferta.setProperty("/cliente", { ...clienteActual, nombre: detalle.cliente || clienteActual.nombre });
			} else {
				oferta.setProperty("/cliente", { kunnr: detalle.kunnr, doc: "", tipoDoc: "", nombre: detalle.cliente, estado: "", estadoState: "None", condicion: "", grupo: "", telefono: "", correo: "", direccion: "" });
			}
			oferta.setProperty(
				"/lineas",
				detalle.lineas.map((l) => ({ ...l, condiciones: l.condicionesSap ? filasDeCondiciones(l.condicionesSap, this.verTodasCondiciones()) : undefined }))
			);
			this.recalcular();
			this.instantanea = JSON.stringify(oferta.getProperty("/lineas") ?? []);
			// Rechazada en SAP (por el flujo de anulacion o a mano): solo lectura y sin Copiar a pedido.
			if (detalle.rechazada && ((oferta.getProperty("/pedidos") as unknown[]) ?? []).length === 0) {
				this.marcarOfertaAnulada(numeroOferta);
			}
			await this.completarClienteDeDocumento(detalle.kunnr);
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
		}
	}

	/** Con ?odata=1 reemplaza las modalidades de ejemplo por las de SAP (YCOTIZ_MODAL); si falla, deja las de ejemplo. */
	private async sincronizarModalidades(mock: JSONModel): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		try {
			const reales = await cargarModalidades(odata, (mock.getProperty("/modalidades") as ModalidadPantalla[]) ?? []);
			if (reales.length > 0) {
				mock.setProperty("/modalidades", reales);
			}
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataModalidadesError", [(error as Error).message]) as string);
		}
	}

	/**
	 * Con ?odata=1 reemplaza la lista fija de formas de pago por la de SAP. Siempre deja disponible la del perfil del vendedor aunque SAP no la liste
	 * (para que el desplegable no cambie solo de valor). Si el servicio aun no publica la entidad, queda la lista de antes.
	 */
	/**
	 * Tipo de cambio de la cabecera: el de SAP (tipo M, lo mantiene Tesoreria), el mismo con el que SAP calcula el precio en soles.
	 * Si el servicio aun no lo publica o SAP no lo tiene, queda el del perfil.
	 */
	private async sincronizarTipoCambio(): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata || !(await tipoCambioPublicado(odata))) {
			return;
		}
		try {
			const tc = await leerTipoCambio(odata);
			const texto = tipoCambioTexto(tc.cambio);
			const nota = this.i18n().getText("tipoCambioSap", [fechaDdMmAaaa(tc.desde)]) as string;
			// En el perfil base tambien la nota: al recuperar un respaldo el perfil de la oferta se arma desde este (pruebas del 29/10/2026).
			this.modeloMock().setProperty("/perfil/tipoCambio", texto);
			this.modeloMock().setProperty("/perfil/tipoCambioNota", nota);
			const oferta = this.modeloOferta();
			oferta.setProperty("/perfil/tipoCambio", texto);
			oferta.setProperty("/perfil/tipoCambioNota", nota);
		} catch (error) {
			console.warn(`[Cotizador] tipo de cambio de SAP: ${(error as Error).message}`);
		}
	}

	private async sincronizarFormasPago(): Promise<void> {
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!odata) {
			return;
		}
		const opciones = await cargarFormasPago(odata);
		if (!opciones) {
			return;
		}
		const oferta = this.modeloOferta();
		const actual = String(oferta.getProperty("/perfil/formaPago") ?? "");
		const lista: { key: string; text: string }[] = opciones.map((o) => ({ key: o.key, text: o.text }));
		if (actual && !lista.some((o) => o.key === actual)) {
			lista.push({ key: actual, text: actual });
		}
		oferta.setProperty("/formasPago", lista);
	}

	private cargar(numero?: string): void {
		const mock = this.modeloMock();
		mock.dataLoaded().then(async () => {
			if (this.usarOData()) {
				await this.sincronizarModalidades(mock);
			}
			let clonada = false;
			const oferta = this.modeloOferta();
			oferta.setData(this.crearOferta());
			if (this.usarOData()) {
				const canalInicial = String(mock.getProperty("/perfil/canal") ?? "11");
				await this.sincronizarCatalogosArea(canalInicial);
				oferta.setProperty("/opcionesCentro", this.centrosDe(canalInicial));
				await this.sincronizarFormasPago();
				await this.sincronizarTipoCambio();
			}
			this.refrescarListasSede();
			if (numero) {
				const cabecera = (mock.getProperty("/ofertas") as { numero: string; doc: string; cliente?: string; cotizId?: string; estado?: string }[]).find(
					(o) => o.numero === numero || o.cotizId === numero
				);
				// Oferta real aun sin numero SAP: no se muestra el UUID como si fuera el numero.
				const esperaNumero = cabecera?.cotizId === numero && !cabecera?.numero;
				const detalle = mock.getProperty(`/detalles/${numero}`) as
					| { doc: string; lineas: LineaMock[] }
					| undefined;
				oferta.setProperty("/titulo", esperaNumero ? this.i18n().getText("ofertaSinNumero") : this.i18n().getText("ofertaTitulo", [numero]));
				oferta.setProperty("/numero", esperaNumero ? "" : numero);
				// Oferta real (lista leida del servicio) con numero SAP: el detalle se carga del documento SAP.
				const numeroSap = cabecera?.numero || numero;
				// Historial de SAP (quien cambio que): solo para ofertas reales, que tienen cotizacion.
				oferta.setProperty("/historial/cotizId", this.usarOData() ? (cabecera?.cotizId ?? "") : "");
				// Una oferta con pedido o ya anulada no se ofrece de nuevo para copiar a pedido.
				const sinPedido = cabecera?.estado !== this.i18n().getText("estadoPedido") && cabecera?.estado !== this.i18n().getText("estadoAnulada");
				if (this.usarOData() && /^\d{10}$/.test(numeroSap)) {
					// Con el detalle ya leido, una oferta sin pedido queda lista para Copiar a pedido (antes solo pasaba tras guardar en esta pantalla).
					void this.cargarDetalleReal(numeroSap)
						.then(() => (cabecera?.cotizId ? this.restaurarDatosGuardados(cabecera.cotizId, numeroSap) : undefined))
						.then(() => (sinPedido && cabecera?.cotizId ? this.prepararPedidoDeOfertaAbierta(cabecera.cotizId, numeroSap) : undefined));
				}
				if (detalle) {
					const clientes = mock.getProperty("/clientes") as Record<string, Cliente>;
					oferta.setProperty("/cliente", clientes[detalle.doc] ?? null);
					oferta.setProperty("/lineas", detalle.lineas.map((l) => ({ ...l, total: l.cantidad * l.precio })));
				} else if (cabecera) {
					const clientes = mock.getProperty("/clientes") as Record<string, Cliente>;
					oferta.setProperty("/cliente", clientes[cabecera.doc] ?? this.clienteBasico(cabecera));
				}
			}
			const i18n = this.i18n();
			if (numero) {
				const cab = (mock.getProperty("/ofertas") as { numero: string; fecha: string; estado: string; cotizId?: string }[]).find((o) => o.numero === numero || o.cotizId === numero);
				const conPedido = cab?.estado === i18n.getText("estadoPedido");
				const anulada = cab?.estado === i18n.getText("estadoAnulada");
				if (anulada && this.usarOData() && cab?.cotizId) {
					// Anulada: se lee el grupo para mostrar el pedido anulado en su pestana (cargarPedidoReal ya sabe marcarlo).
					void this.cargarPedidoReal(cab.cotizId, cab.numero);
				} else if (conPedido && this.usarOData() && cab?.cotizId) {
					void this.cargarPedidoReal(cab.cotizId, cab.numero);
				} else if (conPedido) {
					// Oferta con pedido: solo lectura (se usa el mismo bloqueo que tras crear el pedido)
					oferta.setProperty("/pedidos", [{ numero: "1300001480", oferta: numero, detalle: "\u2014", vin: "\u2014", bloqueo: "\u2014", clasePedido: "", estado: i18n.getText("pedidoLiberado"), estadoState: "Success", liberacion: "\u2014", liberacionState: "None" }]);
				}
				oferta.setProperty("/vigencia", this.calcularVigencia(cab?.fecha ?? new Date().toISOString().slice(0, 10), conPedido));
			} else {
				oferta.setProperty("/vigencia", { nueva: true, vencida: false, texto: i18n.getText("vigenciaNueva", [Number(mock.getProperty("/perfil/vigenciaDias")) || 7]), estado: "None", hasta: "" });
				const clon = mock.getProperty("/clonacion") as { cliente: Cliente | null; lineas: Linea[] } | null;
				if (clon) {
					mock.setProperty("/clonacion", null);
					oferta.setProperty("/cliente", clon.cliente);
					const nuevas: Linea[] = [];
					const vehiculos = mock.getProperty("/catalogo/vehiculos") as Vehiculo[];
					clon.lineas.forEach((l) => {
						l.uid = `L${(this.contadorLinea += 1)}`;
						nuevas.push(l);
						const moto = vehiculos.find((x) => x.material === l.material);
						if (moto) {
							this.agregarBonificaciones(nuevas, l.uid, moto);
						}
					});
					oferta.setProperty("/lineas", nuevas);
					this.aplicarDireccionEnvio();
					clonada = true;
				}
			}
			this.recalcular();
			// Punto de partida para saber si el usuario cambio algo (aviso al salir).
			this.instantanea = clonada ? "[]" : JSON.stringify(oferta.getProperty("/lineas") ?? []);
			if (!numero && !clonada) {
				this.ofrecerRespaldo();
			}
			if (clonada) {
				MessageToast.show(i18n.getText("clonada") as string);
			}
		});
	}

	private crearOferta(): Record<string, unknown> {
		const mock = this.modeloMock();
		return {
			vigencia: { nueva: true, vencida: false, texto: "", estado: "None", hasta: "" },
			titulo: this.i18n().getText("ofertaNueva") as string,
			numero: "",
			cliente: null,
			clienteNoEncontrado: false,
			altaAbierta: false,
			alta: {},
			ubigeo: [],
			tiposCliente: [],
			fechaEntrega: new Date().toISOString().slice(0, 10),
			entrega: "recojo",
			entregaDatos: { direccionId: "", direccionEnvio: "", direccionUnica: "", facturaId: "", direccionFactura: "", transportista: "", transportistaTexto: "", transportistaRol: "", transportistaKunnr: "", transportistaLifnr: "", sede: "", sedeDireccion: "", comentario: "" },
			transp: { texto: "", filas: [], pagina: 1, tamano: "10", total: 0, paginas: 1, cargando: false, cargado: false, error: "" },
			opcionesDireccion: [],
			opcionesFactura: [],
			modalidades: mock.getProperty("/modalidades") ?? [],
			modalidadesGrupo: {},
			formasPago: mock.getProperty("/formasPago") ?? [],
			// Elementos de precio: por defecto todos, como la pantalla de SAP (con los de valor cero).
			filtroCondiciones: "todos",
			verTodasCondiciones: true,
			// Copias: cambiar canal, centro u oficina en una oferta no debe modificar el perfil del vendedor ni el catalogo compartido.
			perfil: JSON.parse(JSON.stringify(mock.getProperty("/perfil") ?? {})) as Record<string, unknown>,
			opciones: { ...((mock.getProperty("/opciones") as Record<string, unknown>) ?? {}) },
			oficinasSede: [],
			avisoPerfil: "",
			opcionesCentro: this.centrosDe(String(mock.getProperty("/perfil/canal") ?? "11")),
			materialElegido: null,
			elegidosLista: [],
			solpeds: [],
			ofertasGuardadas: [],
			pedidos: [],
			lineas: [],
			grupos: [],
			cantidadOfertas: 0,
			textoGenerar: "",
			faltaTalla: false,
			totales: { subtotal: 0, neto: 0, isc: 0, hayIsc: false, igv: 0, total: 0 },
			guardado: { visible: false, texto: "" },
			historial: { cotizId: "" }
		};
	}

	/** Agrupa las lineas por organizacion de ventas + sector y calcula los totales. */
	private recalcular(): void {
		const oferta = this.modeloOferta();
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		const mapa = new Map<string, Grupo>();
		lineas.forEach((linea) => {
			linea.unica = Number(linea.sector) < 50;
			const clave = `${linea.orgVentas}/${linea.sector}`;
			if (!mapa.has(clave)) {
				mapa.set(clave, {
					clave,
					titulo: `${linea.grupo} · ${this.i18n().getText("grupoOrg", [linea.orgVentas, linea.sector])}`,
					subtotal: 0,
					lineas: []
				});
			}
			const grupo = mapa.get(clave) as Grupo;
			linea.totalMostrado = linea.totalNeto ?? linea.total;
			grupo.lineas.push(linea);
			grupo.subtotal += linea.totalMostrado;
		});
		const grupos = Array.from(mapa.values());
		grupos.forEach((g) => this.aplicarModalidadGrupo(g));
		grupos.forEach((g) => {
			g.lineaPrecio = g.lineas.some((l) => l.verCondiciones && !l.bonificacion);
			g.verPrecio = g.lineaPrecio;
			const conImpuesto = g.lineas.length > 0 && g.lineas.every((l) => l.isc !== undefined && l.igvImporte !== undefined);
			g.isc = conImpuesto ? this.redondear(g.lineas.reduce((a, l) => a + (l.isc ?? 0), 0)) : undefined;
			g.igv = conImpuesto ? this.redondear(g.lineas.reduce((a, l) => a + (l.igvImporte ?? 0), 0)) : undefined;
			g.totalConImp = conImpuesto ? this.redondear(g.lineas.reduce((a, l) => a + (l.totalConImpuestos ?? l.total + (l.isc ?? 0) + (l.igvImporte ?? 0)), 0)) : undefined;
		});
		oferta.setProperty("/grupos", grupos);
		oferta.setProperty("/faltaTalla", lineas.some((l) => l.bonificacion && !l.sinTalla && !l.talla));
		oferta.setProperty("/hayCondiciones", lineas.some((l) => !l.bonificacion && (l.condiciones?.length ?? 0) > 0));
		oferta.setProperty("/hayVehiculos", grupos.some((g) => g.lineas.some((l) => l.unica)));
		oferta.setProperty("/cantidadOfertas", grupos.length);
		oferta.setProperty("/textoGenerar", grupos.length ? this.i18n().getText(grupos.length === 1 ? "generaraUnaOferta" : "generaraOfertas", [grupos.length]) : "");
		// IGV real de SAP (solo tras guardar); antes de guardar no se conoce y se muestra "—".
		const totales = totalesDeOferta(grupos.flatMap((g) => g.lineas));
		oferta.setProperty("/totales", {
			...totales,
			igvTxt: totales.igvConocido ? this.formatMonto(totales.igv) : "\u2014",
			iscEtq: this.i18n().getText(totales.desglose ? "isc" : "iscIncluido") as string,
			estimado: lineas.length > 0 && lineas.every((l) => l.impuestoEstimado),
			igvEtq: `${this.i18n().getText(igvExonerado(totales) ? "igvExonerado" : "igv") as string}${lineas.length > 0 && lineas.every((l) => l.impuestoEstimado) ? ` ${this.i18n().getText("estimado") as string}` : ""}`
		});
		if (oferta.getProperty("/cliente") && !oferta.getProperty("/entregaDatos/direccionId")) {
			this.aplicarDireccionEnvio();
		}
	}

	/** Texto corto con los filtros aplicados, para verlo aunque el panel este plegado. */
	private resumenFiltros(): string {
		const b = this.modeloBusqueda();
		const i18n = this.i18n();
		const partes: string[] = [];
		const texto = (campo: string, lista?: string): string => {
			const valor = String(b.getProperty(`/${campo}`) ?? "").trim();
			if (!valor || !lista) {
				return valor;
			}
			return ((b.getProperty(`/${lista}`) as { key: string; text: string }[]) ?? []).find((x) => x.key === valor)?.text ?? valor;
		};
		const etiquetas: [string, string, string?][] = [
			["linea", "filtroLinea", "lineas"],
			["clase", "filtroClase", "clases"],
			["familia", "filtroFamilia", "familias"],
			["sector", "filtroSector"],
			["marca", "filtroMarca"],
			["codigo", "filtroCodigo"],
			["descripcion", "filtroDescripcion"],
			["texto", "filtroTextoLargo"],
			["color", "filtroColor"],
			["anio", "filtroAnio"],
			["condicion", "filtroCondicion"]
		];
		etiquetas.forEach(([campo, clave, lista]) => {
			const v = texto(campo, lista);
			if (v) {
				partes.push(`${i18n.getText(clave)}: ${v}`);
			}
		});
		return partes.join(" \u00b7 ");
	}

	/**
	 * Organizacion de ventas donde se busca: la del perfil para su tipo. Un perfil de repuestos que busca vehiculos usa la org de vehiculos de su
	 * misma sede (1203 -> 1201). El mismo valor se muestra en el aviso de la busqueda y se usa en la consulta, para que nunca digan cosas distintas.
	 */
	private orgBusqueda(tipo: string): string {
		const mock = this.modeloMock();
		const propia = String(mock.getProperty(`/perfil/busqueda/orgs/${tipo}`) ?? "");
		if (tipo !== "vehiculos" || String(mock.getProperty("/perfil/busqueda/tipo") ?? "") === "vehiculos") {
			return propia || (tipo === "vehiculos" ? "1101" : "");
		}
		return orgVehiculosDe(String(mock.getProperty("/perfil/busqueda/orgs/repuestos") ?? "")) ?? (propia || "1101");
	}

	/** Almacen que usan los repuestos del perfil para el centro elegido (los vehiculos salen del almacen donde esta cada uno). */
	public formatAlmacenPerfil(centro: string, almacenPerfil: string): string {
		if (!centro) {
			return almacenPerfil || "";
		}
		return almacenDeCentro(centro, (this.modeloMock().getProperty("/opciones/almacenPorCentro") as Record<string, string>) ?? {}, almacenPerfil, centro);
	}

	private busquedaInicial(tipo: string, conDefectos: boolean): Record<string, unknown> {
		const mock = this.modeloMock();
		const defectos = conDefectos
			? ((mock.getProperty(`/perfil/busqueda/defectos/${tipo}`) as { linea?: string; clase?: string; familia?: string }) ?? {})
			: {};
		const org = this.orgBusqueda(tipo);
		const canal = mock.getProperty("/perfil/busqueda/canal") as string;
		const estado: Record<string, unknown> = {
			tipo,
			linea: defectos.linea ?? "",
			clase: defectos.clase ?? "",
			familia: defectos.familia ?? "",
			sector: "",
			marca: "",
			codigo: "",
			descripcion: "",
			texto: "",
			color: "",
			anio: "",
			condicion: "",
			soloStock: true,
			filtrosAbiertos: true,
			alcance: this.i18n().getText("alcanceBusqueda", [org, canal]) as string,
			faltaFiltro: false,
			resumen: "",
			buscado: false,
			// Valores iniciales de los indicadores: sin ellos, una franja con propiedad sin definir se mostraria antes de buscar.
			cargando: false,
			progreso: "",
			parcial: false,
			avisoVacio: "",
			motivoVacio: "",
			hayPrecioLista: this.listaDisponible === true,
			canalPerfil: canalDe(canal ?? ""),
			vehiculos: [],
			repuestos: [],
			elegido: null
		};
		Object.assign(estado, this.listas(tipo, estado.linea as string, estado.clase as string));
		return estado;
	}

	/** Listas en cascada Linea > Clase > Familia, sectores del tipo y marcas del catalogo. */
	private listas(tipo: string, linea: string, clase: string): Record<string, unknown> {
		const mock = this.modeloMock();
		const seg = mock.getProperty("/segmentos") as Segmentos;
		const todos: Opcion = { key: "", text: this.i18n().getText("todos") as string };
		const sectores = (mock.getProperty("/sectores") as Record<string, Opcion[]>)[tipo] ?? [];
		const repuestos = (mock.getProperty("/catalogo/repuestos") as Repuesto[]) ?? [];
		const marcas = Array.from(new Set(repuestos.map((r) => r.marca))).sort();
		return {
			lineas: [todos, ...(seg.lineas[tipo] ?? [])],
			clases: [todos, ...(seg.clases[linea] ?? [])],
			familias: [todos, ...(seg.familias[`${linea}-${clase}`] ?? [])],
			sectores: [todos, ...sectores],
			marcas: [todos, ...marcas.map((m) => ({ key: m, text: m }))]
		};
	}

	/** Al cambiar un segmento se vuelven a armar los hijos y se limpian los que ya no aplican. */
	private refrescarListas(): void {
		const b = this.modeloBusqueda();
		const tipo = b.getProperty("/tipo") as string;
		const linea = b.getProperty("/linea") as string;
		let clase = b.getProperty("/clase") as string;
		let familia = b.getProperty("/familia") as string;
		let listas = this.listas(tipo, linea, clase) as { clases: Opcion[]; familias: Opcion[] };
		if (!listas.clases.some((o) => o.key === clase)) {
			clase = "";
			listas = this.listas(tipo, linea, clase) as { clases: Opcion[]; familias: Opcion[] };
		}
		if (!listas.familias.some((o) => o.key === familia)) {
			familia = "";
		}
		Object.entries(listas).forEach(([k, v]) => b.setProperty(`/${k}`, v));
		b.setProperty("/clase", clase);
		b.setProperty("/familia", familia);
	}

	/* ---------- Respaldo local de la oferta nueva ---------- */

	/** Un respaldo por vendedor: en un equipo compartido cada vendedor recupera solo lo suyo. */
	private claveDeRespaldo(): string {
		return claveRespaldo(String(this.modeloMock()?.getProperty("/perfil/pernr") ?? ""));
	}

	/**
	 * Guarda en el navegador la oferta NUEVA que aun no esta en SAP (cliente, lineas y datos de entrega). Sin lineas no escribe ni borra:
	 * al entrar la pantalla arranca vacia y no debe pisar el respaldo que se va a ofrecer recuperar.
	 */
	private respaldar(): void {
		const oferta = this.modeloOferta();
		if (!oferta || !this.enOfertaNueva || this.esperandoRespaldo || oferta.getProperty("/numero") || oferta.getProperty("/guardado/visible")) {
			return;
		}
		const lineas = (oferta.getProperty("/lineas") as Linea[]) ?? [];
		if (lineas.length === 0 || ((oferta.getProperty("/pedidos") as unknown[]) ?? []).length > 0) {
			return;
		}
		const datos: DatosRespaldo = {
			cliente: oferta.getProperty("/cliente") ?? null,
			lineas,
			perfil: (oferta.getProperty("/perfil") as Record<string, unknown>) ?? {},
			entrega: String(oferta.getProperty("/entrega") ?? ""),
			entregaDatos: (oferta.getProperty("/entregaDatos") as Record<string, unknown>) ?? {},
			fechaEntrega: String(oferta.getProperty("/fechaEntrega") ?? ""),
			modalidadesGrupo: (oferta.getProperty("/modalidadesGrupo") as Record<string, unknown>) ?? {}
		};
		const huella = JSON.stringify(datos);
		if (huella !== this.ultimoRespaldo && guardarRespaldo(almacenDelNavegador(), this.claveDeRespaldo(), datos)) {
			this.ultimoRespaldo = huella;
		}
	}

	private descartarRespaldo(): void {
		borrarRespaldo(almacenDelNavegador(), this.claveDeRespaldo());
		this.ultimoRespaldo = "";
	}

	/** Al abrir una oferta nueva: si quedo una sin guardar en este navegador (se cerro, se corto la luz), se ofrece recuperarla. */
	private ofrecerRespaldo(): void {
		const respaldo = leerRespaldo(almacenDelNavegador(), this.claveDeRespaldo());
		if (!respaldo) {
			return;
		}
		const i18n = this.i18n();
		const cliente = (respaldo.cliente as Cliente | null)?.nombre || (i18n.getText("hdrSinCliente") as string);
		const cuando = new Date(respaldo.guardadoEn).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
		this.esperandoRespaldo = true;
		MessageBox.confirm(i18n.getText("respaldoTexto", [String(respaldo.lineas.length), cliente, cuando]) as string, {
			title: i18n.getText("respaldoTitulo") as string,
			actions: [i18n.getText("respaldoRecuperar") as string, i18n.getText("respaldoDescartar") as string],
			emphasizedAction: i18n.getText("respaldoRecuperar") as string,
			onClose: (accion: string | null) => {
				this.esperandoRespaldo = false;
				if (accion === i18n.getText("respaldoRecuperar")) {
					this.recuperarRespaldo(respaldo);
				} else if (accion === i18n.getText("respaldoDescartar")) {
					this.descartarRespaldo();
				}
			}
		});
	}

	/** Vuelve a poner cliente, lineas y entrega del respaldo; los precios se piden de nuevo a SAP porque pudieron cambiar. */
	private recuperarRespaldo(respaldo: Respaldo): void {
		const oferta = this.modeloOferta();
		const lineas = respaldo.lineas as Linea[];
		const cliente = (respaldo.cliente as Cliente | null) ?? null;
		this.contadorLinea = siguienteContador(lineas, this.contadorLinea);
		oferta.setProperty("/perfil", perfilRecuperado((this.modeloMock().getProperty("/perfil") as Record<string, unknown>) ?? {}, respaldo.perfil ?? {}));
		oferta.setProperty("/fechaEntrega", respaldo.fechaEntrega || oferta.getProperty("/fechaEntrega"));
		oferta.setProperty("/entrega", respaldo.entrega || oferta.getProperty("/entrega"));
		oferta.setProperty("/modalidadesGrupo", respaldo.modalidadesGrupo ?? {});
		oferta.setProperty("/cliente", cliente);
		oferta.setProperty("/lineas", lineas);
		if (cliente) {
			this.cargarAreasCliente();
			this.aplicarDireccionEnvio();
		}
		// Despues de aplicarDireccionEnvio, que limpia la eleccion: vuelve la entrega que el vendedor habia elegido.
		oferta.setProperty("/entregaDatos", { ...((oferta.getProperty("/entregaDatos") as Record<string, unknown>) ?? {}), ...respaldo.entregaDatos });
		this.recalcular();
		void this.repreciarLineasSap();
		if (cliente?.kunnr && this.usarOData()) {
			void this.cargarDatosCliente(cliente.kunnr, cliente.estado === "Bloqueado");
		}
		// Hay trabajo sin guardar: al salir se vuelve a preguntar.
		this.instantanea = "[]";
		MessageToast.show(this.i18n().getText("respaldoRecuperado", [String(lineas.length)]) as string);
	}

	/* ---------- Historial de cambios (YCOTIZ_LOG) ---------- */

	/** Quien (correo BTP), cuando y que cambio en la cotizacion, segun SAP. */
	public async onHistorial(): Promise<void> {
		const cotizId = this.modeloOferta().getProperty("/historial/cotizId") as string;
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined;
		if (!cotizId || !odata) {
			return;
		}
		if (!this.dialogoHistorial) {
			this.dialogoHistorial = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.Historial",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoHistorial);
			this.dialogoHistorial.setModel(new JSONModel(), "historial");
		}
		const modelo = this.dialogoHistorial.getModel("historial") as JSONModel;
		const i18n = this.i18n();
		const t = (clave: string, parametros?: string[]): string => i18n.getText(clave, parametros) as string;
		modelo.setData({ filas: [], cargando: true, aviso: "" });
		this.dialogoHistorial.open();
		if (!(await historialPublicado(odata))) {
			modelo.setData({ filas: [], cargando: false, aviso: t("historialNoPublicado") });
			return;
		}
		try {
			const filas = await leerHistorial(odata, cotizId);
			modelo.setData({
				cargando: false,
				aviso: "",
				filas: filas.map((f) => ({
					fecha: f.fecha ? new Date(f.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "medium" }) : "—",
					usuario: f.usuario || "—",
					usuarioNota: [f.conCorreo ? "" : t("historialSinCorreo"), f.vendedor ? t("historialVendedor", [f.vendedor]) : ""].filter(Boolean).join(" · "),
					operacion: textoOperacion(f.operacion, t),
					lugar: textoLugar(f, t),
					detalle: textoDetalle(f, t)
				}))
			});
		} catch (error) {
			modelo.setData({ filas: [], cargando: false, aviso: t("historialError", [this.motivoDeError(error)]) });
		}
	}

	public onCerrarHistorial(): void {
		this.dialogoHistorial?.close();
	}

	private modeloBusqueda(): JSONModel {
		return this.dialogoBusqueda?.getModel("busqueda") as JSONModel;
	}

	private modeloOferta(): JSONModel {
		return this.getView()?.getModel("oferta") as JSONModel;
	}

	private modeloMock(): JSONModel {
		return this.getOwnerComponent()?.getModel("mock") as JSONModel;
	}

	private i18n(): ResourceBundle {
		return (this.getOwnerComponent()?.getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
	}
}
