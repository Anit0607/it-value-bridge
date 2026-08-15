#!/bin/sh
# IT Value Bridge — database backup (docs/ROADMAP.md M5).
#
# Produces a single compressed custom-format dump, which is what pg_restore
# needs to restore selectively and in parallel. A plain SQL dump would be
# simpler to read but cannot do either.
#
#   ./scripts/backup.sh                  # writes ./backups/itvb-<timestamp>.dump
#   BACKUP_DIR=/mnt/nas ./scripts/backup.sh
#
# Reads DATABASE_URL from the environment. Inside docker-compose:
#   docker compose exec app ./scripts/backup.sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] DATABASE_URL is not set." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/itvb-$STAMP.dump"

echo "[backup] dumping to $TARGET"
# --format=custom  : required by pg_restore
# --no-owner       : the restore target may use a different role name
# --no-acl         : grants are environment-specific, not data
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file "$TARGET"

# A dump that cannot be listed is not a backup. Verifying the archive header
# here turns a silent corruption into a failure at backup time, rather than a
# discovery during an actual restore.
if ! pg_restore --list "$TARGET" > /dev/null 2>&1; then
  echo "[backup] FAILED: $TARGET is not a readable archive." >&2
  rm -f "$TARGET"
  exit 1
fi

SIZE="$(wc -c < "$TARGET" | tr -d ' ')"
echo "[backup] ok — $TARGET ($SIZE bytes), archive verified"

# Retention. Deliberately conservative and off by default: deleting a client's
# only good backup because a variable was mistyped is worse than keeping too
# many files.
if [ -n "${BACKUP_RETAIN_DAYS:-}" ]; then
  echo "[backup] removing dumps older than $BACKUP_RETAIN_DAYS days"
  find "$BACKUP_DIR" -name 'itvb-*.dump' -type f -mtime "+$BACKUP_RETAIN_DAYS" -print -delete
fi
