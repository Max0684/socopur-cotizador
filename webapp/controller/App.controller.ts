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
import { usarOData as usarODataActual } from "com/socopur/cotizador/model/Modo";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";
import {
	Vendedor,
	aplicarPerfil,
	buscarVendedores,
	claveVendedor,
	cargarVendedores,
	fijarPin,
	identificar,
	textoOrganizacion,
	recordarSesion,
	recordarVendedor,
	sesionVendedor,
	sesionVigente,
	vendedorRecordado
} from "com/socopur/cotizador/model/VendedoresService";

/** Minimo de caracteres del PIN (SAP tambien lo valida en fijarPin). */
const PIN_MINIMO = 4;

/** Estado inicial del dialogo de identificacion. crearPin: administrador sin PIN (lo crea); sinPin: vendedor sin PIN (no puede entrar). */
const DIALOGO_VACIO = { elegido: "", pedirPin: false, crearPin: false, sinPin: false, pin: "", pin2: "", estadoPin: "None", textoPin: "", estadoPin2: "None" };

/**
 * @namespace com.socopur.cotizador.controller
 */
export default class App extends Controller {
	private dialogoVendedor?: Dialog;

	public onInit(): void {
		this.getView()?.addStyleClass("sapUiSizeCompact");
		this.getView()?.setModel(new JSONModel({ layout: "OneColumn" }), "app");
		this.getView()?.setModel(new JSONModel({ visibles: [], ...DIALOGO_VACIO }), "vend");

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

	/** Con ?odata=1, o publicada fuera de localhost, se usa el servicio real; si no, el prototipo con datos de ejemplo. */
	private odata(): ODataModel | undefined {
		const usar = usarODataActual();
		return usar ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
	}

	/** Lee los vendedores (SAP con ?odata=1, si no los del prototipo) y recupera al de esta pestana o abre el dialogo. */
	private async identificarVendedor(mock: JSONModel): Promise<void> {
		const prototipo = (mock.getProperty("/vendedores") as Vendedor[]) ?? [];
		const usarOData = usarODataActual();
		const odata = usarOData ? ((this.getOwnerComponent() as UIComponent).getModel("odata") as ODataModel | undefined) : undefined;
		let lista = prototipo;
		try {
			lista = await cargarVendedores(odata, prototipo);
		} catch {
			// La entidad Vendedor puede no estar publicada todavia: se sigue con los del prototipo.
		}
		// La lista vive en el modelo para que la pantalla de administracion y este dialogo vean lo mismo.
		mock.setProperty("/vendedores", lista);
		// Con SAP, ademas del vendedor recordado hace falta su sesion vigente: sin ella SAP rechazaria todo lo que grabe.
		const recordado = this.activos().find((v) => claveVendedor(v) === vendedorRecordado());
		if (recordado && (!odata || sesionVigente(sesionVendedor(), recordado))) {
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
		mock.setProperty("/perfil/orgVentasTxt", textoOrganizacion(vendedor.vkorg));
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
		modelo.setData({ visibles: this.activos().map((v) => ({ ...v, clave: claveVendedor(v) })), ...DIALOGO_VACIO });
		this.dialogoVendedor.open();
	}

	/** El dialogo se puede cerrar siempre; sin vendedor no se puede cotizar (Main y Oferta lo vuelven a pedir). */
	public onVendedorEscape(promesa: { resolve(): void }): void {
		promesa.resolve();
	}

	public onVendedorCancelar(): void {
		this.dialogoVendedor?.close();
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
		// Con SAP todos entran con PIN. Sin PIN, un administrador crea el suyo (solo lo acepta SAP mientras ningun administrador tenga
		// PIN); un vendedor se lo pide al administrador. Sin SAP (prototipo) el vendedor sin PIN entra sin pedirlo.
		const conSap = !!this.odata();
		const sinPin = !!elegido && !elegido.conPin && conSap;
		modelo.setData({
			...modelo.getData(),
			...DIALOGO_VACIO,
			elegido: elegido?.clave ?? "",
			pedirPin: !!elegido?.conPin || (sinPin && elegido?.rol === "A"),
			crearPin: sinPin && elegido?.rol === "A",
			sinPin: sinPin && elegido?.rol !== "A"
		});
	}

	public async onVendedorEntrar(): Promise<void> {
		const modelo = this.getView()?.getModel("vend") as JSONModel;
		const vendedor = this.activos().find((v) => claveVendedor(v) === modelo.getProperty("/elegido"));
		if (!vendedor || modelo.getProperty("/sinPin")) {
			return;
		}
		const i18n = (this.getOwnerComponent() as UIComponent).getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string, a?: string[]): string } };
		const textos = i18n.getResourceBundle();
		const error = (texto: string): void => {
			modelo.setProperty("/estadoPin", "Error");
			modelo.setProperty("/textoPin", texto);
		};
		const odata = this.odata();
		const pin = String(modelo.getProperty("/pin") ?? "").trim();
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		if (odata && modelo.getProperty("/crearPin")) {
			if (pin.length < PIN_MINIMO) {
				error(textos.getText("vendAdmErrPinCorto", [String(PIN_MINIMO)]));
				return;
			}
			if (pin !== String(modelo.getProperty("/pin2") ?? "").trim()) {
				modelo.setProperty("/estadoPin2", "Error");
				return;
			}
			try {
				const conPin = await fijarPin(odata, vendedor, pin, "");
				const lista = (mock.getProperty("/vendedores") as Vendedor[]) ?? [];
				mock.setProperty("/vendedores", lista.map((v) => (claveVendedor(v) === claveVendedor(vendedor) ? conPin : v)));
			} catch (e) {
				error((e as Error).message);
				return;
			}
		}
		const identificacion = await identificar(odata, vendedor, pin);
		if (!identificacion.ok) {
			error(textos.getText("vendIdPinMal"));
			return;
		}
		recordarSesion(identificacion.sesion);
		this.entrarComo(mock, vendedor);
		recordarVendedor(claveVendedor(vendedor));
		this.dialogoVendedor?.close();
	}

	/** Permite cambiar de vendedor sin recargar (el usuario SAP es compartido). */
	public async onCambiarVendedor(): Promise<void> {
		// El vendedor recordado se cambia al pulsar Entrar; si se cancela, sigue el actual.
		await this.abrirDialogoVendedor();
	}
}
