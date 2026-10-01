// Genera webapp/model/odata/Entidades.ts a partir de webapp/localService/mainService/metadata.xml
// (el $metadata del servicio YUI_COTIZ_SRV). Uso: npm run gen:types
// Sin dependencias: lee el EDMX con expresiones regulares (suficiente para este servicio).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "webapp/localService/mainService/metadata.xml");
const destino = join(raiz, "webapp/model/odata/Entidades.ts");
const xml = readFileSync(origen, "utf8");

const tipoTs = (edm) => {
	switch (edm) {
		case "Edm.Boolean":
			return "boolean";
		case "Edm.Int16":
		case "Edm.Int32":
		case "Edm.Byte":
			return "number";
		// Guid, String, Decimal, Date y DateTimeOffset viajan como string en el modelo OData V4 de UI5.
		default:
			return "string";
	}
};

const entidades = [];
for (const m of xml.matchAll(/<EntityType Name="(\w+)">([\s\S]*?)<\/EntityType>/g)) {
	const [, nombre, cuerpo] = m;
	const claves = [...cuerpo.matchAll(/<PropertyRef Name="(\w+)"/g)].map((x) => x[1]);
	const props = [...cuerpo.matchAll(/<Property Name="(\w+)" Type="([\w.]+)"([^>]*)\/?>/g)].map((x) => ({
		nombre: x[1],
		tipo: tipoTs(x[2]),
		nulable: !/Nullable="false"/.test(x[3]),
		edm: x[2]
	}));
	const nav = [...cuerpo.matchAll(/<NavigationProperty Name="(\w+)" Type="([^"]+)"/g)].map((x) => ({
		nombre: x[1],
		coleccion: x[2].startsWith("Collection("),
		destino: x[2].replace(/^Collection\(/, "").replace(/\)$/, "").split(".").pop().replace(/Type$/, "")
	}));
	entidades.push({ nombre: nombre.replace(/Type$/, ""), claves, props, nav });
}

const sets = [...xml.matchAll(/<EntitySet Name="(\w+)" EntityType="[\w.]+?\.(\w+)"/g)].map((x) => `${x[1]}: ${x[2].replace(/Type$/, "")}`);

let out = `// GENERADO por scripts/gen-odata-types.mjs desde localService/mainService/metadata.xml. No editar a mano.\n`;
out += `// Servicio: YUI_COTIZ_SRV (OData V4). Decimal, Date y DateTimeOffset llegan como string en UI5.\n\n`;
for (const e of entidades) {
	out += `/** Claves: ${e.claves.join(", ")} */\nexport interface ${e.nombre} {\n`;
	for (const p of e.props) {
		out += `\t${p.nombre}${p.nulable ? "?" : ""}: ${p.tipo};\n`;
	}
	for (const n of e.nav) {
		out += `\t${n.nombre}?: ${n.destino}${n.coleccion ? "[]" : ""};\n`;
	}
	out += `}\n\n`;
}
out += `/** Nombre del conjunto de entidades -> tipo. */\nexport interface ConjuntosCotizador {\n${sets.map((s) => `\t${s};`).join("\n")}\n}\n`;
writeFileSync(destino, out);
console.log(`OK: ${entidades.length} tipos, ${sets.length} conjuntos -> ${destino}`);
