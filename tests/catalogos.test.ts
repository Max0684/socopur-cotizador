import { test } from "node:test";
import assert from "node:assert/strict";
import { centrosDeFilas, leerCentros, leerOficinas, opcionesDeOficinas } from "../webapp/model/CatalogosService.ts";

const como = (m: unknown) => m as Parameters<typeof leerCentros>[0];

test("opcionesDeOficinas arma 'codigo nombre' ordenado por codigo", () => {
	const o = opcionesDeOficinas([
		{ Vkbur: "1101", NombreOficina: "PCP - CENTENARIO" },
		{ Vkbur: "1001", NombreOficina: "LIMA - ATE" }
	]);
	assert.deepEqual(o, [
		{ key: "1001", text: "1001 LIMA - ATE" },
		{ key: "1101", text: "1101 PCP - CENTENARIO" }
	]);
});

test("centrosDeFilas devuelve codigos ordenados y los nombres", () => {
	const c = centrosDeFilas([
		{ Werks: "1201", NombreCentro: "IQUITOS - QUINONES" },
		{ Werks: "1001", NombreCentro: "LIMA - ATE" }
	]);
	assert.deepEqual(c.codigos, ["1001", "1201"]);
	assert.equal(c.nombres["1001"], "LIMA - ATE");
});

test("leerCentros y leerOficinas filtran por organizacion y canal", async () => {
	const pedidos: { ruta: string; filtro: string }[] = [];
	const modelo = {
		bindList(ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: { $filter?: string }) {
			pedidos.push({ ruta, filtro: p?.$filter ?? "" });
			return {
				async requestContexts() {
					return ruta === "/Centro"
						? [{ getObject: () => ({ Werks: "1101", NombreCentro: "PUCALLPA - CENTENARIO" }) }]
						: [{ getObject: () => ({ Vkbur: "1101", NombreOficina: "PCP - CENTENARIO" }) }];
				}
			};
		}
	};
	const c = await leerCentros(como(modelo), "1103", "10");
	const o = await leerOficinas(como(modelo), "1103", "10");
	assert.deepEqual(c.codigos, ["1101"]);
	assert.equal(o[0].text, "1101 PCP - CENTENARIO");
	assert.deepEqual(pedidos.map((p) => p.ruta), ["/Centro", "/Oficina"]);
	assert.ok(pedidos.every((p) => p.filtro === "Vkorg eq '1103' and Vtweg eq '10'"));
});

test("opcionesDeAlmacenes deja solo los de venta, con nombre y en orden (centro 1101: 0019, 0088, 0100 y 0200 fuera)", async () => {
	const { opcionesDeAlmacenes } = await import("../webapp/model/CatalogosService.ts");
	const r = opcionesDeAlmacenes([
		{ Lgort: "0004", NombreAlmacen: "TDA", EsVenta: true },
		{ Lgort: "0088", NombreAlmacen: "Lager 0088 (WM)", EsVenta: false },
		{ Lgort: "0001", NombreAlmacen: "CENTENARIO / PCP", EsVenta: "X" },
		{ Lgort: "0019", NombreAlmacen: "TRANSF", EsVenta: "" }
	]);
	assert.deepEqual(r, [
		{ key: "0001", text: "0001 CENTENARIO / PCP" },
		{ key: "0004", text: "0004 TDA" }
	]);
});
