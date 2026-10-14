/**
 * Cambia la direccion del servicio OData en webapp/manifest.json segun donde se publique la app.
 *   node scripts/uri-servicio.mjs absoluta   -> "/sap/opu/..."  (Fiori Launchpad del S/4 y desarrollo local; es el valor normal)
 *   node scripts/uri-servicio.mjs relativa   -> "sap/opu/..."   (publicada en BTP detras del approuter; ver DESPLIEGUE_BTP.md)
 */
import { readFileSync, writeFileSync } from "node:fs";

const modo = process.argv[2];
if (modo !== "absoluta" && modo !== "relativa") {
	console.error("Uso: node scripts/uri-servicio.mjs absoluta|relativa");
	process.exit(1);
}
const ruta = new URL("../webapp/manifest.json", import.meta.url);
const texto = readFileSync(ruta, "utf8");
const patron = /("uri": ")\/?(sap\/opu\/odata4\/[^"]*")/;
if (!patron.test(texto)) {
	console.error("No se encontro la direccion del servicio en manifest.json");
	process.exit(1);
}
const nuevo = texto.replace(patron, (_t, a, b) => `${a}${modo === "absoluta" ? "/" : ""}${b}`);
writeFileSync(ruta, nuevo);
JSON.parse(nuevo);
console.log(nuevo.match(patron)?.[0]);
