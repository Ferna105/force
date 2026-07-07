# Motor de Eventos

Un **evento** (`event`) encapsula un questline multi-paso con recompensa. Es
genérico: el descubrimiento de la luna Deo será una instancia. Toda la lógica
vive en `src/api/event/engine.js` (code-only sobre el content type `event`; sin
`createCoreRouter`).

## Content types

- **`event`** — `Name`, `Description`, `active` (bool), `startsAt` (datetime),
  `steps` (json), `rewards` (json), `Image` (media). Un evento se muestra/corre
  solo si `active` y `startsAt <= now`.
- **`event-progress`** — progreso por usuario (1 fila por `user`+`event`):
  `currentStep`, `completedSteps` (json), `state` (json de puzzle),
  `status` (`not_started`/`in_progress`/`completed`), `startedAt`, `completedAt`.

## Pasos (`event.steps`)

Lista ordenada de `{ key, type, params, label }`. Se evalúan en orden y se corta
en el primer pendiente (`currentStep` = índice del primero no cumplido).

- `type: "flag"` — paso **interactivo**: se cumple cuando `state[params.flag || key]`
  es truthy. Se marca vía `POST /events/:id/step/:key` (ver `STEP_RESOLVERS`).
- Cualquier tipo de los `EVALUATORS` de descubrimiento (`visit_place`,
  `play_place`, `own_item`, `buy_item`, `own_item_of_rarity`, …) — paso
  **pasivo**: se resuelve solo contra el historial/inventario del usuario.

Agregar un tipo de paso interactivo con validación (traducción, coordenadas,
telescopio…) = una entrada en `STEP_RESOLVERS` (recibe `(step, body, ctx)` y
devuelve `{ ok, patch, error }`). Los pasos pasivos nuevos = agregar el evaluador
en `discovery/engine.js` (`EVALUATORS`), que este motor reutiliza.

## Recompensas (`event.rewards`)

`{ coins?, items?: [{ name|itemId, quantity }], discoverWorld?: "<Nombre>" }`.
Se otorgan **una sola vez** al completar (idempotente por `completedAt`):
suma `coins` al `balance`, agrega los `items` al inventario, y `discoverWorld`
conecta el mundo + su región + sus lugares al usuario vía
`discovery/engine.discoverWorldTree` (se vuelven visibles por el gating de Fase 0).

## Endpoints (auth)

- `GET /events/active` → `{ events: [view] }` — activos + progreso del usuario.
- `GET /events/:id` → `{ event: view }`.
- `POST /events/:id/step/:key` (body específico del paso) → `{ view, rewardsGranted }`.
  Valida evento activo, que el paso exista, sea interactivo y sea el **paso actual**
  (no se puede saltear). Idempotente si el paso ya estaba cumplido.

`view` = `{ eventId, name, description, active, startsAt, status, currentStep,
total, steps: [{ key, label, type, done, current }], state }`.

Permisos (`event.active`/`event.detail`/`event.step`) al rol Authenticated en
`src/seed.js`. El seed crea un **evento demo** (`Evento demo (motor)`,
`active:false`) para validar el motor.
