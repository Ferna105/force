---
name: item-generator
description: Genera íconos de items para el juego (Force) con un estilo consistente con los items ya creados, usando la CLI nano-banana (Gemini / Nano Banana, gratis). Usar cuando el usuario pida crear/generar imágenes de objetos, íconos de inventario, armas, armaduras, consumibles, etc. Puede generar un solo item o un SET (p. ej. "una espada en todas las rarezas" o "un set de pociones"). Pregunta todo antes de generar.
user-invocable: true
allowed-tools: Read, Glob, Bash, AskUserQuestion
---

# item-generator — Generador de íconos de items

Genera íconos de items para el catálogo del juego **Force**, manteniendo el estilo
visual de los items que ya existen. La generación la hace **nano-banana** (CLI de
imágenes de Google Gemini, alias "Nano Banana"), pasándole los íconos existentes como
**imágenes de referencia** para que el resultado sea consistente. La generación de
imágenes de Gemini **requiere billing habilitado** en el proyecto de Google Cloud de la
API key (la free tier devuelve `limit: 0` para los modelos de imagen). El modelo más
barato es `gemini-2.5-flash-image` (~US$0.039/imagen; el set de 5 ≈ US$0.20).

Sirve para **un solo item** o para un **set**: el caso típico es "la misma espada en
todas las rarezas" (5 imágenes con auras de distinto color), pero también "un set de
pociones", "tres variantes de escudo", etc.

## Regla de oro: preguntá TODO antes de generar

Generar consume cuota de la free tier de Gemini. **No asumas nada importante.** Usá `AskUserQuestion`
para resolver lo que falte antes de la primera generación. Como mínimo, dejá en claro:

1. **¿Qué objeto?** — descripción concreta (p. ej. "espada larga de acero", "poción de
   vida", "escudo redondo de madera"). Pedí detalles de material/forma si vino vago.
2. **¿Uno o un set?**
   - **Single** → 1 imagen.
   - **Set por rareza** → la MISMA pieza en varias rarezas (cada una con su color de
     aura). Preguntá qué rarezas (todas: common/uncommon/rare/epic/legendary, o un
     subconjunto).
   - **Set por variación** → varios objetos distintos del mismo tema (p. ej. 3 espadas
     diferentes), todos a la misma rareza. Preguntá cuántos y qué los diferencia.
3. **`type`** del item (enum del schema): `weapon` | `armor` | `consumable` | `key` |
   `misc`. (Solo afecta cómo lo nombrás/dónde lo cargás, no el prompt visual.)
4. **`rarity`** (si es single o set por variación): `common` | `uncommon` | `rare` |
   `epic` | `legendary`. Define el color del aura (ver tabla).
5. **Modelo / calidad** — ver "Modelo, tamaño y costo". Default recomendado:
   `gemini-2.5-flash-image` (el más barato, suficiente para íconos). `--model pro` solo
   para piezas "hero". **Ojo:** requiere billing en Google (la free tier no genera imágenes).
6. **Dónde guardar** — default `generated-items/` en la raíz del repo. (No escribas
   directo en `force-back/public/uploads/`: esos los maneja Strapi con hashes; los
   nuevos se suben desde el admin.)

Si el usuario ya dio algún dato en su pedido, no lo vuelvas a preguntar.

## Estilo visual de los items (lo que hay que replicar)

Todos los íconos existentes comparten esta receta — el prompt debe forzarla:

- **Formato cuadrado 1:1**, un **único objeto centrado**, vista en **3/4 (perspectiva
  isométrica suave)**.
- Render **semi-realista pintado a mano**, tipo ícono de inventario de RPG, con buen
  volumen y luz cálida sobre el objeto.
- **Fondo oscuro neutro** con degradé suave (gris/azulado), sin escena ni props extra.
- **Aura/glow de color detrás del objeto que indica la rareza** (esto es lo más
  identitario del set). El color del aura va por rareza:

| Rareza | Color del aura | Imagen de referencia (en `references/`) |
|---|---|---|
| `common` | gris neutro / casi sin glow | `ref-common-grey.png` |
| `uncommon` | verde | `ref-uncommon-green.png` |
| `rare` | azul | `ref-rare-blue.png` |
| `epic` | violeta / púrpura | `ref-epic-purple.png` |
| `legendary` | dorado / ámbar | `ref-legendary-gold.png` |

Las referencias viven en `.claude/skills/item-generator/references/` (son copias de
íconos reales del juego). **Siempre** pasá como referencia la que corresponde a la
rareza objetivo, para clavar el color del aura y el estilo de fondo.

### Plantilla de prompt

Armá el prompt por imagen con esta estructura (en inglés rinde mejor con Gemini):

```
Game inventory item icon of <OBJETO>, single object centered, 3/4 isometric view,
hand-painted semi-realistic render, soft warm lighting, clean dark neutral gradient
background, a <COLOR> glowing aura behind the object indicating <RAREZA> rarity,
square 1:1 composition, no text, no border, matching the reference art style.
```

Reemplazá `<OBJETO>`, `<COLOR>` y `<RAREZA>` según el caso. La consistencia de estilo
la aporta la imagen de referencia que pasás con `-r` (ver comando).

## Generación: CLI nano-banana (Nano Banana / Gemini)

La generación la hace la CLI **`nano-banana`** (skill/plugin de Claude Code:
`kingbootoshi/nano-banana-2-skill`, gratis con key de Google AI Studio).

### Preflight (una vez por máquina)
Antes de generar, resolvé el binario (puede estar en el PATH o en `~/.bun/bin`, que no
siempre está en el PATH de un shell no-interactivo):

```bash
NB=$(command -v nano-banana || echo "$HOME/.bun/bin/nano-banana")
[ -x "$NB" ] && "$NB" --costs >/dev/null 2>&1 && echo "nano-banana OK" || echo "FALTA nano-banana"
```

Usá `"$NB"` en lugar de `nano-banana` en el comando de generación.

Si **no** está instalada, frená y pedile al usuario que corra el setup (necesita
`bun`; en Mac: `brew install oven-sh/bun/bun` o `curl -fsSL https://bun.sh/install | bash`):

```bash
git clone https://github.com/kingbootoshi/nano-banana-2-skill.git ~/tools/nano-banana-2
cd ~/tools/nano-banana-2 && bun install && bun link
mkdir -p ~/.nano-banana
echo "GEMINI_API_KEY=tu_key" > ~/.nano-banana/.env   # key gratis: https://aistudio.google.com/apikey
```

La API key se lee de `GEMINI_API_KEY` (env var) o de `~/.nano-banana/.env`. **No** la
pases por flag (queda en el historial). Si falta la key, frená y pedila.

### Comando por imagen

`nano-banana` recibe el prompt como primer argumento posicional y la(s) referencia(s)
con `-r` (repetible). Ejemplo (una espada rare):

```bash
mkdir -p generated-items
REF=.claude/skills/item-generator/references/ref-<rareza>-<color>.png
"$NB" "Game inventory item icon of a steel longsword, single object centered, 3/4 isometric view, hand-painted semi-realistic render, soft warm lighting, clean dark neutral gradient background, a blue glowing aura behind the object indicating rare rarity, square 1:1 composition, no text, no border, matching the reference art style." \
  -r "$REF" \
  -a 1:1 \
  -s 1K \
  --model gemini-2.5-flash-image \
  -d generated-items \
  -o "<slug-del-item>-rare"
```

- `-r` sube la referencia local a Gemini y la usa como guía de estilo (no hace falta
  ningún token `@ref` en el prompt; la imagen influye directamente).
- Para un **set por rareza**: iterá las rarezas elegidas, cambiando `<rareza>`, el
  color del aura mencionado en el prompt, la referencia `-r` y el sufijo de `-o`.
  **Generá secuencialmente** (una por una) y reportá cada path al terminar.
- `-o` es el nombre base (sin extensión); el archivo sale en `-d generated-items`.
  Usá `-o <slug-del-item>-<rareza>` para que sean fáciles de cargar.

### Modelo, tamaño y costo
- `--model gemini-2.5-flash-image` — **más barato (~US$0.039/img). Default recomendado**
  para los íconos (calidad de sobra para inventario).
- `--model pro` (Gemini 3 Pro Image) — máxima calidad, bastante más caro; reservalo para
  piezas "hero".
- `--model flash` (Gemini 3.1 Flash Image) — intermedio.
- `-s` tamaño: `512` (draft) · `1K` (recomendado para íconos) · `2K`/`4K` si querés más
  resolución para reescalar.
- **Billing obligatorio.** La generación de imágenes NO está en la free tier: con una key
  sin billing, los 3 modelos devuelven `HTTP 429 … limit: 0` (cuota diaria 0). Eso **no**
  se arregla reintentando — hay que habilitar billing en el proyecto de Google Cloud de
  la key (console.cloud.google.com → Billing). Un 429 con `limit: 0` = falta billing;
  un 429 con `limit > 0` = rate-limit pasajero (ahí sí, esperá y reintentá).
- `nano-banana --costs` muestra el uso/gasto acumulado.

## Después de generar

1. Mostrá al usuario los paths guardados (no leas las imágenes de vuelta salvo que las
   quiera revisar; si las querés mostrar, leelas con Read).
2. Recordale cómo cargarlas: **Strapi admin → Content Manager → Item → New**, subir la
   imagen al campo `icon`, y completar `name`, `slug` (se autollena), `type`, `rarity`,
   etc. (campos del schema en `force-back/src/api/item/content-types/item/schema.json`).
3. Si algún resultado no quedó bien, ofrecé regenerar esa pieza ajustando el prompt
   (no hace falta rehacer todo el set).

## Notas
- Si querés sumar más referencias por rareza, copiá más íconos reales desde
  `force-back/public/uploads/` a `references/` con el nombre `ref-<rareza>-<color>.png`.
- UI y datos del proyecto están en español; los prompts a nano-banana, en inglés.
