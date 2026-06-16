# Motor de entrenamiento (escuela de adiestramiento)

API **code-only** (sin content-type propio, patrón `shop`/`battle`/`game`/`discovery`) que
permite **subir las stats de combate de un compañero** pagando con un **tótem** y esperando
un tiempo real. Toda la lógica pura vive en `engine.js`.

## Reglas

- Stats entrenables: **fuerza, defensa, velocidad, salud y nivel** (`STATS`).
- Cada entrenamiento sube la stat elegida **+1** (o **+2** si es especialidad del
  entrenador de la escuela — ver "Entrenador"). El nivel sube siempre de a 1, hasta 100.
- **Tope** de fuerza/defensa/velocidad = **2 × nivel**; el de **salud = 4 × nivel** (sube
  más alto que el resto). Para pasar el tope hay que subir nivel primero (`statCap` / `CAP_MULT`).
- **Pago = 1 tótem** (`category: 'totem'`) de la rareza que corresponde al nivel del
  compañero (`rarityByLevel`):

  | nivel | rareza del tótem |
  |---|---|
  | 1–19 | common |
  | 20–39 | uncommon |
  | 40–59 | rare |
  | 60–79 | epic |
  | 80–100 | legendary |

- El entrenador exige **un tótem puntual** elegido al azar entre los de esa rareza
  (`ensureDemandedTotem`); la demanda se **persiste** en `companion.demandedTotem` y es
  estable entre recargas (sólo se re-sortea al pagar o si cambia la banda de nivel).
- **Duración real** según rareza (`DAYS_BY_RARITY`): común 1 día, poco común 2, raro 3,
  épico 4, legendario 5.
- Mientras entrena, el compañero **no puede pelear** en los battledome (lo bloquea
  `battle.create`/`battle.join` mirando `trainingEndsAt`).

## Estado en el compañero (schema `companion`)

- `trainingStat` (enum) — disciplina en curso; null si no entrena.
- `trainingEndsAt` (datetime) — cuándo termina; null si no entrena.
- `trainingGain` (int) — cuánto sube al terminar (1 ó 2), fijado al iniciar.
- `demandedTotem` (relation → item) — el tótem puntual exigido para el próximo entrenamiento.

La resolución es **perezosa**: cuando un entrenamiento ya venció, `companion.service`
`resolveTraining(companion)` aplica el `+trainingGain` (clamp al tope), limpia los campos y
devuelve el row. Lo llaman `training.info`, `training.start` y `companion.mine` (no hay cron).

## Entrenador (content-type `trainer`)

Cada escuela tiene un `trainer` (`name`, `image`, `specialties: json` con las stats en las
que es experto, `place` → la escuela). Si la disciplina entrenada está en `specialties`,
el incremento es **+2** (`gainFor`). El front lo recibe dentro de la respuesta de `info`.

## Endpoints (ambos requieren auth)

- `GET /training/:placeId/info?companionId=` → estado:
  - en curso: `{ status:'training', stat, gain, endsAt, secondsLeft, trainer }`.
  - libre: `{ status:'idle', level, requiredRarity, days, trainer,
    demandedTotem:{id,name,rarity,iconUrl}, ownsDemanded, stats:[{key,value,cap,canTrain,gain}] }`.
- `POST /training/:placeId/start { companionId, stat }` → valida place `training`, propiedad,
  que no esté ya entrenando ni en un duelo, que la stat no haya llegado al tope y que el
  usuario **posea el tótem exigido**; descuenta 1 tótem, programa el entrenamiento y devuelve
  el nuevo estado.

Permisos (`training.info` / `training.start`) se otorgan al rol Authenticated en `src/seed.js`.

## Agregar / ajustar

- Cambiar tiempos o bandas de rareza = editar `DAYS_BY_RARITY` / `rarityByLevel` en `engine.js`.
- Crear otra escuela = un place `Type:'training'` + un `trainer` con su `place`. Todas las
  escuelas enseñan todo; lo único que varía es el entrenador (sus especialidades dan el +2).
