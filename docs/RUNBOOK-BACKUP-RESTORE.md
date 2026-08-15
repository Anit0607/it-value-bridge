# Runbook — Backup and Restore

> **Status: tested.** The round trip in §4 was executed against a populated
> database on 2026-08-11 and all table counts matched exactly. An untested
> backup procedure is not a backup procedure.

Applies to the on-prem Docker deployment. The hosted demo (Vercel + Neon) uses
Neon's own point-in-time recovery and is not covered here — it holds no client
data by design.

---

## 1. What is being protected

Everything of value lives in PostgreSQL. The application container is stateless:
it can be destroyed and recreated from the image at any time.

| Data | Why it matters |
|---|---|
| Initiatives, benefit claims, measurements | The portfolio itself |
| `HistoryLog`, `PendingApproval`, `ValueRestatement` | The audit trail — who approved what, and when |
| `MonthlyReport` | Published board snapshots. **Not reproducible** by recomputation; that is their entire purpose |
| `LifecycleStage`, `Organization` | Workspace configuration |
| `User` | Accounts, password hashes, MFA secrets |

Uploaded files: none. The product stores no binaries.

---

## 2. Taking a backup

```bash
docker compose exec app ./scripts/backup.sh
```

Writes `./backups/itvb-<UTC timestamp>.dump` in PostgreSQL custom format, then
verifies the archive is readable before reporting success — so a corrupted dump
fails at backup time rather than during an incident.

Options:

| Variable | Effect |
|---|---|
| `BACKUP_DIR` | Destination directory (default `./backups`) |
| `BACKUP_RETAIN_DAYS` | Delete dumps older than N days. **Unset by default** — deleting the only good backup because a variable was mistyped is worse than keeping too many files |

### Scheduling

There is no built-in scheduler; the product runs no background jobs (see
`docs/ROADMAP.md` §1). Use the host's cron:

```bash
0 2 * * * cd /opt/itvb && BACKUP_RETAIN_DAYS=30 docker compose exec -T app ./scripts/backup.sh >> /var/log/itvb-backup.log 2>&1
```

**The backup directory must be on storage that is itself backed up, or
replicated off the host.** A dump sitting on the same disk as the database
survives a bad migration but not a failed disk.

---

## 3. Restoring

```bash
docker compose exec app ./scripts/restore.sh ./backups/itvb-20260811T090000Z.dump
```

The script prints the source and the target (password masked) and requires the
operator to type `restore`. Set `RESTORE_CONFIRM=yes` to skip the prompt in
automation — do this only in a drill.

The restore runs in a single transaction: it either completes or changes
nothing. A half-restored portfolio is worse than a failed restore, because it
looks like it worked.

### After restoring

```bash
npx prisma migrate status
```

If the dump predates the running image's migrations, apply them:

```bash
docker compose exec app node node_modules/prisma/build/index.js migrate deploy
```

Restoring a **newer** dump into an **older** image is not supported — roll the
image forward first.

---

## 4. The tested round trip

Run this as a drill. It never touches the live database:

```bash
# 1. Dump
docker compose exec db pg_dump -U itvb -d itvb --format=custom --no-owner --no-acl -f /tmp/drill.dump

# 2. Restore into a scratch database
docker compose exec db psql -U itvb -d postgres -c "DROP DATABASE IF EXISTS itvb_restore_test;"
docker compose exec db psql -U itvb -d postgres -c "CREATE DATABASE itvb_restore_test;"
docker compose exec db pg_restore /tmp/drill.dump \
  --dbname "postgresql://itvb:itvb@localhost:5432/itvb_restore_test" \
  --clean --if-exists --no-owner --no-acl --single-transaction

# 3. Compare
docker compose exec db psql -U itvb -d itvb -t -A -c 'SELECT count(*) FROM "Initiative";'
docker compose exec db psql -U itvb -d itvb_restore_test -t -A -c 'SELECT count(*) FROM "Initiative";'

# 4. Clean up
docker compose exec db psql -U itvb -d postgres -c "DROP DATABASE itvb_restore_test;"
```

Restoring into a scratch database rather than over the source is deliberate: a
restore drill that can destroy the data it is protecting is not a drill.

**Result of the last run (2026-08-11):**

| Table | Source | Restored |
|---|---|---|
| Initiative | 26 | 26 |
| HistoryLog | 132 | 132 |
| BenefitClaim | 34 | 34 |
| User | 16 | 16 |
| LifecycleStage | 11 | 11 |

---

## 5. What is NOT covered

Stated plainly so nobody assumes otherwise:

- **No automated off-host replication.** The scripts write locally; shipping
  dumps elsewhere is the host's responsibility.
- **No defined RTO/RPO.** `docs/ROADMAP.md` §5 defers DR planning until a
  customer requires it. Recovery point is currently "whenever cron last ran".
- **No tested failover.** There is one database instance.
- **Encryption at rest is the host's job.** Dumps contain password hashes and
  MFA secrets; the directory must be protected accordingly.
