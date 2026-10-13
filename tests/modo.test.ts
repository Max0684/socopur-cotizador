import { test } from "node:test";
import assert from "node:assert/strict";
import { usarODataEn } from "../webapp/model/Modo.ts";

test("usarODataEn: ?odata=1 fuerza SAP y ?odata=0 fuerza el prototipo, en cualquier servidor", () => {
	assert.equal(usarODataEn("?odata=1", "localhost"), true);
	assert.equal(usarODataEn("?odata=1", "app.example.com"), true);
	assert.equal(usarODataEn("?odata=0", "app.example.com"), false);
	assert.equal(usarODataEn("?odata=0", "localhost"), false);
});

test("usarODataEn: sin marca, localhost queda en prototipo y un servidor publicado usa SAP real", () => {
	assert.equal(usarODataEn("", "localhost"), false);
	assert.equal(usarODataEn("", "127.0.0.1"), false);
	assert.equal(usarODataEn("?otro=1", "localhost"), false);
	assert.equal(usarODataEn("", "socopur.launchpad.cfapps.us10.hana.ondemand.com"), true);
	assert.equal(usarODataEn("?sap-ushell-config=x", "socopur.launchpad.cfapps.us10.hana.ondemand.com"), true);
});
