import { test } from "node:test";
import assert from "node:assert/strict";
import { base64ABytes, leerPdfOferta, numerosParaImprimir, pdfPublicado } from "../webapp/model/ImpresionService.ts";

const como = (m: unknown) => m as Parameters<typeof leerPdfOferta>[0];

test("numerosParaImprimir junta las ofertas guardadas y la abierta, sin repetir ni textos que no son numero SAP", () => {
	assert.deepEqual(numerosParaImprimir([{ numero: "3100007419" }, { numero: "95004071" }, { numero: "" }], "3100007419"), ["3100007419", "95004071"]);
	assert.deepEqual(numerosParaImprimir([], "Borrador"), []);
	assert.deepEqual(numerosParaImprimir([{ numero: "0004530-2" }], ""), []);
});

test("base64ABytes acepta base64 y base64url, con o sin relleno", () => {
	assert.deepEqual([...base64ABytes("JVBERi0=")], [37, 80, 68, 70, 45]);
	assert.deepEqual([...base64ABytes("JVBERi0")], [37, 80, 68, 70, 45]);
	assert.deepEqual([...base64ABytes("-_8")], [251, 255]);
});

test("leerPdfOferta filtra por el numero y devuelve los bytes; sin PDF falla con el motivo de SAP", async () => {
	let filtro = "";
	const modelo = (fila: Record<string, unknown>) => ({
		bindList(_ruta: string, _a?: unknown, _b?: unknown, _c?: unknown, p?: { $filter?: string }) {
			filtro = p?.$filter ?? "";
			return { async requestContexts() { return [{ getObject: () => fila }]; } };
		}
	});
	const pdf = await leerPdfOferta(como(modelo({ Vbeln: "3100007419", Pdf: "JVBERi0", Nombre: "Oferta 3100007419.pdf" })), "3100007419");
	assert.equal(filtro, "Vbeln eq '3100007419'");
	assert.equal(pdf.nombre, "Oferta 3100007419.pdf");
	assert.equal(new TextDecoder().decode(pdf.bytes), "%PDF-");
	await assert.rejects(() => leerPdfOferta(como(modelo({ Vbeln: "1", Pdf: "", Mensaje: "No existe la oferta o pedido 1" })), "1"), /No existe la oferta/);
});

test("pdfPublicado mira OfertaPdf/Pdf en el $metadata", async () => {
	const con = { getMetaModel: () => ({ requestObject: async (r: string) => (r === "/OfertaPdf/Pdf" ? {} : undefined) }) };
	assert.equal(await pdfPublicado(como(con)), true);
	assert.equal(await pdfPublicado(como({ getMetaModel: () => ({ requestObject: async () => undefined }) })), false);
});
