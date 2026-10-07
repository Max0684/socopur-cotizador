import Controller from "sap/ui/core/mvc/Controller";
import Messaging from "sap/ui/core/Messaging";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { cargarDetalleOferta } from "com/socopur/cotizador/model/OfertasService";
import type { GrupoEstado } from "com/socopur/cotizador/model/odata/Entidades";
import { leerCentros, leerOficinas } from "com/socopur/cotizador/model/CatalogosService";
import { buscarMateriales, cargarSegmentos, disponibilidadPorCentro, materialesDisponibles, type Disponibilidad } from "com/socopur/cotizador/model/MaterialesService";
import { entidadTieneCampo } from "com/socopur/cotizador/model/CamposServicio";
import { cargarFormasPago } from "com/socopur/cotizador/model/FormasPagoService";
import { consultarCondiciones, consultarPrecio, impuestosDeCondiciones } from "com/socopur/cotizador/model/PreciosService";
import { type CondicionServicio, type FilaCondicion, descuentosAplicados, filasDeCondiciones } from "com/socopur/cotizador/model/Condiciones";
import { agruparVehiculos, buscarVehiculos, filtrarVehiculos, textoDetalleVehiculo } from "com/socopur/cotizador/model/VehiculosService";
import { almacenDeCentro, canalDe, centroValidoParaArea, faltaAreaDeVentas, faltaSectorDeVentas, gruposParaGuardar, igvExonerado, modalidadPorDefecto, oficinaDe, orgVehiculosDe, puedeVenderOtroCentro, sectorDeCabecera, totalesDeOferta } from "com/socopur/cotizador/model/Reglas";
import { asignarVinItem, crearPedidoGrupo, guardarCotizacion, leerEstadoPedido, leerVinsGrupo, leerVinsLibres, renovarCotizacion, OfertaEnProcesoError, type OfertaParaGuardar, type VinAsignado, esperarVinculos, leerMotivoVinculo } from "com/socopur/cotizador/model/CotizacionesService";
import { buscarClientes, type ClienteSap } from "com/socopur/cotizador/model/ClientesService";
import { buscarRepuestosConStock, disponibilidadPorAlmacen, motivoVacio } from "com/socopur/cotizador/model/MaterialesService";
import { cargarPreciosLista, precioListaDisponible, textoPrecioLista } from "com/socopur/cotizador/model/PrecioListaService";
import { listaDeSede } from "com/socopur/cotizador/model/Ciudades";
import { ciudadPorClave, principalDe, sociedadDeCentro } from "com/socopur/cotizador/model/Ciudades";
import { cargarContacto, cargarDirecciones, cargarMovimientos, type Movimiento } from "com/socopur/cotizador/model/ClienteDetalleService";
import { cargarCreditoCliente, fechaLocalISO, resumirCredito, textoPorMoneda, type EstadoCuenta, type ResumenCredito } from "com/socopur/cotizador/model/CreditoClienteService";
import { cargarModalidades, type ModalidadPantalla } from "com/socopur/cotizador/model/ModalidadesService";
import { ordenarPorTexto } from "com/socopur/cotizador/model/Orden";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import SearchField from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import Dialog from "sap/m/Dialog";
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
import { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";


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
	/** Impuestos del grupo (suma de sus lineas) cuando todas los traen: ISC, IGV y total con impuestos. */
	isc?: number;
	igv?: number;
	totalConImp?: number;
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
	private dialogoDetalle?: Dialog;
	/** Material del detalle abierto (su fila de la lista de elegidos); la cantidad y las condiciones se piden de nuevo a SAP al cambiarla. */
	private detalleMaterial?: Vehiculo & Repuesto & { tipo: string };
	private dialogoExcel?: Dialog;
	private dialogoValidar?: Dialog;
	private dialogoVistaOferta?: Dialog;
	private dialogosCliente: Record<string, Dialog> = {};
	private dialogoClienteActual?: Dialog;
	private contadorLinea = 0;
	private instantanea = "[]";
	private dialogoSolicitud?: Dialog;
	private dialogoVin?: Dialog;

	public onInit(): void {
		this.router = (this.getOwnerComponent() as UIComponent).getRouter();
		this.getView()?.setModel(new JSONModel(this.crearOferta()), "oferta");
		// Ancho de pantalla: la barra inferior muestra menos datos en pantallas angostas (el desbordamiento automatico no alcanza)
		const dispositivo = new JSONModel({ ancho: Device.resize.width });
		this.getView()?.setModel(dispositivo, "device");
		Device.resize.attachHandler((p: { width: number }) => dispositivo.setProperty("/ancho", p.width));
		this.router.getRoute("nueva")?.attachPatternMatched(() => this.cargar(), this);
		this.router.getRoute("oferta")?.attachPatternMatched((event: Route$PatternMatchedEvent) => {
			const args = event.getParameter("arguments") as { numero: string };
			this.cargar(args.numero);
		}, this);
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
		this.modeloBusqueda().setData(this.busquedaInicial(tipo, true));
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

	/** Al cambiar de tipo se limpian los segmentos (como hoy) y se precargan los del perfil. */
	public onCambiaTipo(): void {
		const tipo = this.modeloBusqueda().getProperty("/tipo") as string;
		this.reiniciarBusqueda(this.busquedaInicial(tipo, true));
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

	/** 01 Envio / 02 Recojo: define como se entrega (la modalidad tambien lo propone al cambiarla). */
	public onCambiaExpedicion(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entrega", oferta.getProperty("/perfil/expedicion") === "01" ? "envio" : "recojo");
		oferta.setProperty("/guardado", { visible: false, texto: "" });
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
			await this.abrirCliente("FichaCliente", { ...cl, direcciones: this.direccionesDe(cl), areas: this.areasTexto(cl.areas ?? []) });
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
		await this.abrirCliente("EditarCliente", {
			tipoDoc: cl.tipoDoc,
			doc: cl.doc,
			razon1: nombre.slice(0, 35),
			razon2: nombre.slice(35, 70),
			razon3: nombre.slice(70, 105),
			telefono: cl.telefono,
			correo: cl.correo,
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

	/** SIMULADO: en SAP lo hace ZSDSCPP002 (valida y actualiza el Business Partner). */
	public onGuardarCliente(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const i18n = this.i18n();
		const errores: string[] = [];
		const razon = [1, 2, 3].map((n) => String(modelo.getProperty(`/razon${n}`) ?? "")).join("").trim();
		if (!razon) {
			errores.push(i18n.getText("altaErrRazon") as string);
		}
		if (!/^9\d{8}$/.test(String(modelo.getProperty("/telefono") ?? "").replace(/\s/g, ""))) {
			errores.push(i18n.getText("altaErrCelular") as string);
		}
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(modelo.getProperty("/correo") ?? ""))) {
			errores.push(i18n.getText("altaErrEmail") as string);
		}
		const dirs = (modelo.getProperty("/direcciones") as Direccion[]) ?? [];
		if (dirs.some((x) => !x.texto.trim())) {
			errores.push(i18n.getText("editarErrDirecciones") as string);
		}
		if (!dirs.some((x) => x.tipo === "Fiscal")) {
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

	/** Deja elegida la direccion de envio: la ya elegida si sigue existiendo; si no, la primera de tipo envio o la fiscal. */
	private aplicarDireccionEnvio(): void {
		const oferta = this.modeloOferta();
		const cl = oferta.getProperty("/cliente") as Cliente | null;
		if (!cl) {
			oferta.setProperty("/opcionesDireccion", []);
			oferta.setProperty("/entregaDatos/direccionId", "");
			oferta.setProperty("/entregaDatos/direccionEnvio", "");
			return;
		}
		const dirs = this.direccionesDe(cl);
		if (!cl.direcciones?.length) {
			oferta.setProperty("/cliente/direcciones", dirs);
		}
		// Ultima opcion: direccion de un solo uso, que se guarda solo en la oferta (SAP crea una direccion propia del documento).
		oferta.setProperty("/opcionesDireccion", [...ordenarPorTexto(dirs, (d) => d.alias), { id: "__unica__", alias: this.i18n().getText("direccionUnica") as string, tipo: "", texto: "" }]);
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

	public onCambiaDireccionUnica(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/direccionEnvio", String(oferta.getProperty("/entregaDatos/direccionUnica") ?? "").trim());
	}

	/**
	 * El transportista es un buscador (en SAP es cualquier Business Partner con la funcion ZT, no hay lista cerrada).
	 * Cada transportista puede tener varias sedes con su direccion; el vendedor elige de cual sede sale.
	 */
	private seleccionarTransportista(clave: string): void {
		const oferta = this.modeloOferta();
		const t = (oferta.getProperty("/transportistas") as { key: string; text: string; sedes: { key: string; text: string; direccion: string }[] }[]).find((x) => x.key === clave);
		oferta.setProperty("/entregaDatos/transportista", t?.key ?? "");
		oferta.setProperty("/entregaDatos/transportistaTexto", t?.text ?? "");
		oferta.setProperty("/entregaDatos/transportistaError", "");
		oferta.setProperty("/sedes", t?.sedes ?? []);
		const unica = t?.sedes.length === 1 ? t.sedes[0] : undefined;
		oferta.setProperty("/entregaDatos/sede", unica?.key ?? "");
		oferta.setProperty("/entregaDatos/sedeDireccion", unica?.direccion ?? "");
	}

	public onSugerenciaTransportista(event: Event): void {
		const item = (event as unknown as { getParameter(n: string): { getKey(): string } | undefined }).getParameter("selectedItem");
		if (item) {
			this.seleccionarTransportista(item.getKey());
		}
	}

	public onCambiaTransportistaTexto(event: Event): void {
		const texto = String((event as unknown as { getParameter(n: string): string }).getParameter("value") ?? "").trim();
		const oferta = this.modeloOferta();
		if (!texto) {
			this.seleccionarTransportista("");
			return;
		}
		const t = (oferta.getProperty("/transportistas") as { key: string; text: string }[]).find((x) => x.text.toLowerCase() === texto.toLowerCase());
		if (t) {
			this.seleccionarTransportista(t.key);
			return;
		}
		this.seleccionarTransportista("");
		oferta.setProperty("/entregaDatos/transportistaTexto", texto);
		oferta.setProperty("/entregaDatos/transportistaError", this.i18n().getText("transportistaNoExiste") as string);
	}

	public onElegirReciente(event: Event): void {
		const t = (event.getSource() as unknown as Control).getBindingContext("oferta")?.getObject() as { key: string } | undefined;
		if (t) {
			this.seleccionarTransportista(t.key);
		}
	}

	public onCambiaSede(): void {
		const oferta = this.modeloOferta();
		const sedes = (oferta.getProperty("/sedes") as { key: string; direccion: string }[]) ?? [];
		const clave = oferta.getProperty("/entregaDatos/sede") as string;
		oferta.setProperty("/entregaDatos/sedeDireccion", sedes.find((x) => x.key === clave)?.direccion ?? "");
	}

	public async onAmpliarAbrir(): Promise<void> {
		const cl = this.clienteActual();
		if (!cl) {
			return;
		}
		const todas = this.modeloMock().getProperty("/canalesArea") as { key: string; text: string }[];
		const actuales = cl.areas ?? [];
		await this.abrirCliente("AmpliarArea", {
			areas: this.areasTexto(actuales),
			disponibles: todas.filter((a) => !actuales.includes(a.key)),
			nueva: ""
		});
	}

	/** SIMULADO: en SAP se amplia el Business Partner al area de ventas (org. + canal) elegida. */
	public onAmpliarArea(): void {
		const modelo = this.dialogoClienteActual?.getModel("cli") as JSONModel;
		const cl = this.clienteActual();
		const clave = modelo.getProperty("/nueva") as string;
		if (!cl || !clave) {
			return;
		}
		const nuevas = [...(cl.areas ?? []), clave];
		this.modeloOferta().setProperty("/cliente/areas", nuevas);
		this.modeloMock().setProperty(`/clientes/${cl.doc}/areas`, nuevas);
		this.recalcular();
		this.dialogoClienteActual?.close();
		MessageToast.show(`${this.i18n().getText("ampliarOk")} (${this.i18n().getText("simulacion")})`);
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
		let clave = elegidas[grupo.clave] ?? porDefecto;
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
			const sectorCab = sectorDeCabecera(canalGrupo, primera.sector, primera.orgVentas);
			sectorCabecera = sectorCab;
			const base = `${primera.grupo} · ${i18n.getText("grupoOrg", [primera.orgVentas, primera.sector]) as string}`;
			grupo.titulo = canalGrupo && sectorCab !== primera.sector ? `${base} · ${i18n.getText("grupoSectorCab", [sectorCab]) as string}` : base;
		}
		// El cliente debe estar dado de alta en el area de ventas (organizacion + canal) de la modalidad
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const canalNum = canalDe(m.canal);
		const area = canalNum ? `${grupo.lineas[0]?.orgVentas}/${canalNum}` : "";
		grupo.areaFalta = !!cliente && !!area && faltaAreaDeVentas(cliente.areas, grupo.lineas[0]?.orgVentas, canalNum);
		// Dado de alta en la organizacion y el canal, pero no en el sector de la cabecera: SAP lo rechaza al guardar la oferta.
		const sectorFalta = !grupo.areaFalta && !!cliente && !!area && faltaSectorDeVentas(cliente.areas, grupo.lineas[0]?.orgVentas, canalNum, sectorCabecera);
		if (grupo.areaFalta) {
			const nombre = (this.modeloMock().getProperty("/canalesArea") as { key: string; text: string }[]).find((x) => x.key === area)?.text ?? area;
			grupo.areaAviso = i18n.getText("areaFalta", [nombre]) as string;
		} else if (sectorFalta) {
			grupo.areaFalta = true;
			grupo.areaAviso = i18n.getText("sectorFalta", [`${area}/${sectorCabecera}`]) as string;
		}
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
			// Escalas por cantidad y articulos gratis de repuestos: aun no hay entidad en el servicio; se muestran vacios, sin inventar datos.
			escalas: [],
			regalos: [],
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
				: [
						{ ubicacion: "1101 · Pucallpa-Centenario · 0001 CENTENARIO", esMio: true, fisico: m.total, disponible: m.disponible, transito: 0 }
					]);
		const filas = base.map((f) => ({ ...f, comprometido: f.fisico - f.disponible }));
		const mio = filas.find((f) => f.esMio);
		return {
			titulo: i18n.getText("stockDe", [`${m.material} · ${m.denominacion}`]) as string,
			material: m,
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
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		if (!cliente || cliente.estadoState === "Error") {
			return { estado: "Warning", texto: i18n.getText("libCreditoBloq") as string, automatica: false, bloquea: false };
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
					if ((item.cantidad ?? 1) > 1 || item.vin || !item.werks || !item.vkorg || !item.vtweg) {
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
					const lineaPantalla = ((this.modeloOferta().getProperty("/lineas") as Linea[]) ?? []).find((l) => l.material === item.material);
					filas.push({
						material: item.material,
						posnr: item.posnr,
						denominacion: lineaPantalla?.denominacion ?? item.material,
						detalle: [item.material, item.variante].filter(Boolean).join(" · "),
						opciones,
						vin: propuesto?.vhcle ?? ""
					});
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
		const bloqueos: string[] = [];
		if (real?.BloqueoEntrega) {
			bloqueos.push(i18n.getText("pedidoBloqueoEntrega", [real.BloqueoEntrega]) as string);
		}
		if (real?.BloqueoFactura) {
			bloqueos.push(i18n.getText("pedidoBloqueoFactura", [real.BloqueoFactura]) as string);
		}
		const credito = !real
			? (i18n.getText("pedidoEstadoNoLeido") as string)
			: real.EstadoCredito === "B"
				? (i18n.getText("pedidoCreditoBloqueado") as string)
				: (i18n.getText("pedidoCreditoLibre") as string);
		const liberado = real?.Liberado === "X";
		return {
			numero: numeroPedido,
			oferta: numeroOferta,
			detalle,
			vin: "\u2014",
			bloqueo: "\u2014",
			clasePedido,
			estado: !real ? (i18n.getText("pedidoPendiente") as string) : liberado ? (i18n.getText("pedidoLiberado") as string) : (i18n.getText("pedidoBloqueado") as string),
			estadoState: liberado ? "Success" : "Warning",
			liberacion: [credito, ...bloqueos].join(" \u00b7 "),
			liberacionState: !real ? "Warning" : liberado ? "Success" : "Warning",
			totalSap: real && real.TotalPedido !== undefined && real.TotalPedido !== "" ? this.textoTotalSap(real, impuestos) : "\u2014"
		};
	}

	/** Que debe hacer el vendedor despues de crear el pedido, segun el estado real de SAP (credito bloqueado -> Creditos; si no, Caja verifica el cobro y factura). */
	private avisarSiguientePaso(estados: (GrupoEstado | null)[]): void {
		const i18n = this.i18n();
		const conCreditoBloqueado = estados.some((e) => e?.EstadoCredito === "B");
		this.modeloOferta().setProperty(
			"/avisoPedido",
			estados.length === 0 ? { texto: "", tipo: "None" } : { texto: i18n.getText(conCreditoBloqueado ? "pedidoAvisoCredito" : "pedidoAvisoCobro") as string, tipo: conCreditoBloqueado ? "Warning" : "Information" }
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
					$expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,VbelnPedido,AuartPedido" } },
					$$ownRequest: true
				})
				.requestObject()) as { _Grupo?: { GrupoNo: string; VbelnOferta: string; VbelnPedido: string; AuartPedido: string }[] };
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
					clasePedido: g.AuartPedido,
					total: oferta.getProperty("/totales/total") as number
				}
			]);
			oferta.setProperty("/guardado", { visible: true, texto: this.i18n().getText("guardadoOk", [numeroOferta]) as string });
		} catch (error) {
			MessageToast.show(this.i18n().getText("odataDetalleError", [(error as Error).message]) as string);
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
					$expand: { _Grupo: { $select: "GrupoNo,VbelnOferta,VbelnPedido,AuartPedido" } },
					$$ownRequest: true
				})
				.requestObject()) as { _Grupo?: { GrupoNo: string; VbelnOferta: string; VbelnPedido: string; AuartPedido: string }[] };
			const g = (cot._Grupo ?? []).find((x) => sinCeros(x.VbelnOferta) === sinCeros(numeroOferta) && x.VbelnPedido);
			if (!g) {
				return;
			}
			const real = await leerEstadoPedido(odata, cotizId, g.GrupoNo);
			const oferta = this.modeloOferta();
			this.avisarSiguientePaso([real]);
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
		const estadosReales: (GrupoEstado | null)[] = [];
		vista?.setBusy(true);
		// Antes de llamar a SAP: si el disponible del almacen no alcanza, se dice aqui (SAP lo rechazaria igual) y no se crea nada.
		const faltan = await this.lineasSinDisponible();
		if (faltan.length > 0) {
			vista?.setBusy(false);
			MessageBox.error(i18n.getText("pedidoSinDisponible", [faltan.join("\n")]) as string);
			return;
		}
		// SAP crea el pedido en segundo plano: puede tardar hasta un minuto; se avisa para que no parezca colgado.
		MessageToast.show(i18n.getText("creandoPedidoEspera") as string, { duration: 6000 });
		try {
			for (const o of guardadas) {
				const pedido = await crearPedidoGrupo(odata, o.cotizId as string, o.grupoNo as string);
				numeros.push(pedido.vbelnPedido);
				// Estado REAL leido de SAP (vista GrupoEstado sobre VBAK); si no se puede leer, se dice que no hay informacion.
				const real = await leerEstadoPedido(odata, o.cotizId as string, o.grupoNo as string);
				estadosReales.push(real);
				const base = this.filaPedidoReal(real, pedido.vbelnPedido, o.numero, o.titulo, o.clasePedido ?? "", await this.impuestosDeOferta(odata, o.numero));
				const vins = await this.asignarVinsDelGrupo(odata, o.cotizId as string, o.grupoNo as string, elegidos);
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
			this.avisarSiguientePaso(estadosReales);
			oferta.setProperty("/guardado", { visible: true, texto: i18n.getText("pedidosCreados", [numeros.join(", ")]) as string });
		}
	}

	/**
	 * Asigna el VIN de cada vehiculo del grupo despues de crear el pedido (asignarVin: SAP propone el mas antiguo del mismo modelo,
	 * centro y variante). Si falla para un vehiculo, el pedido queda y ese vehiculo queda "VIN pendiente" con el motivo.
	 */
	private async asignarVinsDelGrupo(odata: ODataModel, cotizId: string, grupoNo: string, elegidos: Record<string, string> = {}): Promise<(VinAsignado & { error?: string })[]> {
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
				resultado.push(await asignarVinItem(odata, cotizId, i.posnr, elegidos[i.posnr] || undefined));
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

	/** El cliente se busca en SAP solo con ?odata=1; sin la bandera sigue la busqueda simulada. */
	private usarOData(): boolean {
		return new URLSearchParams(window.location.search).get("odata") === "1";
	}

	/** Busqueda real de cliente (vista YI_COTIZ_CLIENTE). Con varias coincidencias se abre una ventana para elegir. */
	private async buscarClienteReal(texto: string): Promise<void> {
		const oferta = this.modeloOferta();
		const odata = (this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel;
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
			MessageToast.show(this.i18n().getText("odataClienteError", [(error as Error).message]) as string);
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

	private aplicarClienteSap(elegido: ClienteSap): void {
		const oferta = this.modeloOferta();
		const cliente: Cliente = {
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
			areas: elegido.areas
		};
		oferta.setProperty("/cliente", cliente);
		oferta.setProperty("/clienteNoEncontrado", false);
		this.refrescarTrasCliente();
		void this.cargarDatosCliente(elegido.kunnr, elegido.bloqueado);
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

	private refrescarTrasCliente(): void {
		const oferta = this.modeloOferta();
		oferta.setProperty("/entregaDatos/direccionId", "");
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
		const esRuc = doc.length === 11;
		return {
			tipoCliente: esRuc ? "0003" : "0001",
			tipoDoc: esRuc ? "RUC" : "DNI",
			doc,
			razon1: "",
			razon2: "",
			razon3: "",
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
		oferta.setProperty("/tiposCliente", this.modeloMock().getProperty("/tiposCliente") ?? []);
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

	/** SIMULADO: con la API real (APIDNI, plan Plata) esta llamada devuelve razon social, direccion y ubigeo. */
	public onConsultarApi(): void {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const doc = String(oferta.getProperty("/alta/doc") ?? "").trim();
		const r = (this.modeloMock().getProperty("/apiDocumentos") as Record<string, { tipoDoc: string; razon: string; direccion: string; dep: string; prov: string; dist: string; ubigeoApi: string; formato: string }>)[doc];
		if (!r) {
			oferta.setProperty("/alta/nota", i18n.getText("altaApiSinDatos"));
			oferta.setProperty("/alta/notaTipo", "Warning");
			return;
		}
		const partir = (t: string, n: number): string[] => [t.slice(0, n), t.slice(n, 2 * n), t.slice(2 * n, 3 * n)];
		const [r1, r2, r3] = partir(r.razon, 35);
		const [d1, d2, d3] = partir(r.direccion, 35);
		oferta.setProperty("/alta/razon1", r1);
		oferta.setProperty("/alta/razon2", r2);
		oferta.setProperty("/alta/razon3", r3);
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
		if (a.tipoDoc === "DNI" && !/^\d{8}$/.test(doc)) {
			errores.push(i18n.getText("altaErrDni") as string);
		}
		if (a.tipoDoc === "RUC" && !/^(10|15|17|20)\d{9}$/.test(doc)) {
			errores.push(i18n.getText("altaErrRuc") as string);
		}
		if (clientes[doc]) {
			errores.push(i18n.getText("altaErrExiste") as string);
		}
		if (!(a.razon1 ?? "").trim()) {
			errores.push(i18n.getText("altaErrRazon") as string);
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
		// SIMULADO: en SAP se crea el Business Partner (una sola transaccion, con control de duplicados por documento).
		const nombre = [a.razon1, a.razon2, a.razon3].map((t) => t.trim()).join("").length ? `${a.razon1}${a.razon2}${a.razon3}`.trim() : "";
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

	/** Arma lo que necesita el servicio a partir del carrito y llama a guardarCotizacion. */
	private async guardarEnSap(): Promise<void> {
		const oferta = this.modeloOferta();
		const i18n = this.i18n();
		const cliente = oferta.getProperty("/cliente") as Cliente | null;
		const grupos = (oferta.getProperty("/grupos") as Grupo[]) ?? [];
		if (!cliente?.kunnr) {
			MessageBox.error(i18n.getText("guardarSinCliente") as string);
			return;
		}
		if (grupos.length === 0 || grupos.every((g) => g.lineas.length === 0)) {
			MessageBox.error(i18n.getText("guardarSinLineas") as string);
			return;
		}
		const sinPrecio = ((oferta.getProperty("/lineas") as Linea[]) ?? []).filter((l) => l.sinPrecioVigente);
		if (sinPrecio.length) {
			MessageBox.error(i18n.getText("guardarSinPrecio", [sinPrecio.map((l) => l.material).join(", ")]) as string);
			return;
		}
		const perfil = oferta.getProperty("/perfil") as Record<string, string>;
		const datos: OfertaParaGuardar = {
			kunnr: cliente.kunnr,
			moneda: perfil.moneda || "PEN",
			// La forma de pago elegida en la pantalla viaja a SAP; antes el pedido heredaba la del maestro del cliente.
			zterm: perfil.formaPago || "",
			pernr: perfil.pernr || "",
			vsbed: this.condicionExpedicion(),
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
					total: g.subtotal,
					areaFalta: g.areaFalta
				}))
			);
			oferta.setProperty("/pedidos", []);
			oferta.setProperty("/vigencia", this.calcularVigencia(new Date().toISOString().slice(0, 10), false));
			oferta.setProperty("/guardado", { visible: true, texto: i18n.getText("guardadoOk", [numeros.join(", ")]) as string });
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
			const mensajes = (Messaging.getMessageModel().getData() as { message?: string; technical?: boolean; type?: string }[]) ?? [];
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
			grupos.map((g, i) => ({ numero: numeros[i], titulo: g.titulo, lineas: g.lineas, modalidad: g.modalidad, clasePedido: g.clasePedido, total: g.subtotal, areaFalta: g.areaFalta }))
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


	/* ---------- Vista de impresion de la oferta (SAP: Output Management + Adobe Form ZFRSD_COTIVTA, con la misma informacion) ---------- */

	private esc(t: unknown): string {
		return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	/** Un documento por cada oferta generada (grupo); cada uno en su propia pagina al imprimir. */
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
		if (!this.dialogoVistaOferta) {
			this.dialogoVistaOferta = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.VistaOferta",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoVistaOferta);
			this.dialogoVistaOferta.setModel(new JSONModel(), "print");
		}
		(this.dialogoVistaOferta.getModel("print") as JSONModel).setData({ html: this.armarHtmlOferta() });
		this.dialogoVistaOferta.open();
	}

	public onCerrarVistaOferta(): void {
		this.dialogoVistaOferta?.close();
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
		setTimeout(() => {
			marco.contentWindow?.print();
			setTimeout(() => marco.remove(), 2000);
		}, 300);
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
			const r = await renovarCotizacion(odata, cab.cotizId);
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
				const sinPedido = cabecera?.estado !== this.i18n().getText("estadoPedido");
				if (this.usarOData() && /^\d{10}$/.test(numeroSap)) {
					// Con el detalle ya leido, una oferta sin pedido queda lista para Copiar a pedido (antes solo pasaba tras guardar en esta pantalla).
					void this.cargarDetalleReal(numeroSap).then(() => (sinPedido && cabecera?.cotizId ? this.prepararPedidoDeOfertaAbierta(cabecera.cotizId, numeroSap) : undefined));
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
				if (conPedido && this.usarOData() && cab?.cotizId) {
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
			entregaDatos: { direccionId: "", direccionEnvio: "", direccionUnica: "", transportista: "", transportistaTexto: "", transportistaError: "", sede: "", sedeDireccion: "", comentario: "" },
			sedes: [],
			transportistas: ((mock.getProperty("/transportistas") as { key: string; text: string; sedes: unknown[] }[]) ?? []).map((t) => ({ ...t, nSedes: `${t.sedes.length} sede(s)` })),
			recientes: (((mock.getProperty("/transportistasRecientes") as string[]) ?? []).map((k) => (mock.getProperty("/transportistas") as { key: string; text: string }[]).find((t) => t.key === k)).filter((t) => !!t) as { key: string; text: string }[]).map((t) => ({ key: t.key, text: t.text })),
			opcionesDireccion: [],
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
			guardado: { visible: false, texto: "" }
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
		oferta.setProperty("/textoGenerar", grupos.length ? this.i18n().getText("generaraOfertas", [grupos.length]) : "");
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
