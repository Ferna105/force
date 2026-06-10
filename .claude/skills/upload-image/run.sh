#!/usr/bin/env bash
#
# Orquesta la carga de imágenes a places/items, primero en LOCAL (Docker) y
# luego en PROD (Railway por SSH), usando upload-image.js con el plugin de
# upload de Strapi en cada entorno.
#
# Uso:
#   bash run.sh <INPUT_DIR> [local|prod|both]
#
# <INPUT_DIR> debe contener:
#   - manifest.json   (ver formato en upload-image.js)
#   - los archivos de imagen referenciados por el manifest
#
# El 2º argumento elige el destino (default: both).
#
# Overridables por entorno:
#   BACK_SERVICE   (default: back)          servicio del compose con Strapi
#   RAILWAY_SSH    (default: railway-back)  alias SSH del back de producción
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACK_DIR="$REPO_ROOT/force-back"
BACK_SERVICE="${BACK_SERVICE:-back}"
RAILWAY_SSH="${RAILWAY_SSH:-railway-back}"

# Nombre único del directorio de staging (relativo a /app en ambos entornos).
STAGE_REL="scripts/.upload-img-$$"
LOCAL_STAGE="$BACK_DIR/$STAGE_REL"

INPUT_DIR="${1:?Falta INPUT_DIR (carpeta con manifest.json + imágenes)}"
TARGET="${2:-both}"

if [[ ! -f "$INPUT_DIR/manifest.json" ]]; then
  echo "ERROR: no encuentro $INPUT_DIR/manifest.json" >&2
  exit 1
fi

cleanup() {
  rm -rf "$LOCAL_STAGE" 2>/dev/null || true
  if [[ "$TARGET" == "prod" || "$TARGET" == "both" ]]; then
    ssh -o ConnectTimeout=25 "$RAILWAY_SSH" "rm -rf /app/$STAGE_REL" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# 1) Staging: script + manifest + imágenes en force-back/scripts/<stage> (bind-mounted → /app/<stage>).
mkdir -p "$LOCAL_STAGE"
cp "$SCRIPT_DIR/upload-image.js" "$LOCAL_STAGE/"
cp "$INPUT_DIR/manifest.json" "$LOCAL_STAGE/"
# copiar todas las imágenes referenciadas
python3 - "$INPUT_DIR" "$LOCAL_STAGE" <<'PY'
import json, os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
man = json.load(open(os.path.join(src, 'manifest.json')))
for row in man:
    f = row['file']
    shutil.copy(os.path.join(src, f), os.path.join(dst, f))
print(f"staged {len(man)} imagen(es)")
PY

run_local() {
  echo "=== LOCAL (docker compose: $BACK_SERVICE) ==="
  ( cd "$REPO_ROOT" && docker compose exec -T -e SEED=false "$BACK_SERVICE" \
      node "$STAGE_REL/upload-image.js" ) 2>&1 | grep -E 'RESULT |SUMMARY ' || {
        echo "ERROR: el script local no produjo resultados" >&2; return 1; }
}

run_prod() {
  echo "=== PROD (Railway: $RAILWAY_SSH) ==="
  # push del staging a /app/<stage>
  tar czf - -C "$BACK_DIR/scripts" ".upload-img-$$" \
    | ssh -o ConnectTimeout=25 -o ServerAliveInterval=20 "$RAILWAY_SSH" \
        "mkdir -p /app/scripts && tar xzf - -C /app/scripts" 2>/dev/null
  ssh -o ConnectTimeout=25 -o ServerAliveInterval=20 "$RAILWAY_SSH" \
    "cd /app && SEED=false node $STAGE_REL/upload-image.js" 2>&1 \
    | grep -E 'RESULT |SUMMARY ' || {
        echo "ERROR: el script de prod no produjo resultados" >&2; return 1; }
}

case "$TARGET" in
  local) run_local ;;
  prod)  run_prod ;;
  both)  run_local; echo; run_prod ;;
  *) echo "TARGET inválido: $TARGET (local|prod|both)" >&2; exit 1 ;;
esac

echo "=== LISTO ==="
