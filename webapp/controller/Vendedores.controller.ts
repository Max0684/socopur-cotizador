import Controller from "sap/ui/core/mvc/Controller";
import { usarOData as usarODataActual } from "com/socopur/cotizador/model/Modo";
import UIComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Router from "sap/ui/core/routing/Router";
import Dialog from "sap/m/Dialog";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import SearchField from "sap/m/SearchField";
import List from "sap/m/List";
import ListItemBase from "sap/m/ListItemBase";
import Switch from "sap/m/Switch";
import Event from "sap/ui/base/Event";
import { SOCIEDADES, ciudadDeCentro, ciudadPorClave, ciudadesDeSociedad, oficinaDeCentro, principalDe, sociedadDeCentro } from "com/socopur/cotizador/model/Ciudades";
import { ALMACEN_POR_DEFECTO, leerAlmacenes, leerCentros, leerOficinas, type OpcionCatalogo } from "com/socopur/cotizador/model/CatalogosService";
import {
	Vendedor,
	buscarEmpleados,
	organizacionesDeSociedad,
	orgPorDefecto,
	buscarVendedores,
	type Empleado,
	guardarVendedor,
	fijarPin,
	textoSociedad,
	validarVendedor
} from "com/socopur/cotizador/model/VendedoresService";

const PIN_MINIMO = 4;

const VACIO: Vendedor = {
	pernr: "", nombre: "", tipo: "repuestos", vkorg: "1103", vkbur: "", werks: "", lgort: "", vtweg: "11",
	zterm: "C000", vsbed: "", waers: "PEN", vigenciaDias: 7, rol: "V", conPin: false, activo: true
};

/**
 * Mantenimiento de vendedores (tabla YCOTIZ_VENDEDOR). Solo el rol Administrador (personal de TI) entra;
 * los vendedores nunca se borran, se desactivan para conservar el historial de las ofertas.
 * @namespace com.socopur.cotizador.controller
 */
export default class Vendedores extends Controller {
	private router!: Router;
	private dialogo?: Dialog;
	private filtro = "";

	public onInit(): void {
		const componente = this.getOwnerComponent() as UIComponent;
		this.router = componente.getRouter();
		this.getView()?.setModel(new JSONModel({ visibles: [], edicion: { ...VACIO }, esNuevo: true, nuevoPin: "", conBusqueda: false, empleados: [], busquedaEmpleado: "", sociedad: "", opcSociedad: SOCIEDADES, filtroSociedad: "", opcFiltroSociedad: [], opcCiudad: [], ciudad: "", opcOrg: [], opcOficina: [], opcCentro: [], opcAlmacen: [] }), "adm");
		this.router.getRoute("vendedores")?.attachPatternMatched(() => this.refrescar(), this);
		// Al entrar por enlace o recargar, el vendedor se identifica DESPUES de abrirse la pantalla: se refresca cuando llega la lista.
		this.modeloMock().attachPropertyChange((evento) => {
			const ruta = String(evento.getParameter("path") ?? "");
			if (ruta.startsWith("/vendedores") || ruta.startsWith("/perfil")) {
				this.refrescar();
			}
		});
	}

	private modeloAdm(): JSONModel {
		return this.getView()?.getModel("adm") as JSONModel;
	}

	private modeloMock(): JSONModel {
		return (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
	}

	/** Con ?odata=1, o publicada fuera de localhost, se escribe en SAP; si no, todo queda en pantalla (prototipo). */
	private odata(): ODataModel | undefined {
		const usar = usarODataActual();
		return usar ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
	}

	private textos(): { getText(clave: string, args?: string[]): string } {
		return ((this.getOwnerComponent() as UIComponent).getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string, a?: string[]): string } }).getResourceBundle();
	}

	private lista(): Vendedor[] {
		return (this.modeloMock().getProperty("/vendedores") as Vendedor[]) ?? [];
	}

	private refrescar(): void {
		const adm = this.modeloAdm();
		const sociedad = String(adm.getProperty("/filtroSociedad") ?? "");
		const lista = this.lista();
		adm.setProperty("/opcFiltroSociedad", [...new Set(lista.map((v) => v.bukrs ?? "").filter(Boolean))].sort().map((c) => ({ key: c, text: textoSociedad(c) })));
		adm.setProperty("/visibles", buscarVendedores(lista, this.filtro).filter((v) => !sociedad || v.bukrs === sociedad));
	}

	public onVolver(): void {
		this.router.navTo("lista");
	}

	public onFiltroSociedad(): void {
		this.refrescar();
	}

	public onBuscar(event: Event): void {
		this.filtro = (event.getSource() as SearchField).getValue();
		this.refrescar();
	}

	public async onNuevo(): Promise<void> {
		await this.abrir({ ...VACIO }, true);
	}

	public async onEditar(event: Event): Promise<void> {
		const item = event.getSource() as ListItemBase;
		const fila = item.getBindingContext("adm")?.getObject() as Vendedor;
		await this.abrir({ ...fila }, false);
	}

	private async abrir(edicion: Vendedor, esNuevo: boolean): Promise<void> {
		if (!this.dialogo) {
			this.dialogo = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.EditarVendedor",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogo);
		}
		const adm = this.modeloAdm();
		adm.setProperty("/edicion", edicion);
		adm.setProperty("/esNuevo", esNuevo);
		adm.setProperty("/nuevoPin", "");
		// Con SAP el PERNR se elige de la lista de empleados de HCM (no se teclea); sin SAP (prototipo) se puede escribir.
		adm.setProperty("/conBusqueda", this.odata() !== undefined);
		adm.setProperty("/empleados", []);
		adm.setProperty("/busquedaEmpleado", "");
		// La sociedad decide las organizaciones, los centros y las ciudades. En una fila existente sale de su empleado o de su centro.
		const sociedad = edicion.bukrs || sociedadDeCentro(edicion.werks) || "";
		adm.setProperty("/sociedad", sociedad);
		this.aplicarSociedad(sociedad, esNuevo);
		// La ciudad no se guarda: se deduce del centro (un centro pertenece a una sola ciudad).
		adm.setProperty("/ciudad", ciudadDeCentro(edicion.werks)?.clave ?? "");
		this.dialogo.open();
		await this.cargarOpcionesArea();
	}

	/**
	 * Oficinas y centros validos para la organizacion y el canal elegidos (con SAP, de TVKWZ/TVBUR; sin SAP, los del prototipo).
	 * Si el valor guardado ya no esta en la lista nueva se deja vacio para que el administrador elija uno valido.
	 */
	private async cargarOpcionesArea(): Promise<void> {
		const adm = this.modeloAdm();
		const v = adm.getProperty("/edicion") as Vendedor;
		let oficinas: OpcionCatalogo[];
		let centros: OpcionCatalogo[];
		const odata = this.odata();
		if (odata && v.vkorg && v.vtweg) {
			try {
				const [c, o] = await Promise.all([leerCentros(odata, v.vkorg, v.vtweg), leerOficinas(odata, v.vkorg, v.vtweg)]);
				oficinas = o;
				centros = c.codigos.map((k) => ({ key: k, text: `${k} ${c.nombres[k] ?? ""}`.trim() }));
			} catch (error) {
				MessageBox.error((error as Error).message);
				return;
			}
		} else {
			// En el prototipo los centros son un mapa codigo -> nombre.
			const opciones = this.modeloMock().getProperty("/opciones") as { oficinas?: OpcionCatalogo[]; centros?: Record<string, string> };
			oficinas = opciones.oficinas ?? [];
			centros = Object.entries(opciones.centros ?? {}).map(([key, nombre]) => ({ key, text: `${key} ${nombre}` }));
		}
		// Con ciudad elegida, solo se ofrecen los centros y oficinas de esa ciudad (nunca se mezclan sedes).
		const ciudad = ciudadPorClave(String(adm.getProperty("/ciudad") ?? ""));
		if (ciudad) {
			oficinas = oficinas.filter((x) => ciudad.oficinas.includes(x.key));
			centros = centros.filter((x) => ciudad.centros.includes(x.key));
		}
		adm.setProperty("/opcOficina", oficinas);
		adm.setProperty("/opcCentro", centros);
		if (v.vkbur && !oficinas.some((x) => x.key === v.vkbur)) {
			adm.setProperty("/edicion/vkbur", "");
		}
		if (v.werks && !centros.some((x) => x.key === v.werks)) {
			adm.setProperty("/edicion/werks", "");
		}
		await this.cargarAlmacenes();
	}

	/**
	 * Almacenes de venta del centro elegido. Si el almacen actual no esta entre ellos se propone el 0001 (el principal) cuando existe;
	 * sin SAP (prototipo) solo se ofrece el 0001.
	 */
	private async cargarAlmacenes(): Promise<void> {
		const adm = this.modeloAdm();
		const v = adm.getProperty("/edicion") as Vendedor;
		const odata = this.odata();
		let almacenes: OpcionCatalogo[] = [{ key: ALMACEN_POR_DEFECTO, text: `${ALMACEN_POR_DEFECTO} Principal` }];
		if (odata && v.werks) {
			try {
				almacenes = await leerAlmacenes(odata, v.werks);
			} catch (error) {
				MessageBox.error((error as Error).message);
				return;
			}
		} else if (odata) {
			almacenes = [];
		}
		adm.setProperty("/opcAlmacen", almacenes);
		if (!almacenes.some((x) => x.key === v.lgort)) {
			adm.setProperty("/edicion/lgort", almacenes.find((x) => x.key === ALMACEN_POR_DEFECTO)?.key ?? "");
		}
	}

	/** Al elegir la ciudad se proponen su centro y oficina principales; el administrador puede cambiarlos dentro de la ciudad. */
	public async onCambiaCiudad(): Promise<void> {
		const adm = this.modeloAdm();
		const ciudad = ciudadPorClave(String(adm.getProperty("/ciudad") ?? ""));
		if (ciudad) {
			const principal = principalDe(ciudad, String(adm.getProperty("/sociedad") ?? ""));
			adm.setProperty("/edicion/werks", principal.centro);
			adm.setProperty("/edicion/vkbur", principal.oficina);
			adm.setProperty("/edicion/lgort", "");
		}
		await this.cargarOpcionesArea();
	}

	/** Al cambiar el centro cambian los almacenes y se ajusta la oficina de su ciudad (los centros sin oficina propia usan la principal). */
	public async onCambiaCentro(): Promise<void> {
		const adm = this.modeloAdm();
		const werks = String(adm.getProperty("/edicion/werks") ?? "");
		const oficina = oficinaDeCentro(werks);
		if (oficina) {
			adm.setProperty("/edicion/vkbur", oficina);
		}
		await this.cargarAlmacenes();
	}

	/**
	 * Con la sociedad elegida se ofrecen sus tres organizaciones y las ciudades en las que opera. Si la organizacion actual no es de esa
	 * sociedad (o es un alta nueva) se propone la del tipo de venta; la ciudad se limpia si la sociedad no opera en ella.
	 */
	private aplicarSociedad(sociedad: string, proponerOrg: boolean): void {
		const adm = this.modeloAdm();
		const orgs = organizacionesDeSociedad(sociedad);
		adm.setProperty("/opcOrg", orgs);
		const ciudades = ciudadesDeSociedad(sociedad);
		adm.setProperty("/opcCiudad", ciudades.map((c) => ({ key: c.clave, text: c.region ? `${c.nombre} (${c.region})` : c.nombre })));
		if (!ciudades.some((c) => c.clave === adm.getProperty("/ciudad"))) {
			adm.setProperty("/ciudad", "");
		}
		const vkorg = String(adm.getProperty("/edicion/vkorg") ?? "");
		if (proponerOrg || !orgs.some((o) => o.key === vkorg)) {
			adm.setProperty("/edicion/vkorg", orgPorDefecto(String(adm.getProperty("/edicion/tipo")), sociedad));
		}
	}

	/** Al cambiar el tipo de venta se propone la organizacion que le corresponde dentro de la sociedad (el administrador puede cambiarla). */
	public async onCambiaTipo(): Promise<void> {
		const adm = this.modeloAdm();
		adm.setProperty("/edicion/vkorg", orgPorDefecto(String(adm.getProperty("/edicion/tipo")), String(adm.getProperty("/sociedad") ?? "")));
		await this.cargarOpcionesArea();
	}

	/** Al cambiar organizacion o canal cambian las oficinas y centros validos. */
	public async onCambiaArea(): Promise<void> {
		await this.cargarOpcionesArea();
	}

	/** Al cambiar la sociedad se repite la busqueda con el texto que ya hay. */
	public async onCambiaSociedad(): Promise<void> {
		const adm = this.modeloAdm();
		if (adm.getProperty("/esNuevo")) {
			adm.setProperty("/edicion/bukrs", String(adm.getProperty("/sociedad") ?? ""));
			this.aplicarSociedad(String(adm.getProperty("/sociedad") ?? ""), true);
			await this.cargarOpcionesArea();
		}
		const texto = String(adm.getProperty("/busquedaEmpleado") ?? "");
		const odata = this.odata();
		if (!odata || !texto.trim()) {
			adm.setProperty("/empleados", []);
			return;
		}
		try {
			adm.setProperty("/empleados", await buscarEmpleados(odata, texto, String(adm.getProperty("/sociedad") ?? "")));
		} catch (error) {
			MessageBox.error((error as Error).message);
		}
	}

	/** Busca empleados de HCM mientras se escribe (nombre o PERNR), dentro de la sociedad elegida si hay una. */
	public async onBuscarEmpleado(event: Event): Promise<void> {
		const odata = this.odata();
		if (!odata) {
			return;
		}
		const texto = (event.getSource() as SearchField).getValue();
		const adm = this.modeloAdm();
		try {
			const lista = await buscarEmpleados(odata, texto, String(adm.getProperty("/sociedad") ?? ""));
			// Si mientras tanto el texto cambio, esta respuesta ya no sirve.
			if ((event.getSource() as SearchField).getValue() === texto) {
				adm.setProperty("/empleados", lista);
			}
		} catch (error) {
			MessageBox.error((error as Error).message);
		}
	}

	/** Al elegir al empleado se completan PERNR y nombre; el resto del perfil lo define el administrador. */
	public onEmpleadoElegido(event: Event): void {
		const lista = event.getSource() as List;
		const empleado = lista.getSelectedItem()?.getBindingContext("adm")?.getObject() as Empleado | undefined;
		if (!empleado) {
			return;
		}
		const adm = this.modeloAdm();
		adm.setProperty("/edicion/pernr", empleado.pernr);
		adm.setProperty("/edicion/nombre", empleado.nombre);
		adm.setProperty("/edicion/bukrs", empleado.sociedad);
		if (empleado.sociedad && empleado.sociedad !== adm.getProperty("/sociedad")) {
			adm.setProperty("/sociedad", empleado.sociedad);
			this.aplicarSociedad(empleado.sociedad, true);
			void this.cargarOpcionesArea();
		}
	}

	public onCerrarEdicion(): void {
		this.dialogo?.close();
	}

	public async onGuardarVendedor(): Promise<void> {
		const adm = this.modeloAdm();
		const v = { ...(adm.getProperty("/edicion") as Vendedor) };
		v.vigenciaDias = Number(v.vigenciaDias);
		const errores = validarVendedor(v);
		if (errores.length) {
			MessageBox.error(errores.map((e) => this.textos().getText(e)).join("\n"));
			return;
		}
		const nuevoPin = String(adm.getProperty("/nuevoPin") ?? "").trim();
		if (nuevoPin && nuevoPin.length < PIN_MINIMO) {
			MessageBox.error(this.textos().getText("vendAdmErrPinCorto", [String(PIN_MINIMO)]));
			return;
		}
		const guardado = await this.persistir(v, adm.getProperty("/esNuevo") as boolean);
		if (guardado && nuevoPin) {
			await this.persistirPin(v, nuevoPin);
		}
		if (guardado) {
			this.dialogo?.close();
		}
	}

	/** Activar o desactivar desde la tabla. Un administrador no puede desactivarse a si mismo (se quedaria sin acceso). */
	public async onActivoCambiado(event: Event): Promise<void> {
		const interruptor = event.getSource() as Switch;
		const fila = interruptor.getBindingContext("adm")?.getObject() as Vendedor;
		if (!fila.activo && fila.pernr === this.modeloMock().getProperty("/perfil/pernr")) {
			interruptor.setState(true);
			MessageBox.warning(this.textos().getText("vendAdmErrAutoDesactivar"));
			return;
		}
		await this.persistir({ ...fila }, false);
	}

	/** Fija el PIN con la accion de SAP; el PIN nunca se guarda en el front. */
	private async persistirPin(v: Vendedor, pin: string): Promise<void> {
		try {
			const conPin = await fijarPin(this.odata(), v, pin);
			this.modeloMock().setProperty("/vendedores", this.lista().map((x) => (x.pernr === v.pernr && x.vkorg === v.vkorg && x.tipo === v.tipo ? conPin : x)));
		} catch (error) {
			MessageBox.error((error as Error).message);
		}
		this.refrescar();
	}

	private async persistir(v: Vendedor, esNuevo: boolean): Promise<boolean> {
		const odata = this.odata();
		try {
			const lista = await guardarVendedor(odata, this.lista(), v, esNuevo);
			this.modeloMock().setProperty("/vendedores", lista);
			MessageToast.show(this.textos().getText(odata ? "vendAdmGuardado" : "vendAdmGuardadoProto"));
			this.refrescar();
			return true;
		} catch (error) {
			const mensaje = (error as Error).message;
			MessageBox.error(mensaje.startsWith("vendAdm") ? this.textos().getText(mensaje) : mensaje);
			this.refrescar();
			return false;
		}
	}
}
