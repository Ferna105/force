# Motor de juegos — guía de integración

Cómo conectar **cada juego** del sitio (places de tipo `game`) con el motor de
recompensas. Este documento es el contrato que debe seguir todo juego nuevo.

---

## 1. Qué resuelve el motor (y qué NO)

El motor (`src/api/game/`) es **solo el contrato para reclamar recompensas**. No
sabe nada de la mecánica de tu juego.

**El motor resuelve, transversal a todos los juegos:**

- **Conversión puntos → monedas**, clampeada a **`[0..100]`**. Cada juego registra
  su propia función de conversión, pero **se ejecuta en el servidor** (ver §6:
  nunca se confía el número final al cliente).
- **Enfriamiento por juego**: en cada place de tipo `game` se puede reclamar **una
  vez cada 6 horas** (`COOLDOWN_HOURS`). Cada juego (place) lleva su contador
  propio e independiente del resto.
- Acreditar el `balance` del usuario y devolver el estado de cooldown actualizado.

**Lo que pone cada juego:** toda su mecánica (UI, lógica, puntaje interno) y, en el
backend, **una sola función**: cómo se traducen sus puntos a monedas.

---

## 2. El contrato HTTP

Dos endpoints, ambos requieren **usuario autenticado** (el cooldown es por usuario).

### `GET /api/games/:placeId/status`

Estado del juego para el usuario logueado. Úsalo para saber si ya puede reclamar o
está en enfriamiento.

```json
{
  "gameKey": "template",
  "cooldownHours": 6,
  "canClaim": true,
  "secondsLeft": 0,
  "nextClaimAt": null
}
```

- `canClaim` — `true` si puede reclamar ahora.
- `secondsLeft` — segundos hasta poder reclamar de nuevo (0 si ya puede).
- `nextClaimAt` — ISO del próximo reclamo disponible (`null` si nunca reclamó).

### `POST /api/games/:placeId/claim`

Reclama la recompensa. Body opcional `{ points }` (el puntaje interno del juego; el
`template` lo ignora).

**Éxito (200):**

```json
{
  "reward": 73,
  "balance": 1553,
  "gameKey": "template",
  "canClaim": false,
  "secondsLeft": 21600,
  "nextClaimAt": "2026-06-12T18:00:00.000Z"
}
```

**Errores:**

| Situación | HTTP | Cuerpo |
|---|---|---|
| El place no existe | `404` | `Lugar no encontrado.` |
| El place no es de tipo `game` | `400` | `El lugar no es un juego.` |
| Está en enfriamiento | `400` | `Todavía no podés reclamar…` + `details: { secondsLeft, nextClaimAt }` |
| Sin sesión | `401` | `Iniciá sesión para reclamar.` |

> El cooldown se valida **siempre en el servidor**. El front lo chequea para la UX,
> pero aunque alguien fuerce el `POST`, el motor lo rechaza.

---

## 3. Agregar un juego nuevo — paso a paso

### Paso 1 — Backend: registrar la conversión puntos → monedas

En [`engine.js`](./engine.js), agregá una entrada al objeto `GAMES`. La clave es el
`GameKey` que vas a asignarle al place.

```js
const GAMES = {
  template: { /* … */ },

  // Ejemplo: un juego de puntería. El usuario hace hasta ~5000 puntos.
  'aim-trainer': {
    label: 'Tiro al blanco',
    // points = puntaje interno que mandó el juego. ctx = { place, user }.
    pointsToCoins(points) {
      // Mapeá tu rango de puntaje al rango de monedas que quieras (0..100).
      // El motor clampea igual, pero conviene que la curva sea intencional.
      return Math.round((Number(points) || 0) / 50); // 5000 pts → 100 monedas
    },
  },
};
```

Reglas de la función:

- Firma: `pointsToCoins(points, ctx)` → número de monedas. `ctx = { place, user }`.
- **No hace falta clampear**: el motor aplica `clampReward` (`0..100`, redondeo).
- Debe ser **determinística respecto del input** salvo que el juego sea de azar
  (como el `template`). Si depende del azar, generalo acá en el server, no en el
  cliente.
- No hagas efectos secundarios (no escribas en la DB acá): el motor se encarga de
  acreditar y sellar el cooldown.

### Paso 2 — Admin de Strapi: asignar el `GameKey` al place

En el place de tipo `game` correspondiente, seteá el campo **`GameKey`** al valor de
la clave que registraste (p. ej. `aim-trainer`).

- Si el `GameKey` está vacío o no coincide con ninguna clave de `GAMES`, el place
  cae automáticamente al juego **`template`** (animación + recompensa aleatoria).
- No requiere cambios de schema ni redeploy del backend para asignarlo (es un campo
  del place). Sí requiere que el código de `GAMES` con esa clave ya esté deployado.

### Paso 3 — Frontend: construir el juego y reclamar

Cada juego es una página web bajo la ruta de play. Hoy todos comparten el template
en:

```
force-front/src/app/explore/[worldId]/places/[placeId]/play/page.tsx
```

Para un juego propio tenés dos opciones:

1. **Branchear por `gameKey`** dentro de esa página (traés el `status`, y según
   `status.gameKey` renderizás el componente del juego correspondiente). Recomendado
   mientras sean pocos juegos.
2. Extraer cada juego a su propio componente y elegirlo con un registro en el front.

En cualquier caso, el juego debe usar el servicio ya existente:

```ts
import { gamesService } from '@/api';
import { useAuth } from '@/hooks/useAuth';

const { updateUser } = useAuth();

// 1) Al montar: traé el estado (para saber si puede reclamar o está en cooldown).
const status = await gamesService.getStatus(placeId);

// 2) El usuario juega tu mecánica y obtiene un puntaje interno `score`.

// 3) Al terminar / tocar "Reclamar", llamás claim con el puntaje:
const res = await gamesService.claim(placeId, score);

// 4) Reflejá el saldo nuevo y el cooldown en la UI:
updateUser({ balance: res.balance });
// res.reward      → monedas ganadas (0..100)
// res.secondsLeft → cuándo se vuelve a habilitar (arrancá el contador con esto)
```

Mirá el template actual como referencia de cómo manejar las fases (animación →
botón de reclamo → countdown de cooldown) y el toast de recompensa.

---

## 4. Semántica del enfriamiento (cooldown)

- Es **por juego (por place)**: reclamar en el juego A no afecta al juego B.
- Dura `COOLDOWN_HOURS = 6` horas desde el último reclamo de ese juego.
- Se persiste en `user.gameCooldowns` (campo `json`, privado): un mapa
  `{ [placeId]: ISO del último reclamo }`. No hay tabla aparte ni cron.
- Para cambiar la duración global, editá `COOLDOWN_HOURS` en `engine.js`.

---

## 5. Rango de la recompensa

- Siempre `0..100` monedas (`MIN_REWARD` / `MAX_REWARD`), redondeada.
- Diseñá tu `pointsToCoins` para que la **curva** sea la que querés (lineal, por
  tramos, con techo antes de 100, etc.). El clamp del motor es una red de seguridad,
  no la regla de diseño.

---

## 6. Seguridad — no confíes en el puntaje del cliente

El `claim` recibe `points` **desde el navegador**, así que un usuario podría
mandar un puntaje inflado. Para el `template` no importa (es azar puro). Para un
juego real con recompensa significativa, elegí una de estas estrategias:

- **Validación server-side**: que `pointsToCoins` (vía `ctx`) recompute o acote el
  puntaje con datos confiables (estado de partida guardado, semilla del server,
  etc.), en lugar de confiar en `points` tal cual.
- **Partida con sesión server-authoritative**: guardá el progreso de la partida en
  el backend y derivá el puntaje de ahí, ignorando lo que mande el cliente.
- **Techos conservadores**: mantené el máximo de monedas bajo si la mecánica es
  fácil de falsificar.

Documentá en tu entrada de `GAMES` qué garantía de integridad tiene tu juego.

---

## 7. Checklist para sumar un juego

- [ ] Entrada en `GAMES` (`engine.js`) con `label` y `pointsToCoins`.
- [ ] Backend deployado con esa clave.
- [ ] Place de tipo `game` con su `GameKey` = la clave, en el admin.
- [ ] UI del juego en el front que llama a `gamesService.claim(placeId, score)`.
- [ ] La UI usa `gamesService.getStatus` para mostrar el cooldown.
- [ ] `updateUser({ balance })` tras reclamar, para reflejar el saldo.
- [ ] Estrategia de integridad del puntaje definida (§6) si la recompensa importa.

---

## 8. Mapa de archivos

| Archivo | Rol |
|---|---|
| `src/api/game/engine.js` | Registro `GAMES`, conversión, cooldown, `claim`. |
| `src/api/game/controllers/game.js` | Endpoints `status` y `claim`. |
| `src/api/game/routes/game.js` | Rutas `/games/:placeId/status` y `/claim`. |
| `src/seed.js` | Otorga permisos `game.status` / `game.claim` (rol Authenticated). |
| `place.schema.json` → `GameKey` | Qué juego corre cada place. |
| `user.schema.json` → `gameCooldowns` | Mapa de cooldowns por juego del usuario. |
| `force-front/src/api/services.ts` → `gamesService` | Cliente del front. |
| `force-front/.../places/[placeId]/play/page.tsx` | Pantalla de play (template). |
