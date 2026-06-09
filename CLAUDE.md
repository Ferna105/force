# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a two-part project (each subfolder is its own git repo and npm package):

- `force-back/` — Strapi 4.25 headless CMS (Node 18–20, JavaScript/CommonJS). Owns the data model and REST API.
- `force-front/` — Next.js 15 App Router app (React 19, TypeScript, Tailwind v4) that consumes the Strapi API.

The domain is a game-world catalog: **Worlds** contain **Places**; **Monsters** and **Items** are standalone catalogs; authenticated **Users** own Items (inventory, many-to-many).

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

Content types: `world`, `place`, `monster`, `item`, `companion` (user↔monster care bond), `inventory-entry` (user's item + quantity), `user-event` (activity log feeding the discovery engine — see below). Note the field-naming inconsistency — `world`/`place`/`monster` use PascalCase attributes (`Name`, `Description`, `Image`), while `item` uses snake_case (`name`, `slug`, `type`, `rarity`). Relations: `world` 1—N `place`; `item` N—N `user` (the Items relation is added to the user schema in `src/extensions/users-permissions/content-types/user/schema.json`, marked `private`). The user schema also has `discoveredMonsters` (M2N → monster), `balance`, `companions` and `inventoryEntries`.

There are also two custom **code-only** APIs (controller + routes, no content-type, like the `shop` pattern): `shop` (`POST /shop/buy`) and `discovery` (`POST /discovery/event`, `POST /discovery/sync`).

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

### Frontend — discovery UX

`src/hooks/useDiscovery.tsx` — `DiscoveryProvider` (mounted in `layout.tsx` inside
`AuthProvider`) holds a queue of newly-discovered monsters and renders `DiscoveryModal`
(styles `.disc-*` in `globals.css`). It exposes `recordEvent(type, {placeId,itemId})`,
`reportDiscoveries(monsters)` and `sync()`. The place page
(`app/explore/[worldId]/places/[placeId]/page.tsx`) records `visit_place` on mount,
`play_place` on the "Jugar ahora" button, and `inventoryService.buy(itemId, placeId)` reports
discoveries from the buy response. The bestiary (`/monsters`) only lists discovered monsters,
so a newly discovered one shows up there after the modal.

### Frontend — API layer
All Strapi communication is centralized in `force-front/src/api/`, re-exported through `index.ts`:
- `client.ts` — single axios instance, base URL `${NEXT_PUBLIC_STRAPI_URL}/api` (defaults to `http://localhost:1337`).
- `types.ts` — TypeScript mirrors of the Strapi response envelope (`StrapiResponse`, `StrapiEntity`) and each content type.
- `services.ts` — per-resource service objects (`monstersService`, `worldsService`, `placesService`, `itemsService`, `authService`) plus a `dataService` aggregator. `buildQueryParams()` here translates a `QueryParams` object into Strapi's `populate`/`sort`/`filters`/`pagination`/`fields` query string — use it rather than hand-building query strings.
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
