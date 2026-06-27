# Frontend — Vecindarios y casas

Feature de **casas de usuario** dentro de un place `Type:'neighborhood'`. Contrato del
backend en `force-back/src/api/house/README.md`.

## Capa API (`src/api/`)

- **types.ts** — `NeighborhoodParcels`, `NeighborhoodParcel`, `HouseDesignInfo`, `House`,
  `HousePlacement`, `HouseDesign`, `HouseResponse`, `HouseBuyResponse`, `HouseVisibility`.
  `Place.Type` e `Item.category` extendidos con `neighborhood` / `furniture`.
- **services.ts** — `housesService`: `getParcels(placeId)`, `buy(placeId, parcelIndex,
  designId)`, `getMine()`, `getHouse(id)`, `place(id, itemId, x, y)`, `remove(id, x, y)`,
  `setVisibility(id, v)`. El token lo adjunta el interceptor de `client.ts`.

No hay hooks dedicados: las vistas hacen fetch inline con `useState/useEffect` (igual que
`ShopBody`/`TrainingBody`).

## Vistas

- **Mapa de parcelas** — `NeighborhoodBody` en `explore/[worldId]/places/[placeId]/page.tsx`
  (branch `a.Type === 'neighborhood'`). Grid `cols×rows` (clases `.nbh-*`): cada parcela
  usa `parcelImage` (libre) o la imagen del diseño (ocupada), con el nombre del dueño +
  candado si es privada. Click en libre → panel de compra (elegir variante de `designs`) →
  `housesService.buy`, luego entra a la casa. Click en ocupada con `canEnter` → entra; si es
  privada ajena, toast. Deshabilita comprar si ya tenés casa (`myHouseId`).
- **Interior de la casa** — `houses/[houseId]/page.tsx`. Grilla `width×height` (clases
  `.house-*`) sobre el fondo `Interior` del diseño. **Dueño**: paleta de muebles del
  inventario (`category==='furniture'`); tocar un cubo libre coloca el seleccionado
  (`place`, consume 1), tocar uno ocupado lo quita (`remove`, devuelve 1); botón de
  visibilidad (`setVisibility`). **Visitante** (casa pública): solo lectura. La casa local
  se actualiza con la respuesta de cada acción.

Las imágenes faltantes caen a fallbacks (`thumbFallback`, sin fondo de grilla).
