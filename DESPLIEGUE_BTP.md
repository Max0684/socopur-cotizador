# Despliegue del Cotizador en SAP BTP (Cloud Foundry + Work Zone)

Publica la app en el **repositorio HTML5** del subaccount y la expone en el Launchpad **Comercial Socopur** (catálogo «Cotizador»).
La app llega a SAP por el Cloud Connector, con el destino `S4HANA_AROJAS2` (mandante 130).

## 1. Requisitos del subaccount

| Servicio | Plan | Para qué |
|---|---|---|
| HTML5 Application Repository | `app-host` (y `app-runtime` en el entorno) | Guarda la app |
| Destination | `lite` | Destino a SAP y al repositorio HTML5 |
| Authorization and Trust Management (xsuaa) | `application` | Acceso de usuarios |
| SAP Build Work Zone (standard) | suscripción | Launchpad |
| Cloud Connector | ya configurado | Ubicación `S4HANA_DEV` hacia el S/4 |

Revisar en *Entitlements* del subaccount que los planes estén asignados al subaccount y a la organización de Cloud Foundry.

El destino **`S4HANA_AROJAS2`** debe existir en el subaccount (*Connectivity → Destinations*), con la URL del S/4 por el Cloud Connector y el mandante 130.
Si el mandante no va dentro del destino, agregar la propiedad adicional `URL.queries.sap-client = 130`.

## 2. Subir el código a un repositorio Git privado

1. Crear un repositorio **privado** vacío (por ejemplo `socopur-cotizador`).
2. En este equipo, dentro de `socopur-cotizador`:
   ```
   git remote add origin <URL-del-repositorio>
   git push -u origin HEAD
   ```
   El inicio de sesión (usuario y token) lo escribe quien hace el push; no se guarda en el proyecto.

## 3. Construir y publicar desde Business Application Studio

En el dev space (Node 24, `mbt` y `cf` ya instalados):

```
git clone <URL-del-repositorio>
cd socopur-cotizador
npm install
npm run build:mta
cf login -a <API-endpoint-de-Cloud-Foundry>
cf deploy mta_archives/socopur-cotizador_0.1.0.mtar
```

- El *API endpoint* está en el cockpit: subaccount → *Overview* → *Cloud Foundry Environment*.
- `build:mta` ejecuta `npm run build:cf` (genera `dist/comsocopurcotizador.zip`) y arma el `.mtar`.
- Si `cf deploy` no existe, instalar el plugin: `cf install-plugin multiapps`.

## 4. Publicarlo en el Launchpad (Work Zone)

1. *Channel Manager* → canal **HTML5 Apps** → *Update content* (actualiza la lista de apps).
2. *Content Manager* → *Content Explorer* → **HTML5 Apps** → «Cotizador Socopur» → *Add to My Content*.
3. Crear (o reutilizar) el **grupo**, el **catálogo** «Cotizador» y el **rol** «Comercial Socopur», y asignar la app.
4. Agregar el grupo al **site** «Comercial Socopur» y publicar el site.
5. En el cockpit, asignar la colección de roles a los usuarios que van a probar.

## 5. Verificación

- Abrir el Launchpad e iniciar la app desde la tarjeta «Cotizador Socopur».
- La app usa SAP real cuando está publicada (no necesita `?odata=1`); `?odata=0` fuerza el modo de ejemplo.
- Recorrer los casos CP01 a CP17 del *Manual de pruebas funcionales*.
- Si falla una llamada a SAP: *Destinations → S4HANA_AROJAS2 → Check Connection*, y revisar los registros con `cf logs` de la app (si usa approuter propio).

## 6. Puntos de seguridad

- **Usuario compartido:** todas las acciones quedan a nombre del usuario del destino. Con `S4HANA_AROJAS2` es `STA_AROJAS` (usuario personal). Para los funcionales conviene un **destino nuevo con usuario técnico** y la autorización mínima necesaria. La clave se escribe solo en el cockpit.
- **Identificación del vendedor:** la app pide elegir al vendedor (y su PIN si lo tiene fijado), pero eso **no es autenticación**: lo que protege el acceso es el rol de Work Zone.
- No incluir claves en `mta.yaml`, `xs-app.json` ni en el código.

## 7. Retirar la publicación

```
cf undeploy socopur-cotizador --delete-services
```

Quita la app y sus servicios (repositorio, destino y xsuaa creados por este despliegue). No toca el destino `S4HANA_AROJAS2`.

## Archivos de despliegue

| Archivo | Qué hace |
|---|---|
| `mta.yaml` | Describe los módulos y servicios (HTML5 host, destination, xsuaa) |
| `xs-app.json` | Rutas: `/sap/*` va al destino `S4HANA_AROJAS2`; lo demás al repositorio HTML5 |
| `xs-security.json` | Seguridad (xsuaa) |
| `ui5-deploy.yaml` | Compilación para Cloud Foundry (zip de la app) |
| `webapp/manifest.json` | `sap.cloud.service = socopur.cotizador` y la navegación `Cotizador-display` para el Launchpad |

## Direccion del servicio segun donde se publique

- **Fiori Launchpad del S/4 (BSP) y desarrollo local:** la direccion del servicio en `webapp/manifest.json` es absoluta (`/sap/opu/odata4/...`). Es el valor normal del proyecto.
- **BTP (esta guia):** detras del approuter debe ser relativa (`sap/opu/odata4/...`). `npm run build:cf` (y por tanto `build:mta`) la cambia solo durante la compilacion y la deja de nuevo absoluta. Si se edita a mano: `node scripts/uri-servicio.mjs relativa|absoluta`.
