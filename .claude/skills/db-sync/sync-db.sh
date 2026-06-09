#!/usr/bin/env bash
set -euo pipefail

# ── Sincronización de base de datos: LOCAL (Docker) ⇄ PROD (Railway) ──────────
# Uso:
#   ./sync-db.sh prod-to-local    # PROD  ─▶ LOCAL   (sobrescribe LOCAL)
#   ./sync-db.sh local-to-prod    # LOCAL ─▶ PROD    (sobrescribe PROD)
#
# Antes de sobrescribir el destino SIEMPRE deja un backup en ./.db-backups/.
# Requiere Docker corriendo (el contenedor de la DB local debe estar arriba).
# La URL de prod se lee de .db-sync.env (PROD_DATABASE_URL) en la raíz del repo,
# o de la variable de entorno PROD_DATABASE_URL.

DIRECTION="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# Config de la DB local (override por entorno si hiciera falta)
LOCAL_CONTAINER="${LOCAL_DB_CONTAINER:-force-db-1}"
LOCAL_USER="${LOCAL_DB_USER:-strapi}"
LOCAL_DB="${LOCAL_DB_NAME:-strapi}"

# Imagen con cliente de Postgres que matchea la versión de PROD (18).
# Se usa para hablar con PROD; dumpear un server más nuevo que el cliente falla,
# por eso NO se usan las herramientas del contenedor local contra prod.
PG_IMAGE="${PG_CLIENT_IMAGE:-postgres:18-alpine}"

# Cargar URL de prod desde .db-sync.env si existe
# shellcheck disable=SC1090
[ -f "$ROOT/.db-sync.env" ] && { set -a; . "$ROOT/.db-sync.env"; set +a; }
PROD_URL="${PROD_DATABASE_URL:-}"

usage() { echo "Uso: $0 [prod-to-local|local-to-prod]" >&2; exit 1; }

[ -n "$PROD_URL" ] || { echo "✗ Falta PROD_DATABASE_URL (definilo en $ROOT/.db-sync.env)" >&2; exit 1; }
docker exec "$LOCAL_CONTAINER" true 2>/dev/null || {
  echo "✗ No encuentro el contenedor '$LOCAL_CONTAINER'. ¿Está arriba? (docker compose up -d db)" >&2; exit 1; }

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/.db-backups"
mkdir -p "$BACKUP_DIR"

DUMP_FLAGS=(--no-owner --no-privileges)

dump_local()    { docker exec "$LOCAL_CONTAINER" pg_dump -U "$LOCAL_USER" -d "$LOCAL_DB" "${DUMP_FLAGS[@]}"; }
dump_prod()     { docker run --rm "$PG_IMAGE" pg_dump "$PROD_URL" "${DUMP_FLAGS[@]}"; }
restore_local() { docker exec -i "$LOCAL_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$LOCAL_USER" -d "$LOCAL_DB"; }
restore_prod()  { docker run --rm -i "$PG_IMAGE" psql -v ON_ERROR_STOP=1 "$PROD_URL"; }
wipe_local()    { docker exec "$LOCAL_CONTAINER" psql -U "$LOCAL_USER" -d "$LOCAL_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; }
wipe_prod()     { docker run --rm "$PG_IMAGE" psql "$PROD_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; }

case "$DIRECTION" in
  prod-to-local)
    echo "▶ PROD ─▶ LOCAL  (se sobrescribe la base LOCAL)"
    echo "  1/4 Backup de LOCAL → .db-backups/local_pre_${TS}.sql"
    dump_local > "$BACKUP_DIR/local_pre_${TS}.sql" 2>/dev/null || echo "      (local vacía o no dumpeable, se omite backup)"
    echo "  2/4 Dump de PROD"
    dump_prod > "$BACKUP_DIR/prod_src_${TS}.sql"
    echo "  3/4 Limpiando schema de LOCAL"
    wipe_local >/dev/null
    echo "  4/4 Restaurando PROD en LOCAL"
    restore_local < "$BACKUP_DIR/prod_src_${TS}.sql" >/dev/null
    echo "✓ LOCAL es ahora copia de PROD. Backup previo: .db-backups/local_pre_${TS}.sql"
    ;;
  local-to-prod)
    echo "▶ LOCAL ─▶ PROD  (se sobrescribe la base de PRODUCCIÓN)"
    echo "  1/4 Backup de PROD → .db-backups/prod_pre_${TS}.sql"
    dump_prod > "$BACKUP_DIR/prod_pre_${TS}.sql"
    echo "  2/4 Dump de LOCAL"
    dump_local > "$BACKUP_DIR/local_src_${TS}.sql"
    echo "  3/4 Limpiando schema de PROD"
    wipe_prod >/dev/null
    echo "  4/4 Restaurando LOCAL en PROD"
    restore_prod < "$BACKUP_DIR/local_src_${TS}.sql" >/dev/null
    echo "✓ PROD es ahora copia de LOCAL. Backup previo: .db-backups/prod_pre_${TS}.sql"
    ;;
  *) usage ;;
esac
