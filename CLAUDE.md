# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-part project (each subfolder is its own git repo and npm package):

- `force-back/` — Strapi 4.25 headless CMS (Node 18–20, JavaScript/CommonJS). Owns the data model and REST API.
- `force-front/` — Next.js 15 App Router app (React 19, TypeScript, Tailwind v4) that consumes the Strapi API.

The domain is a game-world catalog: **Worlds** contain **Places** and **Monsters** (each monster belongs to one world); **Items** are a standalone catalog; authenticated **Users** own Items (inventory, many-to-many). **Biome** is a per-`place` and per-`monster` trait — worlds do **not** have a biome.

## Commands

### Run everything (Docker Compose, recommended)
From the repo root, one command brings up Postgres + Strapi + Next.js:
```
cp .env.example .env   # first time only
docker compose up
```
Services: `db` (Postgres, :5432), `back` (Strapi, :1337, admin at /admin), `front` (Next, :3000). `back` waits for `db` to be healthy. Source is bind-mounted so hot-reload works; each app's `node_modules` lives in a named volume (`back-node-modules` / `front-node-modules`), so **after changing a `package.json` you must rebuild**: `docker compose up --build` (or `docker compose build <svc>`). Compose reads secrets/DB config from the root `.env` (gitignored; template in `.env.example`).

In Compose the backend runs on **Postgres** (`DATABASE_CLIENT=postgres`, host `db`), not sqlite. `NEXT_PUBLIC_STRAPI_URL` is `http://localhost:1337` — the URL as seen by the **browser**, not the internal `back` service name, because that var is used client-side.

The per-app npm scripts below are still the way to run a single service directly on the host (without Docker).

### Backend (`force-back/`)
- `npm run develop` — dev server with autoReload + admin panel (http://localhost:1337, admin at `/admin`)
- `npm run start` — run without autoReload
- `npm run build` — build the admin panel
- Uses **yarn** (yarn.lock present); npm also works. No test or lint script is defined.

### Frontend (`force-front/`)
- `npm run dev` — Next dev server with Turbopack (http://localhost:3000)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint (eslint-config-next, flat config in `eslint.config.mjs`)
- No test framework is configured.

## Architecture

### Backend — Strapi content types
All API resources live under `force-back/src/api/<name>/` and are scaffolded with Strapi factories — controllers (`createCoreController`), routes (`createCoreRouter`), and services (`createCoreService`) are unmodified boilerplate. **Behavior is driven almost entirely by the `content-types/<name>/schema.json` files, not by code.** To change the API, edit the schema (or use the admin panel, which writes these files).

Content types: `world`, `place`, `monster`, `item`, `companion` (user↔monster care bond), `inventory-entry` (user's item + quantity), `user-event` (activity log feeding the discovery engine — see below), `shop-stock` (a shop place's live stock: place + item + quantity — see the shop/stock engine). Note the field-naming inconsistency — `world`/`place`/`monster` use PascalCase attributes (`Name`, `Description`, `Image`), while `item` uses snake_case (`name`, `slug`, `type`, `rarity`). Relations: `world` 1—N `place` and `world` 1—N `monster` (monster's `World`, a manyToOne); `item` N—N `user` (the Items relation is added to the user schema in `src/extensions/users-permissions/content-types/user/schema.json`, marked `private`); `companion` N—N `item` (`equippedItems`, the companion's equipment — see the equipment engine). The user schema also has `discoveredMonsters` (M2N → monster), `balance`, `companions` and `inventoryEntries`. The `item` schema also carries `attack`/`defense` (equipment stats, default 0).

There are also two custom **code-only** APIs (controller + routes, no content-type, like the `shop` pattern): `shop` (`POST /shop/buy`, `GET /shop/:placeId/stock`) and `discovery` (`POST /discovery/event`, `POST /discovery/sync`).

Auth is the standard `users-permissions` plugin (local provider, JWT). Endpoint permissions per role are configured in the admin panel, not in code.

DB client is selected by `DATABASE_CLIENT` env var (`config/database.js`), defaulting to **sqlite** at `.tmp/data.db`; postgres/mysql are also wired up. Required secrets (`APP_KEYS`, `JWT_SECRET`, etc.) come from `.env` — see `force-back/.env.example`.

### Backend — Monster discovery engine

Users **discover** monsters by completing each monster's **discovery strategy**. The
strategy lives in a single JSON field `DiscoveryStrategy` on the monster schema:

```json
{ "ordered": true,
  "tasks": [ { "type": "visit_all_places_in_world",
               "params": { "worldName": "Egea" },
               "label": "Recorré todos los lugares de Egea" } ] }
```

- `ordered: true` ⇒ tasks must be completed in sequence (each evaluated only over
  events at/after the previous **event-based** task's completion time; state-based
  tasks like inventory ownership don't advance that cursor). `ordered: false` ⇒ each
  task is evaluated over the full history independently.
- `label` is the human-readable text; `type` selects the evaluator; `params` is free-form
  per type and references entities **by name or id** (`worldName`/`worldId`,
  `placeName`/`placeId`, `itemName`/`itemId`, `monsterName`/`monsterId`).

**Task types** (all in `src/api/discovery/engine.js`, map `EVALUATORS`):

| `type` | `params` | Completa cuando… |
|---|---|---|
| `visit_place` | `placeName`/`placeId` | visitó ese lugar |
| `play_place` | `placeName`/`placeId` | jugó en ese lugar |
| `visit_all_places_in_world` | `worldName`/`worldId` | visitó **todos** los places publicados de ese mundo |
| `play_in_world` | `worldName`/`worldId` | jugó en algún lugar de ese mundo |
| `buy_in_world` | `worldName`/`worldId` | compró un objeto en una tienda de ese mundo |
| `buy_item` | `itemName`/`itemId` | compró ese objeto puntual |
| `own_item` | `itemName`/`itemId` | tiene ese objeto en inventario (qty>0) |
| `own_item_of_rarity` | `rarity` (p. ej. `legendary`) | tiene algún objeto de esa rareza |
| `own_item_of_type` | `type` (p. ej. `weapon`) | tiene algún objeto de ese tipo |
| `enter_place_in_time_range` | `placeName`/`placeId`, `fromHour`, `toHour` | visitó ese lugar en ese rango horario (cruza medianoche si `from>to`) |
| `discover_monster` | `monsterName`/`monsterId` | ya descubrió ese otro monstruo (prerequisito) |

**Data flow.** Activity is recorded in the `user-event` content type (`type` ∈
`visit_place`/`play_place`/`buy_item`, plus oneWay relations `user`/`place`/`world`/`item`;
`createdAt` is the timestamp). Events are created server-side via:
- `POST /discovery/event { type, placeId?, itemId? }` (the controller derives `world` from
  the place), and
- `shop.buy` (records a `buy_item` event automatically when given `placeId`).

After recording, the controller calls `evaluateUser(strapi, userId)` (in `engine.js`),
which loads the user's events + inventory + already-discovered monsters, evaluates every
not-yet-discovered monster's strategy, **connects** the completed ones to the user's
`discoveredMonsters`, and returns them as `{ newlyDiscovered: [...] }` in REST shape
(`{ id, attributes: { …, Image: { data } } }`, via the same `monsterToRest` helper used by
the companion controller) so the frontend can render the modal directly.
`POST /discovery/sync` runs the same evaluation without recording an event (used on login
to resolve inventory-based tasks).

**Authoring & seeding.** Edit `DiscoveryStrategy` directly in the Strapi admin (it's a raw
JSON field). `src/seed.js` (idempotent, runs on `bootstrap`) grants the `discovery`
permissions to the Authenticated role and **seeds a strategy onto every monster**: explicit
hand-authored ones per name in `MONSTER_STRATEGIES` (Tronc/Serpi/Triso/Raya/Terri — designed
to be completable by a fresh user with 500 F), falling back to `buildGenericStrategy` (world
anchored) for any other monster. Seeded strategies carry a `seeded: true` marker: the seed
**re-applies** them on each boot (so example edits ship via re-deploy) but **never overwrites
a manually-edited strategy** (one without the marker). Set `RESEED_STRATEGIES=true` to force
overwrite even manual edits. Adding a new task type = add one function to `EVALUATORS` and
document it here; no schema change.

### Backend — Shop & stock engine

Shop places (`place.Type === 'shop'`) sell a **themed, limited, auto-restocking** stock —
e.g. Verdant Hollow sells only fruit, Serpent's Rest Island an island-market mix. All logic
lives in `src/api/shop/stock.js`; the `place` schema gained `ShopConfig` (json) + `RestockAt`
(datetime), the `item` schema gained `category` (a finer tag than `type`: `fruit`/`vegetable`/
`meat`/`seafood`/`legume`/`totem`/`weapon`/`armor`), and live stock is rows in the `shop-stock`
content type (`place` + `item` + `quantity`).

- **What a shop sells** — `ShopConfig`, a declarative JSON filter: `{ categories?, types?,
  rarities?, itemNames? }` (combined with AND; empty ⇒ sells everything). Seeded per place in
  `SHOP_CONFIGS` (`src/seed.js`) with the same `seeded:true` marker convention as discovery
  strategies (re-applied on boot, never overwrites a manual admin edit).
- **Stock generation** — `generateStock(place)` lays down exactly **30 units** (`STOCK_SIZE`)
  across the eligible items, picking each unit's rarity by weight (`RARITY_WEIGHTS` =
  common 50 / uncommon 25 / rare 15 / epic 8 / legendary 2), so multiple units of the same
  item are normal and rare items are scarce. If the chosen rarity has no eligible item it
  falls back to whatever rarities exist in the pool.
- **Restock cycle** — buying decrements stock atomically (`decrementStock`, a guarded
  `UPDATE … WHERE quantity > 0` to avoid overselling the last unit). When a shop hits 0 it sets
  `RestockAt = now + 5min` (`RESTOCK_MINUTES`). Regeneration runs **only** from
  `restockDueShops()` — invoked by a **cron** (`config/cron-tasks.js`, `restockShops`, every
  minute, enabled via `cron.enabled` in `config/server.js`; toggle `CRON_ENABLED`) and once by
  the seed at bootstrap. It is deliberately kept **off the read path**: if two users hit a
  depleted shop at once, lazy regen-on-read could double-generate stock — the cron is the
  single generation point, so that race can't happen.
- **Endpoints** — `GET /shop/:placeId/stock` (public, read-only, never generates) returns
  `{ items:[{item, quantity}], total, restockAt, restockInSeconds }`. `POST /shop/buy` now
  **requires** `placeId`, validates+decrements that shop's stock, and returns the updated
  `stock` alongside `balance`/`entry`/`newlyDiscovered`.

### Backend — Companion stats

A `companion` (user↔monster bond) carries two independent groups of stats:

- **Care stats** — `happiness`/`energy`/`bond` (0..100), moved by the `feed`/`play`/`pet`
  actions (controller `care()`), unchanged by this engine.
- **Progression/combat stats** — `health`, `strength`, `defense`, `speed`, `luck`, `level`
  (integers on the companion schema). When a companion is created they're initialized to the
  **species base**, read from the monster's `Base*` fields (`BaseHealth`/`BaseStrength`/
  `BaseDefense`/`BaseSpeed`/`BaseLuck`/`BaseLevel` on the monster schema). The methods to
  **raise** these stats are not implemented yet — the stats are stored as the mutable current
  values, ready to be bumped later. `currentHealth` (≤ `health`) is the live HP that drops in
  duels and is restored by the **heal/feed** action below.

**Healing/feeding** — `POST /companions/:id/heal { itemId }` (controller `heal()`) consumes 1
unit of any item with `heal>0` and raises `currentHealth` (clamped to `health`); if it was the
last unit the inventory entry is **deleted** (the item disappears from the bag). Two item
families carry `heal`: **potions** (`POTIONS`, premium combat restore, 40/80/140/220/400 by
rarity) and **every food** (categories fruit/vegetable/meat/seafood/legume — all `usable`,
roughly half a potion's heal). Food heal is seeded fill-if-missing in `src/seed.js` from
`FOOD_HEAL` (nature × rarity: fruit lightest … meat heartiest), kept below potions so a single
item rarely tops off a leveled companion. Frontend: the `/inventory` "Usar" button on any
`heal>0` item opens a confirm toast ("¿Alimentar a {compañero}…?") and on confirm calls
`companionsService.heal`, then decrements/removes the entry locally.

**Base stats are balanced per species and capped at ≤10 each** (so the training school's
`2×level` cap is meaningful — see the Training engine; no base stat ever exceeds 10), varied by
biome archetype. Seeded in `src/seed.js` with a cascade: `MONSTER_BASE_STATS[name]`
(hand-authored anchors: Tronc tank / Serpi agile / Triso offense / Raya balanced+lucky / Terri
fast-fragile) → `BIOME_BASE_STATS[biome]` (per-biome archetype each anchor derives from, so any
monster inherits its biome's flavor: forest tank / aqua agile / volcanic offense / arid balanced
/ space fast-fragile / snow defensive) → `GENERIC_BASE_STATS` (for monsters with no biome). The
seed **fills each `Base*` field when null AND lowers any value > 10** to the archetype value
(step 3) — a manual value in 1..10 is respected, but the ≤10 invariant is enforced. Because
`seed.js` runs on `bootstrap` it populates **both local and prod** (prod on the next redeploy).
Companion progression stats are likewise migrated down in step 9b (any stat above its training
cap — `2×level`, or `4×level` for health — is reset to the species base; old high data.
Legitimately trained stats never exceed the cap, so they're left alone).

**Creation seam.** `companion.service` exposes `baseStatsFor(monster)` (Base* → the 6
progression stats, with generic fallback) and `createForUser(userId, monsterId, extra)`, which
creates the companion with stats copied from the species base. The future "obtain a companion"
flow should call `createForUser` rather than creating the row directly. The seed's demo
companion (step 9) already uses it. The controller's `companionToRest` returns all six
progression stats; the frontend `Companion` type mirrors them and `CompanionStats`
(`components/ui/tags.tsx`) renders them as numeric chips (not `%` meters) on the home hero and
`monsters/[id]` care section.

### Backend — Companion equipment

A companion can carry **up to 5 equipped items** (`MAX_EQUIP` in the controller), held in a
`equippedItems` M2N relation (`companion` → `item`). Equipping does **not** consume the
inventory entry — the item stays in the bag (shown as "Equipado") and unequip just breaks the
relation.

Every `item` now has `attack`/`defense` integer fields (default 0). Equipped items sum their
attack/defense into the companion's **effective combat totals** shown on `/companion`:
`Ataque = strength + Σ item.attack`, `Defensa = defense + Σ item.defense`.

- **Endpoints** (custom routes on the companion router, same ownership-validation pattern as
  `care`): `POST /companions/:id/equip { itemId }` and `POST /companions/:id/unequip { itemId }`.
  `equip` validates: companion belongs to the user, the user **owns** the item (an
  `inventory-entry` with `quantity>0`), it isn't already equipped, and there are `< MAX_EQUIP`
  equipped. Both return the updated companion via `companionToRest` (now including
  `equippedItems`, each flattened with its `icon` like the inventory controller's `itemToRest`).
- **Stat seeding** — `src/seed.js` has an `EQUIP_STATS` table keyed by **family × rarity**.
  Family is derived from `item.category` (with a `type` fallback): `weapon` (swords → high
  attack, ~0 defense), `armor` (shields/helmets/gloves/vests/cuirasses → high defense, ~0
  attack), `totem` (balanced buff to both); food/everything else stays `0/0`. The item backfill
  (step 5) writes attack/defense **only when the current value is 0/null** (same
  "fill-if-missing" convention) — preserves admin edits, leaves food at 0, idempotent, and
  populates **both local and prod** (prod on the next redeploy, which the new schema fields
  require anyway).
- **Frontend** — equip/unequip from the inventory (`/inventory`): the `Detail` panel shows
  Ataque/Defensa rows and an **Equipar/Quitar** button for equippable items (`attack>0 ||
  defense>0`), disabled when there's no companion or the 5-slot cap is full. `/companion` adds
  an **Equipamiento** section (5 slots + per-item Quitar) and the effective Ataque/Defensa
  chips with the equipment bonus. Both pages keep a local copy of the companion and update it
  from the equip/unequip response (`companionsService.equip/unequip`).

### Backend — Game engine (motor de juegos)

Places of type `game` are arbitrary web mini-games (each with its own mechanics and
internal scoring). The custom **code-only** API `game` (controller + routes, no
content-type, like `shop`/`discovery`/`battle`) provides **only the reward-claim
contract** — it knows nothing about any game's mechanics. All logic is in
`src/api/game/engine.js`.

- **Conversion** — each game registers a `pointsToCoins(points, ctx)` in the `GAMES`
  map keyed by `GameKey`; the engine **clamps the result to `[0..100]`** coins
  (`clampReward`). The conversion runs **server-side** (don't trust the client's raw
  score for high-value games — see the guide's security note). A place's game is
  resolved by `gameKeyForPlace(place)` (`place.GameKey` → a `GAMES` entry, falling
  back to `template`, the placeholder that grants a random 1..100 reward).
- **Cooldown is per-game** — a user can claim once every `COOLDOWN_HOURS` (6h) **per
  place**, independently across games. State lives on the user as
  `gameCooldowns` (json, private): `{ [placeId]: ISO of last claim }` — no extra
  table, no cron. `claimStatus(user, placeId)` computes `{ canClaim, secondsLeft,
  nextClaimAt }`.
- **Endpoints** (both require auth) — `GET /games/:placeId/status` returns
  `{ gameKey, cooldownHours, difficulty, bestScore, maxReward, canClaim, secondsLeft,
  nextClaimAt }`; `POST /games/:placeId/claim` (body `{ points? }`) validates place type +
  cooldown server-side, credits `balance`, stamps the per-game cooldown, **records the
  user's best raw score**, and returns `{ reward, balance, gameKey, bestScore, ...status }`.
  Permissions (`game.status`/`game.claim`) granted to the Authenticated role in `src/seed.js`.
  `GET /games/:placeId/leaderboard?limit=5` is **public** (no auth): returns the real
  per-place leaderboard `{ gameKey, total, top:[{ rank, userId, username, score, me }], me }`
  — each user's best raw score (from `gameBestScores`), sorted desc; `me` is the current
  user's standing if outside the top (when a token is sent). Granted to the Public role.
- **Schema** — `place.GameKey` (string, which game runs there) + `place.Difficulty`
  (enum `easy`/`medium`/`hard`), and `user.gameCooldowns` + `user.gameBestScores` (json
  maps keyed by placeId — last-claim ISO and best raw score). No new content-type. The
  status extras (`difficulty`/`bestScore`/`maxReward` = engine cap 100) feed the game
  card's chips (Dificultad / Recompensa / Tu récord) instead of hardcoded mock values;
  the leaderboard panel is now backed by the real `leaderboard` endpoint (was a hardcoded
  mock). Seeded fill-if-missing via `GAME_DIFFICULTY` in `seed.js`.
- **Frontend** — `gamesService` (`getStatus`/`claim`) in `services.ts`. The play route
  `app/explore/[worldId]/places/[placeId]/play/page.tsx` is a **dispatcher**: it fetches
  `status`, records `play_place`, and **branches on `status.gameKey`** to render the right
  game component (falling back to `template`, the placeholder demo). Every game reuses the
  **generic components** in that folder (sin textos propios de ningún juego): `GameHeader`
  (encabezado, siempre visible — kicker/título/descripción/stats), `GameLoading` (carga de
  `LOADING_MS` = 5 s con el banner del place de fondo), `GameRewardModal` (revela las monedas
  recién al reclamar) y `GameCooldownModal` (enfriamiento, con su propia cuenta regresiva;
  exporta `hhmmss`). Los modales `.overlay`/`.ov-*` y `.game-head`/`.play-*` son CSS genérico
  en `globals.css`. El juego real **Los Ojos de Deo** vive en `play/deo/` (`DeoGame.tsx` +
  `engine.ts`, un plataformero de descenso en canvas) y es el ejemplo de referencia.
  **Torres de la Cordillera** (`play/torres/`, `TorresGame.tsx` + `engine.ts`) es un segundo
  juego concreto: un plataformero de **ascenso** vertical (mundo Koril, GameKey `torres`,
  +8 F/m) con su CSS scopeado bajo `.torres-game` en `globals.css`.

**Adding a game** = one entry in `GAMES` + set the place's `GameKey` (seeded fill-if-missing
in `seed.js` via `GAME_KEYS`, or set in the admin) + a frontend game component that reuses the
generic components and calls `gamesService.claim(placeId, score)`. No schema change. The full
contracts: backend in **`force-back/src/api/game/README.md`**, frontend (componentes genéricos
+ paso a paso) in **`force-front/src/app/explore/[worldId]/places/[placeId]/play/README.md`**.

### Backend — Training engine (escuela de entrenamiento)

Places of type `training` are **schools** where the player **raises a companion's combat
stats** by paying with a **totem** and waiting real time. Custom **code-only** API `training`
(controller + routes + `engine.js`, like `shop`/`battle`/`game`); all rules live in
`src/api/training/engine.js`. Full contract in **`force-back/src/api/training/README.md`**.

- **Stats & cap** — trainable: `strength`/`defense`/`speed`/`health`/`level` (`STATS`). Each
  completed training raises the chosen stat **+1** (or **+2** if it's a specialty of the
  school's trainer). Cap for str/def/spd = **2 × level**, **health = 4 × level** (`statCap` /
  `CAP_MULT`); `level` caps at 100. To pass the cap you must raise `level` first. Base stats are kept **≤10 per stat** (see
  Companion stats) so that low-base disciplines (e.g. speed) become trainable within a few
  levels; `level` (and any stat already under its cap) is always trainable.
- **Payment** — 1 totem (`item.category==='totem'`) of the rarity for the companion's level
  band (`rarityByLevel`): 1–19 common · 20–39 uncommon · 40–59 rare · 60–79 epic · 80–100
  legendary. The trainer demands **one specific totem** picked at random among that rarity and
  **persisted** in `companion.demandedTotem` (stable across reloads; re-rolled only on pay or
  when the level band changes). Duration in **real days** (`DAYS_BY_RARITY`): 1/2/3/4/5.
- **Companion state** (schema `companion`) — `trainingStat`, `trainingEndsAt`, `trainingGain`
  (1 or 2, fixed at start), `demandedTotem` (relation → item). Completion is **lazy**:
  `companion.service.resolveTraining(c)` applies `+trainingGain` (clamped to cap) when
  `trainingEndsAt` passed, then clears the fields — called by `training.info`/`start` and
  `companion.mine` (no cron). While training, the companion **can't battle**:
  `battle.create`/`battle.join` reject it (`companionTraining`).
- **Trainer** (content-type `trainer`: `name`, `image`, `specialties: json`, `place`→school).
  `gainFor(stat, specialties)` ⇒ +2 if the stat is a specialty. The front gets it inside the
  `info` response.
- **Endpoints** (auth) — `GET /training/:placeId/info?companionId=` (estado: tótem exigido,
  stats con value/cap/gain, entrenador) and `POST /training/:placeId/start { companionId, stat }`
  (valida tope/duelo/tótem, cobra 1 tótem, programa el entrenamiento). Permisos
  `training.info`/`training.start` al rol Authenticated en `src/seed.js`.
- **Seed** — `src/seed.js` crea idempotente el place **"Fragua de los Maestros"** (Eryndor,
  `Type:'training'`) y el entrenador **"Maestro Pyros"** (`specialties:['strength','defense']`,
  imagen subida desde `scripts/assets/maestro-pyros.png`), poblando local y prod en bootstrap.
- **Frontend** — `trainingService` (`getInfo`/`start`) en `services.ts`; el branch
  `a.Type === 'training'` de la página de place renderiza `TrainingBody` (tarjeta del
  entrenador, tótem exigido, grilla de disciplinas con +1/+2 y cuenta regresiva del
  entrenamiento en curso). El battledome deshabilita pelear si el compañero entrena.

**Adding a school** = a place `Type:'training'` + a `trainer` row with its `place`. All schools
teach everything; only the trainer's `specialties` (the +2) vary.

### Frontend — discovery UX

`src/hooks/useDiscovery.tsx` — `DiscoveryProvider` (mounted in `layout.tsx` inside
`AuthProvider`) holds a queue of newly-discovered monsters and renders `DiscoveryModal`
(styles `.disc-*` in `globals.css`). It exposes `recordEvent(type, {placeId,itemId})`,
`reportDiscoveries(monsters)` and `sync()`. The place page
(`app/explore/[worldId]/places/[placeId]/page.tsx`) records `visit_place` on mount,
`play_place` on the "Jugar ahora" button, and `inventoryService.buy(itemId, placeId)` reports
discoveries from the buy response. The bestiary (`/monsters`) only lists discovered monsters,
so a newly discovered one shows up there after the modal. The shop body of the place page
(`ShopBody`) fetches that shop's stock via `shopService.getStock(placeId)`, renders each item
with its remaining quantity (the `qty` badge on `ItemSlot`), updates stock from the buy
response, and when the shop is sold out shows a "Reabasteciendo… mm:ss" countdown that refetches
when it reaches 0 (the cron has regenerated it by then).

### Frontend — API layer
All Strapi communication is centralized in `force-front/src/api/`, re-exported through `index.ts`:
- `client.ts` — single axios instance, base URL `${NEXT_PUBLIC_STRAPI_URL}/api` (defaults to `http://localhost:1337`).
- `types.ts` — TypeScript mirrors of the Strapi response envelope (`StrapiResponse`, `StrapiEntity`) and each content type.
- `services.ts` — per-resource service objects (`monstersService`, `worldsService`, `placesService`, `itemsService`, `shopService`, `authService`) plus a `dataService` aggregator. `buildQueryParams()` here translates a `QueryParams` object into Strapi's `populate`/`sort`/`filters`/`pagination`/`fields` query string — use it rather than hand-building query strings.
- `hooks.ts` — thin `use*` React hooks wrapping each service with `{ data, loading, error }` state. These are bespoke `useEffect` fetchers; there is **no** react-query/SWR.

When adding a new resource, the pattern is: add the type to `types.ts`, a service to `services.ts`, a hook to `hooks.ts`, then re-export all three from `index.ts`.

### Frontend — auth
Despite `next-auth` being a dependency, auth is a custom client-side flow, not NextAuth:
- `src/hooks/useAuth.ts` — `AuthProvider` context storing `token`/`user` in **localStorage** (`authToken`, `authUser`). Mounted globally in `src/app/layout.tsx`.
- Login/register call `authService.login`/`register` (`/auth/local`, `/auth/local/register`); the returned JWT is passed manually as a Bearer header (e.g. `authService.getMe(token)`). The axios client does **not** auto-attach the token — its request interceptor is a no-op placeholder.
- `src/components/ProtectedRoute.tsx` guards pages that require a session.

Routes (App Router, `src/app/`): `/`, `/login`, `/register`, `/explore`, `/explore/[worldId]`, `/explore/[worldId]/places/[placeId]`, `/monsters`, `/monsters/[id]`, `/inventory`. UI text and code comments are in Spanish.

## Cross-cutting notes

- The frontend talks to the backend over CORS; the Strapi CORS origin must include the frontend URL (`http://localhost:3000`). See `force-front/AUTH_SETUP.md`.
- Strapi wraps every entity as `{ id, attributes: {...} }` and lists as `{ data: [...], meta: { pagination } }`; relations and media require explicit `populate` to be returned.
- Content types use `draftAndPublish: true` (except `user`), so unpublished entries won't appear via the public API unless requested with the appropriate publication state.
