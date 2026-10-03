import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarClientes } from "../webapp/model/ClientesService.ts";

const fila = (vkorg: string, vtweg: string, spart = "10") => ({ Kunnr: "0100024840", Vkorg: vkorg, Vtweg: vtweg, Spart: spart, Name1: "JYAS MOTORS E.I.R.L.", Stcd1: "20123456789", Kdgrp: "03", Zterm: "C000" });

function modelo(primera: ReturnType<typeof fila>[], todas: ReturnType<typeof fila>[], falla = false) {
	let llamada = 0;
	return {
		bindList() {
			const n = ++llamada;
			return {
				async requestContexts() {
					if (n === 2 && falla) {
						throw new Error("sin lectura");
					}
					return (n === 1 ? primera : todas).map((o) => ({ getObject: () => o }));
				}
			};
		}
	} as unknown as Parameters<typeof buscarClientes>[0];
}

test("buscarClientes completa las areas de otras organizaciones (un cliente de repuestos 1103 tambien vende vehiculos 1101)", async () => {
	const r = await buscarClientes(modelo([fila("1103", "10", "50")], [fila("1103", "10", "50"), fila("1101", "11")]), "JYAS", "1103");
	assert.equal(r.length, 1);
	assert.deepEqual(r[0].areas.sort(), ["1101/11/10", "1103/10/50"]);
});

test("buscarClientes conserva las areas ya leidas si falla la lectura de todas", async () => {
	const r = await buscarClientes(modelo([fila("1103", "10", "50")], [], true), "JYAS", "1103");
	assert.deepEqual(r[0].areas, ["1103/10/50"]);
});
