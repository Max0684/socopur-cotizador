import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import Fragment from "sap/ui/core/Fragment";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Dialog from "sap/m/Dialog";
import List from "sap/m/List";
import SearchField from "sap/m/SearchField";
import Event from "sap/ui/base/Event";
import { ciudadDeCentro, textoSede } from "com/socopur/cotizador/model/Ciudades";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import {
	Vendedor,
	aplicarPerfil,
	buscarVendedores,
	claveVendedor,
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

	/** Solo con ?odata=1 se usa el servicio real; sin la bandera el prototipo con datos de ejemplo. */
	private odata(): ODataModel | undefined {
		const usar = new URLSearchParams(window.location.search).get("odata") === "1";
		return usar ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
	}

	/** Lee los vendedores (SAP con ?odata=1, si no los del prototipo) y recupera al de esta pestana o abre el dialogo. */
	private async identificarVendedor(mock: JSONModel): Promise<void> {
		const prototipo = (mock.getProperty("/vendedores") as Vendedor[]) ?? [];
		const usarOData = new URLSearchParams(window.location.search).get("odata") === "1";
		const odata = usarOData ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
		let lista = prototipo;
		try {
			lista = await cargarVendedores(odata, prototipo);
		} catch {
			// La entidad Vendedor puede no estar publicada todavia: se sigue con los del prototipo.
		}
		// La lista vive en el modelo para que la pantalla de administracion y este dialogo vean lo mismo.
		mock.setProperty("/vendedores", lista);
		const recordado = this.activos().find((v) => claveVendedor(v) === vendedorRecordado());
		if (recordado) {
			this.entrarComo(mock, recordado);
			return;
		}
		await this.abrirDialogoVendedor();
	}

	/** Carga el perfil del vendedor y su sede (ciudad y region, deducidas de su centro). */
	private entrarComo(mock: JSONModel, vendedor: Vendedor): void {
		aplicarPerfil(mock, vendedor);
		mock.setProperty("/perfil/sede", textoSede(vendedor.werks));
		mock.setProperty("/perfil/ciudad", ciudadDeCentro(vendedor.werks)?.clave ?? "");
		mock.setProperty("/perfil/orgVentas", vendedor.vkorg);
	}

	private activos(): Vendedor[] {
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		return ((mock.getProperty("/vendedores") as Vendedor[]) ?? []).filter((v) => v.activo);
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
		modelo.setData({ visibles: this.activos().map((v) => ({ ...v, clave: claveVendedor(v) })), elegido: "", pedirPin: false, pin: "", estadoPin: "None" });
		this.dialogoVendedor.open();
	}

	/** Sin identificarse no se puede cotizar: el dialogo no se cierra con Escape. */
	public onVendedorEscape(promesa: { reject(): void }): void {
		promesa.reject();
	}

	public onVendedorBuscar(event: Event): void {
		const texto = (event.getSource() as SearchField).getValue();
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		modelo.setProperty("/visibles", buscarVendedores(this.activos(), texto).map((v) => ({ ...v, clave: claveVendedor(v) })));
	}

	public onVendedorElegido(event: Event): void {
		const lista = event.getSource() as List;
		const contexto = lista.getSelectedItem()?.getBindingContext("vend");
		const elegido = contexto?.getObject() as (Vendedor & { clave: string }) | undefined;
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		modelo.setProperty("/elegido", elegido?.clave ?? "");
		modelo.setProperty("/pedirPin", !!elegido?.conPin);
		modelo.setProperty("/pin", "");
		modelo.setProperty("/estadoPin", "None");
	}

	public async onVendedorEntrar(): Promise<void> {
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		const vendedor = this.activos().find((v) => claveVendedor(v) === modelo.getProperty("/elegido"));
		if (!vendedor) {
			return;
		}
		if (!(await pinCorrecto(this.odata(), vendedor, String(modelo.getProperty("/pin") ?? "")))) {
			modelo.setProperty("/estadoPin", "Error");
			return;
		}
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		this.entrarComo(mock, vendedor);
		recordarVendedor(claveVendedor(vendedor));
		this.dialogoVendedor?.close();
	}

	/** Permite cambiar de vendedor sin recargar (el usuario SAP es compartido). */
	public async onCambiarVendedor(): Promise<void> {
		recordarVendedor(undefined);
		await this.abrirDialogoVendedor();
	}
}
