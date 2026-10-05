import Controller from "sap/ui/core/mvc/Controller";
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
import { leerCentros, leerOficinas, type OpcionCatalogo } from "com/socopur/cotizador/model/CatalogosService";
import {
	Vendedor,
	buscarEmpleados,
	organizacionesDe,
	buscarVendedores,
	type Empleado,
	guardarVendedor,
	fijarPin,
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
		this.getView()?.setModel(new JSONModel({ visibles: [], edicion: { ...VACIO }, esNuevo: true, nuevoPin: "", conBusqueda: false, empleados: [], busquedaEmpleado: "", opcOrg: [], opcOficina: [], opcCentro: [] }), "adm");
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

	/** Solo con ?odata=1 se escribe en SAP; sin la bandera todo queda en pantalla (prototipo). */
	private odata(): ODataModel | undefined {
		const usar = new URLSearchParams(window.location.search).get("odata") === "1";
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
		adm.setProperty("/visibles", buscarVendedores(this.lista(), this.filtro));
	}

	public onVolver(): void {
		this.router.navTo("lista");
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
		adm.setProperty("/opcOrg", organizacionesDe(edicion.tipo));
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
		adm.setProperty("/opcOficina", oficinas);
		adm.setProperty("/opcCentro", centros);
		if (v.vkbur && !oficinas.some((x) => x.key === v.vkbur)) {
			adm.setProperty("/edicion/vkbur", "");
		}
		if (v.werks && !centros.some((x) => x.key === v.werks)) {
			adm.setProperty("/edicion/werks", "");
		}
	}

	/** Al cambiar el tipo de venta se recalculan las organizaciones posibles y se elige la primera. */
	public async onCambiaTipo(): Promise<void> {
		const adm = this.modeloAdm();
		const tipo = String(adm.getProperty("/edicion/tipo"));
		const orgs = organizacionesDe(tipo);
		adm.setProperty("/opcOrg", orgs);
		adm.setProperty("/edicion/vkorg", orgs[0].key);
		await this.cargarOpcionesArea();
	}

	/** Al cambiar organizacion o canal cambian las oficinas y centros validos. */
	public async onCambiaArea(): Promise<void> {
		await this.cargarOpcionesArea();
	}

	/** Busca empleados de HCM mientras se escribe (nombre o PERNR). */
	public async onBuscarEmpleado(event: Event): Promise<void> {
		const odata = this.odata();
		if (!odata) {
			return;
		}
		const texto = (event.getSource() as SearchField).getValue();
		const adm = this.modeloAdm();
		try {
			const lista = await buscarEmpleados(odata, texto);
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
