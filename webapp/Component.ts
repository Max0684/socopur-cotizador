import UIComponent from "sap/ui/core/UIComponent";

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
		this.getRouter().initialize();
	}
}
