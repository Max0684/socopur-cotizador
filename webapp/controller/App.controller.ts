import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Dialog from "sap/m/Dialog";
import List from "sap/m/List";
import SearchField from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import {
	Vendedor,
	aplicarPerfil,
	buscarVendedores,
	cargarVendedores,
	pinCorrecto,
	recordarVendedor,
	vendedorRecordado
} from "com/socopur/cotizador/model/VendedoresService";

/**
 * @namespace com.socopur.cotizador.controller
 */
export default class App extends Controller {
	private dialogoVendedor?: Dialog;
	private vendedores: Vendedor[] = [];

	public onInit(): void {
		this.getView()?.addStyleClass("sapUiSizeCompact");
		this.getView()?.setModel(new JSONModel({ layout: "OneColumn" }), "app");
		this.getView()?.setModel(new JSONModel({ visibles: [], elegido: "", pedirPin: false, pin: "", estadoPin: "None" }), "vend");

		const router = (this.getOwnerComponent() as UIComponent).getRouter();
		router.attachRouteMatched(this.onRouteMatched, this);

		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		void mock.dataLoaded().then(() => this.identificarVendedor(mock));
	}

	/** El layout de columnas lo define cada ruta en el manifest. */
	private onRouteMatched(event: Router$RouteMatchedEvent): void {
		const config = event.getParameter("config") as { layout?: string };
		const appModel = this.getView()?.getModel("app") as JSONModel;
		appModel.setProperty("/layout", config.layout ?? "OneColumn");
	}

	/** Lee los vendedores (SAP con ?odata=1, si no los del prototipo) y recupera al de esta pestana o abre el dialogo. */
	private async identificarVendedor(mock: JSONModel): Promise<void> {
		const prototipo = (mock.getProperty("/vendedores") as Vendedor[]) ?? [];
		const usarOData = new URLSearchParams(window.location.search).get("odata") === "1";
		const odata = usarOData ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
		try {
			this.vendedores = await cargarVendedores(odata, prototipo);
		} catch {
			// La entidad Vendedor puede no estar publicada todavia: se sigue con los del prototipo.
			this.vendedores = prototipo;
		}
		const recordado = this.vendedores.find((v) => v.pernr === vendedorRecordado());
		if (recordado) {
			aplicarPerfil(mock, recordado);
			return;
		}
		await this.abrirDialogoVendedor();
	}

	private async abrirDialogoVendedor(): Promise<void> {
		if (!this.dialogoVendedor) {
			this.dialogoVendedor = (await Fragment.load({
				id: this.getView()?.getId(),
				name: "com.socopur.cotizador.view.fragment.IdentificarVendedor",
				controller: this
			})) as Dialog;
			this.getView()?.addDependent(this.dialogoVendedor);
		}
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		modelo.setData({ visibles: this.vendedores, elegido: "", pedirPin: false, pin: "", estadoPin: "None" });
		this.dialogoVendedor.open();
	}

	/** Sin identificarse no se puede cotizar: el dialogo no se cierra con Escape. */
	public onVendedorEscape(promesa: { reject(): void }): void {
		promesa.reject();
	}

	public onVendedorBuscar(event: Event): void {
		const texto = (event.getSource() as SearchField).getValue();
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		modelo.setProperty("/visibles", buscarVendedores(this.vendedores, texto));
	}

	public onVendedorElegido(event: Event): void {
		const lista = event.getSource() as List;
		const contexto = lista.getSelectedItem()?.getBindingContext("vend");
		const elegido = contexto?.getObject() as Vendedor | undefined;
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		modelo.setProperty("/elegido", elegido?.pernr ?? "");
		modelo.setProperty("/pedirPin", !!elegido?.pinHash);
		modelo.setProperty("/pin", "");
		modelo.setProperty("/estadoPin", "None");
	}

	public async onVendedorEntrar(): Promise<void> {
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		const vendedor = this.vendedores.find((v) => v.pernr === modelo.getProperty("/elegido"));
		if (!vendedor) {
			return;
		}
		if (!(await pinCorrecto(vendedor, String(modelo.getProperty("/pin") ?? "")))) {
			modelo.setProperty("/estadoPin", "Error");
			return;
		}
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		aplicarPerfil(mock, vendedor);
		recordarVendedor(vendedor.pernr);
		this.dialogoVendedor?.close();
	}

	/** Permite cambiar de vendedor sin recargar (el usuario SAP es compartido). */
	public async onCambiarVendedor(): Promise<void> {
		recordarVendedor(undefined);
		await this.abrirDialogoVendedor();
	}
}
