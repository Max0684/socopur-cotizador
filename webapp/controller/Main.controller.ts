import Controller from "sap/ui/core/mvc/Controller";
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

/**
 * Lista de ofertas (equivale a un List Report de Fiori).
 * @namespace com.socopur.cotizador.controller
 */
export default class Main extends Controller {
	private router!: Router;
	private forzado = false;

	public onInit(): void {
		this.router = (this.getOwnerComponent() as UIComponent).getRouter();
		// Los datos de clientes no se muestran hasta que el usuario los pide (buscando o con "Ver mis ofertas").
		this.getView()?.setModel(new JSONModel({ consultado: false }), "vista");
		const mock = (this.getOwnerComponent() as UIComponent).getModel("mock") as JSONModel;
		mock.dataLoaded().then(() => this.actualizarVigencias(mock));
	}

	/** La vigencia es fecha de la oferta + dias del perfil (en SAP: ZTSD_CONFIG_OFER, hoy 7 dias). Vencida si ya paso y no tiene pedido. */
	private actualizarVigencias(mock: JSONModel): void {
		const dias = Number(mock.getProperty("/perfil/vigenciaDias")) || 7;
		const hoy = new Date().toISOString().slice(0, 10);
		const i18n = (this.getOwnerComponent() as UIComponent).getModel("i18n") as unknown as { getResourceBundle(): { getText(k: string): string } };
		const ofertas = (mock.getProperty("/ofertas") as { fecha: string; estado: string; estadoState: string; vence?: string }[]) ?? [];
		ofertas.forEach((o) => {
			const vence = new Date(o.fecha);
			vence.setDate(vence.getDate() + dias);
			o.vence = vence.toISOString().slice(0, 10);
			if (o.estado !== i18n.getResourceBundle().getText("estadoPedido")) {
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
		return `N° ${numero} · ${this.formatFecha(fecha)}`;
	}

	public onVerMisOfertas(): void {
		(this.getView()?.getModel("vista") as JSONModel).setProperty("/consultado", true);
		this.forzado = true;
		this.onFiltrar();
	}

	public onNuevaOferta(): void {
		this.router.navTo("nueva");
	}

	public onSeleccionar(event: Event<{ listItem: ListItemBase }>): void {
		const item = event.getParameter("listItem");
		const numero = item.getBindingContext("mock")?.getProperty("numero") as string;
		this.router.navTo("oferta", { numero });
	}

	/** Los filtros son siempre visibles (UX): se aplican al escribir o al cambiar. */
	public onFiltrar(): void {
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
		vista.setProperty("/consultado", filtros.length > 0 || this.forzado);
		const binding = (this.byId("tabla") as List).getBinding("items") as ListBinding;
		binding.filter(filtros);
	}
}
