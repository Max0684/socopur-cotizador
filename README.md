# Cotizador Socopur (YCOTIZ)

Proyecto base de la app Cotizador: **UI5 Freestyle + TypeScript**, OData V4 contra un RAP en namespace `Y` (aun no construido).
Story 1.0 de `epics.md`. Decisiones de diseno en `Proyecto Socopur/03_Arquitectura/architecture-socopur-cotizador.md`.

## Comandos

| Comando | Que hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm start` | Servidor local con recarga (abre `index.html`) |
| `npm run typecheck` | Revisa tipos de TypeScript sin generar archivos |
| `npm run build` | Genera `dist/` (transpila, minifica, arma el preload) |
| `npm run lint` | UI5 linter |

## Estructura

```
webapp/
  Component.ts              componente y router
  manifest.json             descriptor (id com.socopur.cotizador, minUI5Version 1.120.0)
  controller/               App y Main (vacios, punto de partida)
  view/                     App.view.xml, Main.view.xml
  i18n/                     textos en espanol
```

## Pendiente antes de seguir

1. **Version de UI5 del cliente:** se desarrolla con 1.120.52, pero la version real la fija el frontend server de S/4 de Socopur. Confirmar y ajustar `minUI5Version` (manifest.json) y `framework.version` (ui5.yaml).
2. **Repositorio gCTS `socopur-cotizador`:** este directorio es un repo git local. Falta enlazarlo con gCTS (requiere acceso a SAP).
3. **Fuente de datos:** no hay `dataSources` en el manifest hasta que exista el servicio OData del RAP.
4. **Aviso del build** sobre el locale `en` en i18n: cosmetico, la app es solo en espanol.
5. **`npm audit`:** 8 avisos en dependencias de desarrollo (herramientas de build, no se publican con la app). Revisar antes de conectar a un pipeline.
