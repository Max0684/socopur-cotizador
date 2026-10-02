import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import { ordenarCatalogos } from "com/socopur/cotizador/model/Orden";

/**
 * @namespace com.socopur.cotizador
 */
export default class Component extends UIComponent {
	public static metadata = {
		manifest: "json",
		interfaces: ["sap.ui.core.IAsyncContentCreation"]
	};

	public init(): void {
		super.init();
		// Los desplegables salen en orden alfabetico: se ordenan los catalogos una vez, al cargar el modelo de ejemplo.
		const mock = this.getModel("mock") as JSONModel;
		void mock.dataLoaded().then(() => ordenarCatalogos(mock));
		this.getRouter().initialize();
	}
}
