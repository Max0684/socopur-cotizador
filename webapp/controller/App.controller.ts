import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import { Router$RouteMatchedEvent } from "sap/ui/core/routing/Router";

/**
 * @namespace com.socopur.cotizador.controller
 */
export default class App extends Controller {
	public onInit(): void {
		this.getView()?.addStyleClass("sapUiSizeCompact");
		this.getView()?.setModel(new JSONModel({ layout: "OneColumn" }), "app");

		const router = (this.getOwnerComponent() as UIComponent).getRouter();
		router.attachRouteMatched(this.onRouteMatched, this);
	}

	/** El layout de columnas lo define cada ruta en el manifest. */
	private onRouteMatched(event: Router$RouteMatchedEvent): void {
		const config = event.getParameter("config") as { layout?: string };
		const appModel = this.getView()?.getModel("app") as JSONModel;
		appModel.setProperty("/layout", config.layout ?? "OneColumn");
	}
}
