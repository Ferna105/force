# Plan: Descubrimiento de mundos/regiones/lugares + Motor de Eventos (evento Deo)

> Estado de arquitectura (contexto)
> - Jerarquía real: `world → region → place` (content-type `region`, con `HotspotX/Y` para el mapa). Monster pertenece a world.
> - Descubrimiento hoy: solo monstruos. `monster.DiscoveryStrategy` (JSON) evaluado por `discovery/engine.js` (EVALUATORS) contra `user-event` (`visit_place`/`play_place`/`buy_item`) + inventario + `discoveredMonsters`. Al completar, conecta el monstruo a `user.discoveredMonsters`.
> - Flujo de compañeros: **ya existe** — `POST /companions/adopt { monsterId }` (`companionsService.adopt`, botón "convertir" en `/monsters/[id]`). El level-up sale del motor de training. Se reutiliza tal cual.
> - Decisión de gating: **override de los controllers `find`/`findOne`** de world/region/place (server-side, robusto, sin filtrar en el front). Reusa `visibleFor` del motor y poda relaciones anidadas (ver `src/api/discovery/gating.js`).
> - **Todo el descubrimiento de la luna Deo se encapsula en una entidad `Evento`** (ver Fase 1): el questline son los *pasos* del evento, la recompensa (monedas + arma) son las *recompensas del evento*, y el progreso se guarda **por usuario**.

---

## Estado de ejecución

- **PR1 — Fundación descubrimiento (Fase 0): ✅ HECHO y commiteado.**
  - Schema: `user.discoveredWorlds/Regions/Places` (M2N); `Hidden` (boolean) + `DiscoveryStrategy` (json) en world/region/place.
  - Motor (`discovery/engine.js`) generalizado: evalúa estrategias de world/region/place además de monstruos; helpers `visibleFor` (set visible) y `discoverWorldTree` (conecta mundo+región+lugares de una, para la recompensa del evento). `evaluateUser` devuelve `{ newlyDiscovered, newWorlds, newRegions, newPlaces }`.
  - Gating **a nivel de controller** (`world`/`region`/`place` overridean `find`/`findOne`) vía `src/api/discovery/gating.js` (`visibleSets` + `pruneNested`). Entidad oculta ⇒ 404 en findOne y ausente en listas; relaciones anidadas podadas. **El front no filtra nada.**
  - Seed: `Hidden:true` en **todo mundo ≠ Eryndor** (Koril/Egea/Deo) + región y tienda **Isla del Reposo de la Serpiente**. Cuenta nueva ve solo Eryndor sin la isla.
  - **Decisiones tomadas:** (a) se ocultó todo menos Eryndor — Koril/Egea quedan **bloqueados sin ruta de desbloqueo aún** (TODO: definir su descubrimiento; Deo se desbloquea por su evento). (b) Gating por controller (no `/discovery/visible`, que se descartó). (c) Los **modales de descubrimiento** de world/region/place quedan **diferidos** hasta que el evento Deo los dispare (los campos `newWorlds/newRegions/newPlaces` ya viajan por el service/tipos).
  - Verificado en Docker (DB real): listas y findOne gateados para anónimo y autenticado, pruning anidado OK, seed `completado ✓`, front `tsc`+`eslint` limpios.
- **PR2 — Motor de Eventos (Fase 1): ✅ HECHO.**
  - Content types `event` (Name/Description/active/startsAt/steps/rewards/Image) y `event-progress` (user/event/currentStep/completedSteps/state/status/startedAt/completedAt, 1 por user+event).
  - Motor `event/engine.js`: pasos ordenados `{key,type,params,label}`; tipo `flag` (interactivo, vía `STEP_RESOLVERS`) + reuso de los `EVALUATORS` de descubrimiento para pasos pasivos (`visit_place`, `own_item`, …). `resolveEvent` (lazy) avanza `currentStep` y otorga `rewards` **una sola vez** (coins + items al inventario + `discoverWorld` vía `discoverWorldTree`). Contrato en `src/api/event/README.md`.
  - Endpoints (auth): `GET /events/active`, `GET /events/:id`, `POST /events/:id/step/:key` (valida activo/orden/idempotencia). Permisos en el seed.
  - Seed: **evento demo** `Evento demo (motor)` (`active:false`, seed-owned) para validar el motor.
  - Front (data layer + tracker mínimo pre-diseño): `eventsService` (`getActive`/`getOne`/`resolveStep`), tipos `EventView`/`EventStepResponse`, hook `useActiveEvents`, y página `/events` funcional (checklist de pasos + resolver el paso flag actual + toast de recompensa).
  - Verificado en Docker (DB real, usuario nuevo): lista/detalle, **orden** (paso fuera de turno → 400), paso `flag` avanza, paso pasivo (`visit_place`) auto-completa, y al completar se otorgan **coins + item + discoverWorld** (balance +N, item al inventario, Deo pasa de 404→200 con su región y lugares) **una sola vez** (idempotente). `tsc`+`eslint` limpios; `/events` compila 200.
  - **Decisión:** el reward `discoverWorld` reusa el `discoverWorldTree` de PR1, cerrando el circuito Evento→descubrimiento. Los **resolvers de puzzle** (traducción/telescopio/coordenadas) y los tipos de paso `own_companion`/`companion_level_at_least`/`raise_stat_in_training` quedan para PR3/PR5.
- **PR3 — Event/task types genéricos + integración training (Fase 2): ✅ HECHO.** (backend-only)
  - Nuevos evaluadores en `discovery/engine.js` (`EVALUATORS`, reutilizados por descubrimiento y por el motor de eventos): `own_companion` (monsterName/Id), `companion_level_at_least` (monsterName/Id + level), `read_book` (bookId), `raise_stat_in_training` (stat). `loadContext` ahora carga los **compañeros** del usuario y arrastra el campo `data` de cada `user-event`.
  - `user-event`: enum extendido con `read_book` y `raise_stat_in_training` + campo `data` (json) para params (bookId/stat).
  - `/discovery/event` acepta `read_book` con `bookId`. `raise_stat_in_training` es **server-only**: lo emite `companion.service.resolveTraining` al completar un entrenamiento (una sola vez, junto con el +stat).
  - Compañeros: se reusa el `adopt` existente (sin cambios) vía los tasks de estado.
  - Verificado (DB real): 8/8 asserts unitarios de evaluadores; integración real → adopt + read_book + entrenamiento vencido resuelto por `/companions/mine` (emite el evento, +1 fuerza) ⇒ evento con los 3 pasos nuevos **completado** con recompensa.
- **PR4 — Contenido + idioma Deo (Fase 3, sin puzzles): ✅ HECHO.**
  - **4 places nuevos** (seed idempotente, `information`, **visibles** en Eryndor — son las entradas al questline): "Una criatura extraña" (Dunas de Ceniza, arid), "Biblioteca de los Secretos" (Cumbre Helada, snow), "Estelas de la Guerra Antigua" (Meseta de la Guerra Antigua, arid), "Telescopio Ancestral" (Cumbre Helada, snow). Nombres/descripciones tomados del handoff de diseño. Sin banner (fallback).
  - **2 items nuevos** (seed): "Cristal blanco oxidado" (`key`/`rare`, item de quest) y "Garras blancas de piedra espacial" (`weapon`/`uncommon`, `attack` backfilled = arma exclusiva de recompensa). **Sin ícono** (fallback); el arte 3D-render final se genera luego con `item-generator` a partir de la dirección de arte del handoff.
  - **Idioma de Deo**: `deo-glyph.js` del handoff **portado** a `force-front/src/lib/deoGlyph.ts` (módulo TS puro, SSR-safe, cifrado 1:1 ES→glyphs SVG inline apto CSP) + componente `DeoText` (`components/ui/DeoText.tsx`, con reveal a español) + estilos `.deo-*` en `globals.css`.
  - **Fuente del arte**: handoff de diseño (`Force-handoff.zip`) — trae specs de todas las escenas, el idioma, y arte de Deo. Para los 2 items solo hay dirección de arte (no PNG final) ⇒ decisión: fallback ahora, `item-generator` después.
  - Verificado (DB real): 4 places visibles con región/bioma correctos; items con stats backfilled; **port del idioma idéntico al original (27/27 glyphs + render)**; `tsc`+`eslint` limpios.
- **PROD — Propagar el contenido a producción: 🔁 PASO RECURRENTE (tras cada PR de contenido/backend).**
  - **Mecanismo:** el seed (`src/seed.js`) es **idempotente** y corre en cada **deploy de Railway** (bootstrap). Al pushear a `main`, Railway redeploya y el seed **puebla prod** con lo creado localmente: places/items del questline, gating `Hidden` (mundos + isla serpiente), permisos, evento demo y —cuando esté— el evento Deo. Referencia todo **por nombre** (los ids difieren entre entornos), así que no hace falta migrar ids.
  - **⚠️ Impacto en prod:** el gating oculta **Koril/Egea también en prod** (usuarios existentes dejan de verlos hasta definir su desbloqueo). Confirmar que es lo deseado antes de deployar.
  - **Assets** (íconos de items, banners nuevos): NO viajan por el seed. Se cargan con las skills `item-generator` / `upload-image`, que apuntan a **local y prod**. Todos los assets son opcionales (fallback), así que el deploy no se bloquea por faltar arte.
  - **NO usar `db-sync` local→prod** para esto: sobrescribe la base de prod (borra datos de usuarios reales). El `db-sync` sirve para pull prod→local o para un reset total, no para propagar contenido incremental.
  - **Verificación post-deploy:** chequear en prod que los places/items nuevos aparecen y que el gating es correcto (endpoints REST o admin).
- **PR5a — Backend del evento Deo (motor + puzzles + drop + recompensa): ✅ HECHO.**
  - **Resolvers de puzzle** en `event/engine.js`: `answer` (valida `body.value` vs `params.answer`, normalizado sin acentos/símbolos — traducción de la nave y coordenadas) y `telescope` (gate horario `body.hour` ∈ [fromHour,toHour)). `isStepDone` generalizado: los pasos con resolver se cumplen por flag; el resto son pasivos (EVALUATORS).
  - **Evento "La luna del origen"** (seed, `active:false`, seed-owned): 13 pasos ordenados (visit_npc → read_book → react_deo → adopt_deo → level_deo → read_estelas → translate_ship → get_crystal → use_ship → read_final → train_strength → telescope → travel). Recompensa: **1000 monedas + Garras blancas de piedra espacial + `discoverWorld: Deo`**. Strings de puzzle (bookId `deo-luna-origen`, traducción, coords `21h +48 7`) centralizados en el evento.
  - **Monstruo Deo**: `DiscoveryStrategy` = `read_book(deo-luna-origen)` (se descubre al descifrar el libro).
  - **Drop del cristal**: `maybeDropCrystal` (enganchado en `/discovery/event` al visitar) otorga "Cristal blanco oxidado" (chance 0.4) solo si el usuario está parado en el paso `get_crystal` y no lo tiene.
  - Verificado (DB real, questline completo con usuario nuevo): los 13 pasos en orden, validación de traducción/coords (rechaza incorrectas), gate del telescopio (rechaza hora 14, acepta 22), drop del cristal, y **recompensa final una sola vez** (balance +1000, Garras al inventario, mundo Deo 404→200 con su región y lugares). `event-progress` = `completed` (13/13).
- **PR5b — Escenas interactivas del front (Fase 2): ⏭️ SIGUIENTE.** NPC "Una criatura extraña", Biblioteca de los Secretos, Estelas de la Guerra Antigua, Telescopio Ancestral y terminal de la nave — usando `DeoText`/`.deo-*` + los endpoints del evento + los specs del handoff. Al terminar, **activar el evento** (`active:true`).

---

## FASE 0 — Fundación: motor de descubrimiento de lugares

**Schema**
- `user`: `discoveredWorlds`, `discoveredRegions`, `discoveredPlaces` (M2N, espejo de `discoveredMonsters`).
- `world` / `region` / `place`: `DiscoveryStrategy` (json) + `Hidden` (boolean, default `false`).
  - `Hidden:false` ⇒ visible para todos. `Hidden:true` ⇒ visible solo si está descubierto **y su padre es visible** (jerarquía world→region→place).

**Motor (`discovery/engine.js`)** — `evaluateStrategy` ya es genérico; agregar 3 pasadas nuevas (worlds/regions/places `Hidden` no descubiertos) que reusan los `EVALUATORS` y conectan a los sets del usuario. `evaluateUser` devuelve `{ newlyDiscovered, newWorlds, newRegions, newPlaces }`. Exponer un helper `discoverWorldTree(userId, worldName)` que conecta un mundo `Hidden` + su región + sus lugares de una (lo usa la recompensa del evento Deo, ver Fase 1/5).

**Gating** — override de `find`/`findOne` en los controllers de world/region/place: filtran por el set visible del usuario (no-`Hidden` ∪ descubiertos, con jerarquía) y podan las relaciones anidadas pobladas. `visibleFor(strapi, userId)` computa el set; `src/api/discovery/gating.js` provee `visibleSets`/`pruneNested`. Server-side ⇒ el front no filtra nada (una entidad oculta responde 404 en `findOne` y no aparece en las listas).

**Seed (estado por defecto)** — `Hidden:true` en todo mundo ≠ Eryndor; en Eryndor `Hidden:true` en la región "Isla del reposo de la serpiente" y su tienda. Cuenta nueva ⇒ Eryndor + regiones/lugares menos esa isla y su tienda.
- Nota: Deo se desbloquea **al completar el evento** (Fase 1), no por una `DiscoveryStrategy` de mundo. Así conviven dos vías de desbloqueo: por estrategia (p. ej. la isla de la serpiente a futuro) y por evento (Deo).

**Frontend** — nada de gating propio (lo hace el backend): explore/regiones/lugares ya reciben las listas filtradas y un mundo/región/lugar oculto da 404 → `ErrorState`. Pendiente (diferido): extender `DiscoveryProvider` para modales de world/region/place cuando el evento Deo los dispare.

---

## FASE 1 — Motor de Eventos (NUEVO, genérico)

Un **Evento** encapsula una experiencia multi-paso con recompensa. Deo es la primera instancia; el motor queda reutilizable para eventos futuros.

**Content type `event`**
- `Name`, `Description`.
- `active` (boolean, default `false`) — evento activo/inactivo. Solo los activos corren y se muestran.
- `startsAt` (datetime) — fecha de inicio. El progreso solo cuenta desde esta fecha (eventos y pasos anteriores a `startsAt` se ignoran). *(Opcional a futuro: `endsAt`.)*
- `steps` (json) — **lista ordenada de pasos a resolver**, cada uno `{ key, type, params, label }` (mismo patrón declarativo que `DiscoveryStrategy`, resuelto por un registro de código; ver Fase 3). `key` es estable (identifica el paso en el progreso). *(Alternativa: componente repetible `event.step` para editarlo cómodo en el admin; se decide en implementación.)*
- `rewards` (json) — recompensas al completar: `{ coins, items:[{name, quantity}], discoverWorld }` (p. ej. `{ coins:1000, items:[{name:"Garras blancas de piedra espacial",quantity:1}], discoverWorld:"Deo" }`). `discoverWorld` dispara `discoverWorldTree` de Fase 0.
- `banner`/`Image` (media, opcional) — arte del evento.

**Content type `event-progress`** (progreso por usuario)
- `user` (relation), `event` (relation).
- `currentStep` (integer) — índice del paso en curso.
- `completedSteps` (json) — array de `key` ya resueltos.
- `state` (json) — estado de puzzle del usuario (flags/valores que los pasos custom van escribiendo: `bookRead`, `hasCrystal`, `shipUsed`, `coordinates`, etc. — reemplaza al `user.deoQuest` que se había propuesto).
- `status` (`not_started` | `in_progress` | `completed`).
- `startedAt`, `completedAt`.
- Invariante: 1 progreso por (user, event).

**Motor (`event/engine.js`)** — API code-only (patrón `discovery`/`training`):
- `resolveEvent(userId, event)`: lazy (como `resolveTraining`). Evalúa los `steps` en orden desde `currentStep`; cada `type` se resuelve por un **registro de evaluadores** (`STEP_EVALUATORS`) que reusa los `EVALUATORS` de descubrimiento donde aplica (visit_place, own_item, own_companion, trained_stat…) y suma los pasos custom del evento (que leen `progress.state`). Avanza `currentStep`/`completedSteps`; al completar todos, **otorga `rewards` una sola vez** (idempotente por `completedAt`) → monedas a `balance`, items al inventario, `discoverWorld` conecta el árbol de Deo (Fase 0) y dispara los modales de descubrimiento.
- Gatea por `active` y `startsAt`.

**Endpoints** (auth):
- `GET /events/active` — eventos activos + progreso del usuario (steps con estado hecho/pendiente/actual, `state`).
- `GET /events/:id` — detalle del evento + progreso.
- `POST /events/:id/step/:key` — **resolver/avanzar un paso**. El body varía por tipo de paso (texto de traducción, coordenadas, etc.); valida server-side, actualiza `state`, reevalúa y puede otorgar recompensas. Los pasos "de estado" (visitar, tener item, adoptar, entrenar) avanzan solos vía `resolveEvent` sin este POST.
- Permisos al rol Authenticated en `src/seed.js`.

**Frontend** — `eventsService` (`getActive`/`getOne`/`resolveStep`) en `services.ts`; hub/tracker de evento (ver sección de diseño). Los pasos de puzzle se resuelven desde las escenas (NPC, biblioteca, telescopio, nave) llamando a `resolveStep`.

---

## FASE 2 — Mecánicas genéricas para el evento
- **Compañero:** ya existe (`adopt`); se referencia en un paso de estado `own_companion` / `companion_level_at_least`.
- **Nuevos event/task types** (una función por evaluador; solo cambia el enum de `user-event`): `read_book`, `raise_stat_in_training(stat)`, `own_companion(monsterName)`, `companion_level_at_least(monsterName, level)`. Los usa tanto el motor de descubrimiento como el registro de pasos del evento.
- **Integración training:** al completar un `+strength`, emitir `raise_stat_in_training:strength`.

---

## FASE 3 — Los pasos del evento Deo (mecánicas de puzzle)

Los `steps` del evento Deo, cada uno con su handler en el registro del motor (`STEP_EVALUATORS`) y, cuando corresponde, su endpoint de resolución. Estado por usuario en `event-progress.state`.

1. **`visit_npc`** — NPC **"Una criatura extraña"** (`information`, Dunas de Ceniza): máquina de estados de diálogo; botón "Deo" habilitado tras leer el libro; estados de nave (escombros → reconstruida → glow).
2. **`read_book`** — **Biblioteca de los secretos** (`information`): estanterías A–Z, libros irrelevantes + "Deo, la luna del origen" en estante D → resuelve el paso.
3. **`translate_ship`** — traducción de la nave: input validado server-side.
4. **`get_crystal`** — **drop aleatorio** "Cristal blanco oxidado" al visitar Dunas de Ceniza (server-side, anti-duplicado); el paso se satisface con `own_item`.
5. **`use_ship`** — reconstrucción/uso de nave (desaparece al usar).
6. **`read_plateau`** — **Meseta de la guerra antigua** (place nuevo): dos mensajes bilingües.
7. **`read_final_message`** — mensaje final traducible en el libro.
8. **`adopt_and_level`** — adoptar a Deo (`own_companion`) + subirlo ≥ nivel 1 (`companion_level_at_least`).
9. **`train_strength`** — +1 de fuerza en cualquier escuela (`raise_stat_in_training:strength`).
10. **`telescope`** — **Telescopio ancestral** (place nuevo): minijuego de cielo, gating **21–23h**, punto blanco parpadeante → coordenadas.
11. **`travel`** — viaje final: coordenadas correctas ⇒ **último paso** ⇒ completa el evento ⇒ recompensas + descubrimiento de Deo.

*(El orden exacto y `ordered:true/false` se afina en implementación; varios de estos son secuenciales por narrativa.)*

---

## FASE 4 — Contenido (seed idempotente)
- Places Eryndor nuevos: "Una criatura extraña" (Dunas de Ceniza), "Biblioteca de los secretos" (Ciudadela de la cumbre helada), place de la Meseta de la guerra antigua, "Telescopio ancestral" (cima de la cumbre helada) — todos `information`.
- **Mundo Deo** (`Hidden`) + región **"Corteza de Deo"** (`Hidden`) + places (`Hidden`) + monstruo **Deo**.
- Items: **"Cristal blanco oxidado"**, arma exclusiva **"Garras blancas de piedra espacial"** (uncommon/weapon; íconos con skill `item-generator`).
- **Idioma de Deo:** cifrado determinista ES→glyphs reusable en biblioteca/NPC/nave/meseta.
- **Evento "Descubrí la luna Deo"**: fila `event` con `active`, `startsAt`, sus `steps` (Fase 3) y `rewards` (Fase 5). Seed idempotente con marcador `seeded:true` (re-aplica en boot, no pisa ediciones manuales del admin).

---

## FASE 5 — Recompensas del evento
Definidas como `event.rewards` (data, no hardcode). Al completar el evento Deo: **+1000 monedas** + 1× "Garras blancas de piedra espacial" (una sola vez, idempotente por `completedAt`) + `discoverWorld:"Deo"` (conecta mundo/región/lugares) + modales de descubrimiento en cascada.

---

## Orden de PRs
1. **PR1** Fundación descubrimiento (Fase 0) — entregable independiente.
2. **PR2** Motor de Eventos (Fase 1): content types `event`/`event-progress`, engine genérico, endpoints, tracker básico en el front.
3. **PR3** Event/task types genéricos + integración training (Fase 2).
4. **PR4** Contenido + idioma Deo (Fase 4, sin puzzles).
5. **PR5** Pasos del evento Deo (Fase 3): handlers + escenas (NPC, biblioteca, traducción, telescopio, nave).
6. **PR6** Recompensas + pulido (Fase 5): reward del evento, modales en cascada, balanceo del drop/telescopio.
7. **PROD** (recurrente, tras cada PR): propagar a producción vía deploy (el seed idempotente puebla prod); assets con `item-generator`/`upload-image`. Nunca `db-sync` local→prod (destructivo). Ver "Estado de ejecución".

---

# 🎨 SECCIÓN DE DISEÑO (para Claude Design)

Todo lo visual nuevo que hay que diseñar. Convenciones del proyecto: UI y textos en **español**, Tailwind v4, estilos globales en `globals.css` con clases scopeadas (patrón `.disc-*`, `.game-*`, `.nbh-*`, `.house-*`), fuentes ya usadas (`cinzel` para títulos). Reutilizar lo existente siempre que se pueda.

### 0. Hub / tracker de Evento (NUEVO por la entidad Evento)
- **Panel del evento activo:** banner del evento, título/descripción, fecha de inicio, y una **checklist de pasos** con estado (hecho / en curso / pendiente) sin spoilear de más los pasos futuros.
- **Indicador de progreso** (p. ej. "Paso 4 de 11") y CTA al lugar del paso actual.
- Punto de entrada: dónde vive (¿home? ¿un ítem en la topbar? ¿sección en `/explore`?). Diseñar el acceso.
- Estado **evento completado** (con la recompensa reclamada).

### 1. Modales de descubrimiento (world / region / place)
Extender el modal de monstruo actual (`.disc-*` en `globals.css`, `DiscoveryModal`) a 3 variantes nuevas.
- **Estados/variantes:** mundo descubierto (arte grande, épico), región descubierta (banner + bioma), lugar descubierto (banner + tipo).
- **Cascada:** al completar el evento se disparan varios a la vez (mundo → región → N lugares). Diseñar la **secuencia encadenada** (una tras otra con "Siguiente", o un resumen "Descubriste 1 mundo, 1 región y N lugares").
- **Reutiliza:** layout, overlay y animación del modal de monstruo. Solo cambia jerarquía visual e íconos por tipo.

### 2. Identidad visual del mundo Deo (bioma `space`)
- Arte del **mundo Deo** (luna del origen; encaja como "luna orbitando" en el sistema solar de `/explore`).
- Banner de la **región "Corteza de Deo"** y banners de sus **places**.
- Paleta/mood espacial coherente con el bioma `space` ya existente.

### 3. El idioma de Deo (sistema tipográfico) — pieza central
- Diseñar un **alfabeto de glyphs** (cifrado 1:1 desde el español) legible como "idioma alienígena", que aparece en: diálogo del NPC, libro de la biblioteca, mensaje de la nave y tablillas de la meseta.
- Entregable ideal: **fuente/webfont o set de glyphs SVG** + regla de mapeo. Debe verse misterioso pero renderizable inline (CSP de artifacts / assets locales).
- Diseñar el **estado "traducción parcial → total"** (glyphs que se van revelando a español a medida que avanza la quest).

### 4. Escena "Una criatura extraña" (place `information` interactivo)
Es una **escena con estados**, no un place estándar. Diseñar el layout base + estos estados:
- **A. Encuentro:** el monstruo Deo (arte) hablando en glyphs; caja de diálogo.
- **B. Reacción "Deo":** botón "Deo" (aparece tras leer el libro) → animación de reacción del monstruo.
- **C. Nave en escombros:** con un mensaje en glyphs + **input de traducción** (campo de texto + validación, estados error/ok).
- **D. Nave reconstruida:** cuando el usuario trae el cristal (transición escombros→nave entera).
- **E. Panza brillando + terminal de coordenadas:** input de coordenadas + botón "Viajar" + transición de viaje a Deo.
- Diseñar la **caja de diálogo/tono NPC** reutilizable para futuros `information` interactivos.

### 5. Biblioteca de los secretos (place `information`)
- **Vista de estanterías A–Z:** navegación entre estantes (letras), lomos de libros (varios irrelevantes de relleno + el libro clave en estante **D**).
- **Lector de libro (modal):** libro abierto, el de Deo en glyphs, con estado de **traducción progresiva** (mensaje final legible recién al final de la quest).
- Diseñar cómo se ven "libros irrelevantes" (títulos de relleno) vs el libro importante.

### 6. Meseta de la guerra antigua (place `information`)
- Dos **tablillas/inscripciones bilingües** (español + glyphs Deo) con los mensajes. Estética de piedra/ruina antigua. Layout simple de lectura.

### 7. Telescopio ancestral (place `information`, minijuego)
- **Viewport de cielo nocturno** navegable (pan/scan), sensación "muy difícil" de encontrar el punto.
- **Punto blanco parpadeante** (el objetivo) + lectura de **coordenadas** al ubicarlo.
- **Estado fuera de horario:** mensaje "no es un buen momento para mirar al cielo" (solo 21–23h). Diseñar ambos estados (día bloqueado / noche activa con resplandor).
- Reutiliza patrón de los minijuegos (`.game-*`, `GameHeader`, overlays) donde aplique.

### 8. Íconos de items nuevos
- **"Cristal blanco oxidado"** (consumible/quest, blanco oxidado, misterioso).
- **"Garras blancas de piedra espacial"** (arma uncommon exclusiva, piedra espacial blanca). Se generan con la skill `item-generator` pero conviene dirección de arte de Claude Design.

### 9. Momento de recompensa final del evento
- Celebración de cierre del evento: **+1000 monedas** + reveal del **arma exclusiva**. Puede ser un modal más grandioso que el de descubrimiento normal (es el climax de todo el evento).

### Notas de reutilización para el diseñador
- Modales → base en `.disc-*`; minijuego/telescopio → base en `.game-*` + `GameHeader`/overlays; el NPC/biblioteca son patrones **nuevos** de `information` interactivo (hoy los `information` son estáticos), así que ahí hay más libertad.
- Todo lo `Hidden` simplemente **no aparece** hasta descubrirse (no hay placeholders "???"). Si el diseñador quiere sugerir "hay más por descubrir", proponerlo como opción, no requisito.
