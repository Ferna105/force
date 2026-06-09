---
name: db-sync
description: Sincroniza la base de datos entre LOCAL (Docker/Postgres) y PRODUCCIÓN (Railway) en cualquiera de las dos direcciones. Usar cuando el usuario pida "dumpear", copiar, clonar, sincronizar o igualar la base local y la de producción (prod→local o local→prod). Hace backup del destino antes de sobrescribir.
---

# db-sync — Sincronización LOCAL ⇄ PROD

Copia el contenido completo de una base de datos Postgres sobre la otra. La fuente
queda intacta; el **destino se sobrescribe** (se respalda antes en `.db-backups/`).

## Direcciones

- `prod-to-local` — PROD ─▶ LOCAL. Trae la data productiva a tu base local.
- `local-to-prod` — LOCAL ─▶ PROD. Publica tu data local en producción.

## Uso

```bash
bash .claude/skills/db-sync/sync-db.sh prod-to-local
bash .claude/skills/db-sync/sync-db.sh local-to-prod
```

El script, según la dirección:
1. Backupea el **destino** en `.db-backups/<destino>_pre_<timestamp>.sql`.
2. Dumpea la **fuente** (`pg_dump --no-owner --no-privileges`).
3. `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` en el destino.
4. Restaura el dump de la fuente en el destino (`psql`, frena ante el primer error).

## Requisitos / configuración

- **Docker** corriendo, con el contenedor de la DB local arriba (`docker compose up -d db`).
  Default del contenedor: `force-db-1`, usuario `strapi`, db `strapi`
  (overridables con `LOCAL_DB_CONTAINER` / `LOCAL_DB_USER` / `LOCAL_DB_NAME`).
- **URL de prod**: el script la lee de `.db-sync.env` en la raíz del repo
  (`PROD_DATABASE_URL=postgresql://…`), o de la variable de entorno `PROD_DATABASE_URL`.
  Ese archivo está gitignored porque tiene credenciales productivas.
- **Versiones de Postgres**: el cliente que habla con prod corre vía la imagen
  `postgres:18-alpine` (PROD es PG 18). El server local debe ser PG ≥ 18 para que el
  restore prod→local sea limpio (el `db` del compose usa `postgres:18-alpine`). Si
  cambiás esas versiones, ajustá `PG_CLIENT_IMAGE` y la imagen del compose.

## Notas importantes

- La app de **producción en Railway comparte la misma base** que se modifica con
  `local-to-prod`: sobrescribirla impacta el sitio en vivo. Hay un backup automático
  en `.db-backups/` por las dudas.
- Apuntar el **backend local** a una u otra base es independiente de esta skill: se
  controla con `docker-compose.override.yml` (presente = apunta a prod; ausente =
  apunta a la base local). Recreá el back con `docker compose up -d back` tras cambiarlo.
- Los backups de `.db-backups/` están gitignored. Restaurar uno a mano:
  `docker exec -i force-db-1 psql -U strapi -d strapi < .db-backups/<archivo>.sql`.

## Troubleshooting

- **El contenedor `db` queda en loop de reinicio** (`docker compose ps` lo muestra
  `Restarting`) con un error tipo *"There appears to be PostgreSQL data in
  /var/lib/postgresql/data (unused mount/volume)"*. Pasa cuando el volumen `db-data`
  trae data de una config vieja (mount en `/var/lib/postgresql/data`, estilo pre-PG18)
  pero el compose actual montea `/var/lib/postgresql` (estilo PG 18, data en subdir
  versionado). Como `db` nunca queda *healthy*, el `back` tampoco arranca y el sync
  no puede correr. Solución (destruye la data local, recuperable de prod con un sync):
  ```bash
  docker compose down
  docker volume rm force_db-data
  docker compose up -d
  ```
- **El `back` sigue apuntando a prod tras borrar/renombrar `docker-compose.override.yml`.**
  El contenedor viejo conserva las env con las que se creó. Recrealo:
  `docker compose up -d back` y verificá con
  `docker compose exec -T back printenv DATABASE_HOST` (debe decir `db`).
