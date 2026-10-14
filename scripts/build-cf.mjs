/**
 * Compila la app para BTP (Cloud Foundry): pone la direccion del servicio relativa, compila y la deja de nuevo absoluta,
 * que es el valor normal del proyecto (S/4 y desarrollo local). Ver scripts/uri-servicio.mjs.
 */
import { spawnSync } from "node:child_process";

const node = process.execPath;
const uri = (modo) => spawnSync(node, ["scripts/uri-servicio.mjs", modo], { stdio: "inherit" }).status === 0;

if (!uri("relativa")) {
	process.exit(1);
}
const res = spawnSync("npx", ["ui5", "build", "preload", "--clean-dest", "--config", "ui5-deploy.yaml", "--include-task=generateCachebusterInfo"], { stdio: "inherit", shell: true });
uri("absoluta");
process.exit(res.status ?? 1);
