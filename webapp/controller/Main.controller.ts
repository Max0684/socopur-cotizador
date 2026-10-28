import Controller from "sap/ui/core/mvc/Controller";
import { usarOData as usarODataActual } from "com/socopur/cotizador/model/Modo";
import View from "sap/ui/core/mvc/View";
import UIComponent from "sap/ui/core/UIComponent";
import Router from "sap/ui/core/routing/Router";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import List from "sap/m/List";
import SearchField from "sap/m/SearchField";
import Select from "sap/m/Select";
import DateRangeSelection from "sap/m/DateRangeSelection";
import ListItemBase from "sap/m/ListItemBase";
import Event from "sap/ui/base/Event";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import MessageToast from "sap/m/MessageToast";
import { cargarOfertas } from "com/socopur/cotizador/model/OfertasService";

/**
 * Lista de ofertas (equivale a un List Report de Fiori).
 * @namespace com.socopur.cotizador.controller
 */
export default class Main extends Controller {
	private router!: Router;
	private forzado = false;
	/** PERNR con el que se leyo la lista de SAP; si no es el del vendedor identificado, se vuelve a leer antes de mostrarla. */
	private pernrDeLista: string | undefined;
	private cargaEnCurso: Promise<void> | undefined;

	public onInit(): void {
		this.router = (this.getOwnerComponent() as UIComponent).getRouter();
		// Los datos de clientes no se muestran hasta que el usuario los pide (buscando o con "Ver mis ofertas").
		this.getView()?.setModel(new JSONModel({ consultado: false }), "vista");
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		mock.dataLoaded().then(async () => {
			// Sin vendedor identificado no se lee SAP: sin PERNR la lista traeria las ofertas de todos los vendedores (pruebas 28/10/2026).
			if (this.usarOData() && this.pernrActual()) {
				await this.cargarDesdeOData(mock);
			}
			this.actualizarVigencias(mock);
		});
		// Usuario SAP compartido: al cambiar de vendedor, lo que habia en pantalla era del anterior.
		mock.bindProperty("/perfil/pernr").attachChange(() => this.olvidarLista());
	}

	private pernrActual(): string {
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		return String(mock.getProperty("/perfil/pernr") ?? "");
	}

	private olvidarLista(): void {
		this.pernrDeLista = undefined;
		this.forzado = false;
		(this.getView()?.getModel("vista") as JSONModel | undefined)?.setProperty("/consultado", false);
	}

	/**
	 * Lee la lista de SAP si la que hay no es del vendedor identificado; si ya hay una lectura en curso, la espera en vez de repetirla. El
	 * segundo intento cubre un cambio de vendedor mientras se leia la lista del anterior.
	 */
	private async asegurarListaDelVendedor(mock: JSONModel): Promise<void> {
		for (let intento = 0; intento < 2 && this.pernrDeLista !== this.pernrActual(); intento++) {
			if (!this.cargaEnCurso) {
				this.cargaEnCurso = this.cargarDesdeOData(mock)
					.then(() => this.actualizarVigencias(mock))
					.finally(() => (this.cargaEnCurso = undefined));
			}
			await this.cargaEnCurso;
		}
	}

	public onAdministrarVendedores(): void {
		this.router.navTo("vendedores");
	}

	/** El usuario SAP es compartido: el boton del vendedor reabre la identificacion que vive en el controlador de la App. */
	public onCambiarVendedor(): void {
		const raiz = (this.getOwnerComponent() as UIComponent).getRootControl() as View;
		void (raiz.getController() as unknown as { onCambiarVendedor(): Promise<void> }).onCambiarVendedor();
	}

	/** La lista lee del servicio real con ?odata=1 o publicada fuera de localhost; si no, sigue con los datos simulados. */
	private usarOData(): boolean {
		return usarODataActual();
	}

	private async cargarDesdeOData(mock: JSONModel): Promise<void> {
		const componente = this.getOwnerComponent() as UIComponent;
		const odata = componente.getModel("odata") as ODataModel | undefined;
		const i18n = componente.getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string, a?: string[]): string } };
		const textos = i18n.getResourceBundle();
		if (!odata) {
			return;
		}
		const pernr = this.pernrActual();
		if (!pernr) {
			mock.setProperty("/ofertas", []);
			this.pernrDeLista = "";
			return;
		}
		try {
			const ofertas = await cargarOfertas(odata, textos.getText("estadoPedido"), pernr);
			mock.setProperty("/ofertas", ofertas);
		} catch (error) {
			// Si el servicio falla se avisa y la lista queda vacia: lo que habia era de ejemplo o de otro vendedor. No se reintenta en cada
			// tecla del buscador; "Ver mis ofertas" vuelve a leer.
			mock.setProperty("/ofertas", []);
			MessageToast.show(textos.getText("odataError", [(error as Error).message]));
		}
		this.pernrDeLista = pernr;
	}

	/** La vigencia es fecha de la oferta + dias del perfil (en SAP: ZTSD_CONFIG_OFER, hoy 7 dias). Vencida si ya paso y no tiene pedido. */
	private actualizarVigencias(mock: JSONModel): void {
		const dias = Number(mock.getProperty("/perfil/vigenciaDias")) || 7;
		const hoy = new Date().toISOString().slice(0, 10);
		const i18n = (this.getOwnerComponent() as UIComponent).getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string): string } };
		const ofertas = (mock.getProperty("/ofertas") as { fecha: string; estado: string; estadoState: string; vence?: string; anulada?: boolean; motivoError?: string; enProceso?: boolean }[]) ?? [];
		ofertas.forEach((o) => {
			const vence = new Date(o.fecha);
			vence.setDate(vence.getDate() + dias);
			o.vence = vence.toISOString().slice(0, 10);
			// Sin oferta SAP no hay vigencia que mostrar: o SAP no la creo (con su motivo debajo) o todavia se esta creando.
			if (o.motivoError !== undefined || o.enProceso) {
				o.estado = i18n.getResourceBundle().getText(o.enProceso ? "estadoOfertaEnProceso" : "estadoOfertaFallida");
				o.estadoState = o.enProceso ? "Information" : "Error";
				o.vence = "";
			} else if (o.anulada) {
				o.estado = i18n.getResourceBundle().getText("estadoAnulada");
				o.estadoState = "Error";
			} else if (o.estado !== i18n.getResourceBundle().getText("estadoPedido")) {
				const vencida = o.vence < hoy;
				o.estado = i18n.getResourceBundle().getText(vencida ? "estadoVencida" : "estadoVigente");
				o.estadoState = vencida ? "Warning" : "Success";
			}
		});
		mock.setProperty("/ofertas", ofertas);
	}

	public formatVence(vence: string): string {
		if (!vence) {
			return "";
		}
		const [y, m, d] = vence.split("-");
		return `Vence ${d}/${m}/${y}`;
	}

	public formatFecha(iso: string): string {
		if (!iso) {
			return "";
		}
		const [y, m, d] = iso.split("-");
		return `${d}/${m}/${y}`;
	}

	public formatNumFecha(numero: string, fecha: string): string {
		if (!numero) {
			const i18n = (this.getOwnerComponent() as UIComponent).getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string): string } };
			return `${i18n.getResourceBundle().getText("listaSinNumero")} · ${this.formatFecha(fecha)}`;
		}
		return `N° ${numero} · ${this.formatFecha(fecha)}`;
	}

	/** Sin vendedor identificado no se consulta ni se cotiza: se vuelve a abrir la identificacion. */
	private sinVendedor(): boolean {
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		if (mock.getProperty("/perfil/vendedor")) {
			return false;
		}
		this.onCambiarVendedor();
		return true;
	}

	public async onVerMisOfertas(): Promise<void> {
		if (this.sinVendedor()) {
			return;
		}
		(this.getView()?.getModel("vista") as JSONModel).setProperty("/consultado", true);
		this.forzado = true;
		// El vendedor se identifica despues de abrir la pantalla: se vuelve a leer con su PERNR antes de mostrar.
		if (this.usarOData()) {
			const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
			await this.cargarDesdeOData(mock);
			this.actualizarVigencias(mock);
		}
		await this.onFiltrar();
	}

	public onNuevaOferta(): void {
		if (this.sinVendedor()) {
			return;
		}
		this.router.navTo("nueva");
	}

	public onSeleccionar(event: Event<{ listItem: ListItemBase }>): void {
		const item = event.getParameter("listItem");
		const contexto = item.getBindingContext("mock");
		// Una oferta real sin numero SAP todavia (aun no se genero) se abre con su identificador de cotizacion.
		const numero = (contexto?.getProperty("numero") as string) || (contexto?.getProperty("cotizId") as string);
		this.router.navTo("oferta", { numero });
	}

	/**
	 * Los filtros son siempre visibles (UX): se aplican al escribir o al cambiar. Con SAP real filtran solo las ofertas del vendedor
	 * identificado: la lista se vuelve a leer si es de otro vendedor (o se leyo antes de que se identificara).
	 */
	public async onFiltrar(): Promise<void> {
		const texto = (this.byId("filtroTexto") as SearchField).getValue().trim();
		const estado = (this.byId("filtroEstado") as Select).getSelectedKey();
		const rango = this.byId("filtroFechas") as DateRangeSelection;
		const desde = rango.getDateValue();
		const hasta = rango.getSecondDateValue();

		const filtros: Filter[] = [];
		if (texto) {
			filtros.push(
				new Filter({
					filters: [
						new Filter("cliente", FilterOperator.Contains, texto),
						new Filter("doc", FilterOperator.Contains, texto),
						new Filter("numero", FilterOperator.Contains, texto)
					],
					and: false
				})
			);
		}
		if (estado) {
			filtros.push(new Filter("estado", FilterOperator.EQ, estado));
		}
		if (desde && hasta) {
			const iso = (d: Date): string =>
				`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			const from = iso(desde);
			const to = iso(hasta);
			filtros.push(
				new Filter({
					path: "fecha",
					test: (value: string) => value >= from && value <= to
				})
			);
		}

		const vista = this.getView()?.getModel("vista") as JSONModel;
		if (filtros.length) {
			this.forzado = false;
		}
		const mostrar = filtros.length > 0 || this.forzado;
		if (mostrar && this.usarOData()) {
			if (this.sinVendedor()) {
				return;
			}
			await this.asegurarListaDelVendedor((this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel);
		}
		vista.setProperty("/consultado", mostrar);
		const binding = (this.byId("tabla") as List).getBinding("items") as ListBinding;
		binding.filter(filtros);
	}
}
