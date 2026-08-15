#!/bin/sh
# IT Value Bridge — database restore (docs/ROADMAP.md M5).
#
#   ./scripts/restore.sh ./backups/itvb-20260811T090000Z.dump
#
# Restores into the database named by DATABASE_URL, REPLACING its contents.
# Requires explicit confirmation, because the common way to lose data during a
# restore is restoring the wrong dump into the right database.
set -eu

DUMP="${1:-}"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "usage: $0 <dump-file>" >&2
  exit 1
fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[restore] DATABASE_URL is not set." >&2
  exit 1
fi

# Show the operator what they are about to overwrite, with the password
# stripped — this line ends up in shell history and terminal scrollback.
SAFE_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:]*):[^@]*@#\1:****@#')"
echo "[restore] source : $DUMP"
echo "[restore] target : $SAFE_URL"
echo "[restore] This REPLACES all data in the target database."

if [ "${RESTORE_CONFIRM:-}" != "yes" ]; then
  printf '[restore] Type "restore" to continue: '
  read -r ANSWER
  [ "$ANSWER" = "restore" ] || { echo "[restore] aborted."; exit 1; }
fi

echo "[restore] restoring…"
# --clean --if-exists : drop existing objects first, tolerating a fresh database
# --no-owner --no-acl : match how the dump was taken
# --single-transaction: all-or-nothing. A half-restored portfolio is worse than
#                       a failed restore, because it looks like it worked.
pg_restore "$DUMP" \
  --dbname "$DATABASE_URL" \
  --clean --if-exists \
  --no-owner --no-acl \
  --single-transaction

echo "[restore] done. Run 'npx prisma migrate status' to confirm the schema matches this build."
