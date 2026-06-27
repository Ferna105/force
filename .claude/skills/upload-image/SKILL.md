---
name: upload-image
description: Carga imágenes adjuntas a un place (campo Banner), una region (campo Banner), un world (campo Image) o un item (campo icon) del juego Force, primero en la base LOCAL (Docker) y luego en PRODUCCIÓN (Railway). Usar cuando el usuario adjunte una o varias imágenes y pida cargarlas/subirlas/asignarlas a un lugar, una región, un mundo o un objeto del catálogo.
---

# upload-image — Cargar imágenes a places/items (local + prod)

Sube imágenes adjuntas y las asigna al campo de media de un **place** (`Banner`) o
un **item** (`icon`), usando el plugin de upload de Strapi en cada entorno: genera
el binario en `public/uploads`, la fila en `files` (con sus formats) y el morph al
campo. Corre **primero en LOCAL** (container Docker) y **después en PROD** (Railway
por SSH). En prod el binario queda en el volumen `/app/public/uploads`.

## Requisitos (ya configurados en este repo)

- Docker corriendo con el stack arriba (`docker compose ps` → `back` Up). El upload
  local corre dentro del container `back` (el repo está montado en `/app`).
- Acceso SSH a prod vía el alias `railway-back` (root de Strapi en `/app`, Node 20).
- Para verificar URLs servidas: backend de prod en
  `https://back-production-3f97.up.railway.app`, local en `http://localhost:1337`.

## Campos por tipo

| kind     | content-type          | match por | campo de media (default) |
|----------|-----------------------|-----------|--------------------------|
| `place`  | `api::place.place`    | `Name`    | `Banner`                 |
| `region` | `api::region.region`  | `Name`    | `Banner`                 |
| `world`  | `api::world.world`    | `Name`    | `Image`                  |
| `monster`| `api::monster.monster`| `Name`    | `Image`                  |
| `item`   | `api::item.item`      | `name`    | `icon`                   |

## Cómo usarla (pasos para el agente)

1. **Identificá el destino de cada imagen** preguntando al usuario si hace falta:
   el `kind` (place/item), y a qué entry va (nombre exacto del place/item, o su id).
   Si el usuario nombró un lugar/objeto que puede no existir o estar ambiguo,
   confirmá el nombre exacto consultando la DB local antes de subir, p. ej.:
   ```bash
   docker compose exec -T db psql -U strapi -d strapi -c \
     "SELECT id,name FROM items WHERE name ILIKE '%espada%';"
   docker compose exec -T db psql -U strapi -d strapi -c \
     "SELECT id,name FROM places WHERE name ILIKE '%mercado%';"
   ```
   (las columnas en Postgres son lowercase: `name` para place e item).

2. **Armá una carpeta de input temporal** con las imágenes adjuntas (copialas con
   nombres limpios, sin espacios) y un `manifest.json`. Las imágenes adjuntas suelen
   estar en `~/Downloads` o en la ruta `source:` que muestra el adjunto.
   ```bash
   IN=$(mktemp -d)
   cp "/ruta/a/la/imagen adjunta.png" "$IN/mercado.png"
   cat > "$IN/manifest.json" <<'JSON'
   [
     { "kind": "place", "match": "Mercado Bioluminiscente", "file": "mercado.png" },
     { "kind": "item",  "id": 42, "field": "icon", "file": "espada.png" }
   ]
   JSON
   ```
   Cada entrada del manifest: `kind` (place|item), `match` (nombre exacto) **o** `id`
   numérico, `file` (nombre del archivo en la carpeta), y opcional `field` para
   forzar otro campo de media. El default de `field` sale de la tabla de arriba.

3. **Corré la skill** (sube a local y luego a prod; hace cleanup solo):
   ```bash
   bash .claude/skills/upload-image/run.sh "$IN"        # both (default)
   bash .claude/skills/upload-image/run.sh "$IN" local  # solo local
   bash .claude/skills/upload-image/run.sh "$IN" prod   # solo prod
   ```
   El script imprime una línea `RESULT {json}` por imagen (con `status`,
   `id`, `url`) y un `SUMMARY {ok,failed}` al final, en cada entorno. `status` puede
   ser `uploaded`, `skipped` (ya tenía ese mismo archivo) o `error`.

4. **Verificá** que cada entorno sirva las imágenes nuevas (HTTP 200) usando las
   URLs que devolvió cada `RESULT`:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:1337<url>"
   curl -s -o /dev/null -w "%{http_code}\n" "https://back-production-3f97.up.railway.app<url>"
   ```
   También podés confirmar vía API que el entry quedó con su media poblada
   (`/api/places?populate=Banner` o `/api/items?populate=icon`).

5. **Reportá** al usuario una tabla con cada imagen, el entry destino, y el estado
   en local y prod.

## Notas

- Es **idempotente**: si el entry ya tiene ese mismo archivo en el campo, lo saltea.
  Si tiene otra imagen, la reemplaza (el archivo viejo queda huérfano, inofensivo).
- Corre siempre con `SEED=false` para no re-disparar el seed de bootstrap.
- El staging temporal vive en `force-back/scripts/.upload-img-<pid>` (local) y
  `/app/scripts/.upload-img-<pid>` (prod) y se borra al terminar (trap EXIT).
- Si `docker compose exec` o el SSH fallan, revisá que el stack esté arriba y que el
  alias `railway-back` resuelva (`ssh railway-back pwd`).
