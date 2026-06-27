# Motor de vecindarios / casas (`house`)

Un place `Type:'neighborhood'` es un **vecindario**: un mapa de **parcelas** (grilla
`cols×rows`) donde cada usuario puede comprar **una casa** (una sola en todo el juego).
La casa ocupa una parcela y guarda una **grilla interior de 15×15 cubos** (ampliable);
en cada cubo se coloca un **mueble** (`item.category === 'furniture'`). Colocar un mueble
**consume 1** del inventario; quitarlo lo **devuelve**.

API **code-only sobre el content type** (patrón `companion`): `controllers/house.js`
(lógica de negocio) + `routes/house.js` (rutas custom, sin `createCoreRouter` para no
exponer CRUD ni colisionar con `GET /houses/:id`) + `engine.js` (helpers de REST-shaping
y resolución del mapa de parcelas).

## Content types

- **`house`** — `owner`→user, `place`→place (vecindario), `design`→house-design,
  `parcelIndex` (int), `visibility` (`public`/`private`, default `private`),
  `width`/`height` (default 15), `placements` (1-N → house-placement). Invariantes
  (server-side): 1 casa por usuario, 1 casa por parcela.
- **`house-placement`** — `house`→house, `item`→item, `x`/`y` (int 0..size-1).
- **`house-design`** — variantes que ofrece un vecindario: `Name`, `Image` (exterior en
  el mapa), `Interior` (fondo de la grilla), `place`→place. (Patrón `trainer`→place.)

## Config del place (vecindario)

- `place.NeighborhoodConfig` (json, marcador `seeded:true` como `ShopConfig`):
  `{ cols, rows, price }`. `cols*rows` = nº de parcelas. Cae a `{cols:5,rows:4,price:300}`.
- `place.ParcelImage` (media) — imagen de la parcela libre.

## Endpoints

| método | ruta | auth | qué hace |
|---|---|---|---|
| GET | `/neighborhoods/:placeId/parcels` | público | Mapa: `{ cols, rows, price, parcelImageUrl, designs:[{id,name,imageUrl,interiorUrl}], parcels:[{ index, occupied, owner, visibility, houseId, designImageUrl, canEnter, mine }], myHouseId }`. `canEnter = public || mía`. Usa la sesión si viene token. |
| POST | `/neighborhoods/:placeId/buy` | sí | `{ parcelIndex, designId }`. Valida vecindario, parcela libre, diseño del vecindario, **sin casa previa**, saldo ≥ price. Cobra y crea la casa. → `{ data: House, balance }`. |
| GET | `/houses/mine` | sí | Mi casa (o `null`). → `{ data, isOwner:true }`. |
| GET | `/houses/:id` | público | Entrar: pública para cualquiera, privada solo dueño (403 si no). → `{ data: House, isOwner }`. |
| POST | `/houses/:id/place` | sí (dueño) | `{ itemId, x, y }`. Valida cubo libre, `category==='furniture'`, tenencia. **Consume 1**. → `{ data: House, isOwner:true }`. |
| POST | `/houses/:id/remove` | sí (dueño) | `{ x, y }`. Borra el mueble y **devuelve +1** al inventario. → casa actualizada. |
| POST | `/houses/:id/visibility` | sí (dueño) | `{ visibility }` (`public`/`private`). → casa actualizada. |

Permisos: `parcels`/`detail` al rol **Public**; el resto al **Authenticated**
(sembrados en `src/seed.js`).

## Seed

`src/seed.js` crea idempotente el vecindario demo **"Villa Robledal"** (Eryndor, región
Valle de los Ecos Verdes) con su `NeighborhoodConfig` + 3 `house-design`, y siembra el
**catálogo de mobiliario** (26 items `category:'furniture'`, sección "Mobiliario y
misceláneos" del design system) vía `scripts/seed-furniture.js` (`seedFurniture`) — precios
y descripciones a medida del diseño (excluidos del reescalado canónico de `priceFor`). Ese
módulo es de **doble uso**: lo llama el bootstrap y también se puede ejecutar standalone
(`SEED=false node scripts/seed-furniture.js`) para poblar local (`docker exec`) y prod
(`ssh railway-back`) sin esperar un redeploy. Las imágenes (parcela, diseños, íconos de
mueble) son **opcionales**: si faltan el front usa fallbacks; se cargan luego por el admin
o la skill `upload-image` (los íconos del diseño son `items/m-*.png`).

## Agregar un vecindario

Un place `Type:'neighborhood'` + su `NeighborhoodConfig` + filas `house-design` con su
`place`. Sin cambios de schema.
