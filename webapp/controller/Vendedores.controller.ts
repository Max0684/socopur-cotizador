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
import ListItemBase from "sap/m/ListItemBase";
import Switch from "sap/m/Switch";
import Event from "sap/ui/base/Event";
import {
	Vendedor,
	buscarVendedores,
	guardarVendedor,
	hashPin,
	validarVendedor
} from "com/socopur/cotizador/model/VendedoresService";

const VACIO: Vendedor = {
	pernr: "", nombre: "", tipo: "repuestos", vkorg: "1103", vkbur: "", werks: "", lgort: "", vtweg: "11",
	zterm: "C000", vsbed: "", waers: "PEN", vigenciaDias: 7, rol: "V", pinHash: "", activo: true
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
		this.getView()?.setModel(new JSONModel({ permitido: false, visibles: [], edicion: { ...VACIO }, esNuevo: true, nuevoPin: "", quitarPin: false }), "adm");
		this.router.getRoute("vendedores")?.attachPatternMatched(() => this.refrescar(), this);
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
		adm.setProperty("/permitido", this.modeloMock().getProperty("/perfil/rol") === "A");
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
		adm.setProperty("/quitarPin", false);
		this.dialogo.open();
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
		if (adm.getProperty("/quitarPin")) {
			v.pinHash = "";
		}
		if (nuevoPin) {
			v.pinHash = await hashPin(nuevoPin);
		}
		await this.persistir(v, adm.getProperty("/esNuevo") as boolean);
		this.dialogo?.close();
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

	private async persistir(v: Vendedor, esNuevo: boolean): Promise<void> {
		const odata = this.odata();
		try {
			const lista = await guardarVendedor(odata, this.lista(), v, esNuevo);
			this.modeloMock().setProperty("/vendedores", lista);
			MessageToast.show(this.textos().getText(odata ? "vendAdmGuardado" : "vendAdmGuardadoProto"));
		} catch (error) {
			const mensaje = (error as Error).message;
			MessageBox.error(mensaje.startsWith("vendAdm") ? this.textos().getText(mensaje) : mensaje);
		}
		this.refrescar();
	}
}
