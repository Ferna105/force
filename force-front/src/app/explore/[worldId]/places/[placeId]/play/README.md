# Pantalla de juego (`/play`) — componentes genéricos

Esta carpeta es la **ruta de juego** de cualquier place de tipo `game`
(`/explore/[worldId]/places/[placeId]/play`). Resuelve, de forma genérica para
**todos los juegos**:

1. el **encabezado** del juego (siempre visible),
2. la **pantalla de carga** (siempre, antes de arrancar),
3. los **modales de resultado del reclamo** (recompensa ganada / enfriamiento),
4. el **contrato con el motor de juegos** (status + claim + cooldown).

Cada juego concreto sólo pone **su propia mecánica** (su UI/lógica de partida) y
reutiliza estos componentes. El contrato del backend está en
[`force-back/src/api/game/README.md`](../../../../../../../force-back/src/api/game/README.md);
este documento es la contraparte del **frontend**.

---

## Arquitectura: el despachador

[`page.tsx`](./page.tsx) es un **despachador**. Hace:

1. `usePlace(placeId)` — trae el place (nombre, descripción, banner, world).
2. `gamesService.getStatus(placeId)` — trae `{ gameKey, cooldownHours, canClaim,
   secondsLeft, nextClaimAt }`.
3. `recordEvent('play_place', { placeId })` — registra la jugada (descubrimiento).
4. **Elige el juego según `status.gameKey`**: si hay un componente para esa clave
   lo renderiza; si no, cae al **template** (placeholder: animación + recompensa
   aleatoria).

```tsx
if (status?.gameKey === 'deo') {
  return <DeoGame placeId={placeId} worldId={worldId} initialStatus={status} name={a.Name} banner={banner} />;
}
// …else: <TemplateGame .../>
```

> El `gameKey` lo define el place en el admin de Strapi (campo `GameKey`). Ver el
> README del backend, §2/§3.

---

## Componentes genéricos (reutilizá estos en cada juego nuevo)

Todos viven en esta carpeta y son **agnósticos del juego** (sin textos propios de
ninguna mecánica). Sus estilos están en `globals.css` (clases `.game-head`,
`.play-*`, `.overlay`/`.ov-*`), también genéricas.

### `GameHeader` — encabezado, **siempre visible**

[`GameHeader.tsx`](./GameHeader.tsx). Renderizá **siempre** (también durante la
carga), arriba del cuerpo del juego.

```tsx
<GameHeader
  kicker="Mundo Deo · Juego de descenso"   // opcional (eyebrow dorado)
  title={name}                              // título del juego
  description={place.Description}            // opcional (párrafo)
  stats={[{ n: '851 m', l: 'Tu récord' }]}   // opcional: chips a la derecha
/>
```

- `stats?: { n: ReactNode; l: string }[]` — chips numéricos opcionales (récord,
  multiplicador, etc.). Omitilos si tu juego no tiene.

### `GameLoading` — pantalla de carga, **siempre**

[`GameLoading.tsx`](./GameLoading.tsx). Pantalla de carga **común a todos los
juegos**: orbe + barra de progreso, con el **banner del place** de fondo.

```tsx
import GameLoading, { LOADING_MS } from './GameLoading';

const [loading, setLoading] = useState(true);
useEffect(() => {
  const t = setTimeout(() => setLoading(false), LOADING_MS); // LOADING_MS = 5000
  return () => clearTimeout(t);
}, []);

if (loading) return <GameLoading name={place.Name} banner={banner} />;
```

- Duración compartida: **`LOADING_MS` (5 s)**. Cambiala ahí y vale para todos.
- Textos fijos: "Iniciando partida" / "Preparando el juego…".

### `GameRewardModal` — resultado del reclamo (monedas ganadas)

[`GameRewardModal.tsx`](./GameRewardModal.tsx). Modal **genérico** que se muestra
al reclamar. **Acá (y sólo acá) se revelan las monedas**, nunca antes.

```tsx
<GameRewardModal
  reward={res.reward}     // monedas (0..100) que devolvió el motor
  balance={res.balance}   // saldo total actualizado
  onRetry={onRetry}       // ↻ Jugar otra vez
  backHref={backHref}     // /explore/[worldId]/places/[placeId]
/>
```

### `GameCooldownModal` — ya reclamó hace poco

[`GameCooldownModal.tsx`](./GameCooldownModal.tsx). Modal **genérico** para cuando
el usuario intenta reclamar pero ya reclamó este juego en las últimas
`cooldownHours`. **Lleva su propia cuenta regresiva** (no la maneja el padre).

```tsx
<GameCooldownModal
  secondsLeft={status.secondsLeft}            // del status/claim del motor
  cooldownHours={status.cooldownHours ?? 6}
  onRetry={onRetry}
  backHref={backHref}
/>
```

> `GameCooldownModal` también exporta el helper `hhmmss(secs)` (formatea a
> `h:mm:ss` / `mm:ss`), reutilizable por cualquier juego.

**Importante sobre los modales:** `GameRewardModal` y `GameCooldownModal`
renderizan su propio `<div className="overlay show">` y se posicionan absolutos
sobre el contenedor con `position:relative` más cercano. Montalos **dentro del
`.stage`** (o cualquier contenedor relativo) de tu juego para que cubran su área.

---

## El contrato de reclamo (cliente)

El motor vive en el backend; desde el front usás `gamesService` + `useAuth`:

```ts
import { gamesService } from '@/api';
import { useAuth } from '@/hooks/useAuth';

const { updateUser } = useAuth();

// 1) Al montar (en el despachador): status para saber si puede reclamar.
const status = await gamesService.getStatus(placeId);

// 2) El usuario juega y obtiene un `score` interno (en Deo: la profundidad en m).

// 3) Al reclamar (botón siempre visible y/o al perder): mandás el score.
//    OJO: si ya está en cooldown, mostrá <GameCooldownModal> sin llamar al server.
const res = await gamesService.claim(placeId, score);

// 4) Reflejás saldo + revelás monedas en <GameRewardModal>.
updateUser({ balance: res.balance });
// res.reward / res.balance / res.secondsLeft
```

El cooldown (6 h por juego) y el clamp de la recompensa a `0..100` los valida
**siempre el servidor**: el front sólo los usa para la UX.

---

## Cómo agregar un juego nuevo (frontend)

1. **Backend primero**: registrá tu juego en `GAMES` (conversión puntos→monedas)
   y asigná el `GameKey` al place. Ver el README del backend.
2. Creá el componente de tu juego en una subcarpeta (mirá [`deo/`](./deo) como
   referencia: `DeoGame.tsx` + `engine.ts`).
3. En tu componente, **siempre** en este orden:
   - `<GameHeader … />` (siempre visible, también en carga),
   - `GameLoading` durante `LOADING_MS`,
   - tu mecánica (canvas, DOM, lo que sea) dentro de un contenedor relativo,
   - al reclamar: `gamesService.claim` → `<GameRewardModal>`; si cooldown →
     `<GameCooldownModal>`.
4. Branchéalo en [`page.tsx`](./page.tsx) por `status.gameKey === 'tu-clave'`.

Sólo los textos/visual de tu mecánica son propios; **carga, encabezado y modales
de resultado son siempre los componentes genéricos de arriba.**

---

## Mapa de archivos

| Archivo | Rol |
|---|---|
| `page.tsx` | Despachador: trae place+status, elige juego por `gameKey`. Contiene `TemplateGame` (placeholder). |
| `GameHeader.tsx` | Encabezado genérico (kicker/título/descripción/stats). |
| `GameLoading.tsx` | Pantalla de carga genérica (`LOADING_MS`, banner de fondo). |
| `GameRewardModal.tsx` | Modal genérico de recompensa reclamada (revela monedas). |
| `GameCooldownModal.tsx` | Modal genérico de enfriamiento (cuenta regresiva propia) + `hhmmss`. |
| `deo/DeoGame.tsx` | Juego concreto "Los Ojos de Deo" (usa todos los genéricos). |
| `deo/engine.ts` | Motor canvas de Deo (mecánica propia, sin contrato de reclamo). |
