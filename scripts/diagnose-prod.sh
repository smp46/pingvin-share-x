#!/bin/sh
# Read only. Prints the state of a running instance so a data problem can be
# traced to a cause. Touches nothing.
#
#   sh scripts/diagnose-prod.sh <container-name> <host-path-to-data-dir>
#
# example:
#   sh scripts/diagnose-prod.sh pingvin-share-x /srv/pingvin/data

CT="${1:-pingvin-share-x}"
DATA="${2:-./data}"
# prefer whichever runtime actually answers, not merely whichever is installed
RUN="$RUNTIME"
if [ -z "$RUN" ]; then
  for c in podman docker; do
    if command -v "$c" >/dev/null 2>&1 && "$c" info >/dev/null 2>&1; then RUN="$c"; break; fi
  done
fi
[ -z "$RUN" ] && { echo "no working container runtime found, set RUNTIME=podman or RUNTIME=docker"; exit 1; }
echo "runtime: $RUN"

echo "== container =="
$RUN ps -a --filter "name=$CT" --format "{{.Names}}  {{.Status}}  {{.Image}}"
$RUN inspect --format 'restarts={{.RestartCount}}  started={{.State.StartedAt}}' "$CT" 2>/dev/null

echo
echo "== is more than one instance pointed at this data? =="
$RUN ps -a --format "{{.Names}}  {{.Image}}  {{.Status}}" | grep -i pingvin

echo
echo "== database files the container can see =="
$RUN exec "$CT" sh -c 'find / -name "pingvin-share*.db*" -not -path "*/node_modules/*" 2>/dev/null | while read f; do printf "  %s  %s bytes\n" "$f" "$(stat -c%s "$f" 2>/dev/null)"; done'

echo
echo "== database files on the host =="
find "$DATA" -maxdepth 2 -name "*.db*" -exec ls -la {} \; 2>/dev/null

echo
echo "== what the app is actually connected to =="
$RUN exec "$CT" sh -c 'cd /opt/app/backend 2>/dev/null && node -e "
const p=require(\"path\");
const u=process.env.DATABASE_URL||\"file:../data/pingvin-share.db?connection_limit=1\";
const q=u.split(\"?\")[0];
const f=q.startsWith(\"file:\")?q.slice(5):q;
console.log(\"  DATABASE_URL :\", process.env.DATABASE_URL||\"(unset, using default)\");
console.log(\"  cwd          :\", process.cwd());
console.log(\"  resolves to  :\", p.isAbsolute(f)?f:p.resolve(process.cwd(),\"prisma\",f));
"'

echo
echo "== row counts =="
if command -v sqlite3 >/dev/null 2>&1; then
  # every read below passes -readonly on purpose: this runs against a live
  # instance and must never take a write lock or touch a page
  DB="$DATA/pingvin-share.db"
  for t in Share File User Config ShareAccessLog _prisma_migrations; do
    printf "  %-20s %s\n" "$t" "$(sqlite3 -readonly "$DB" "SELECT COUNT(*) FROM \"$t\";" 2>/dev/null || echo "?")"
  done
  echo "  integrity: $(sqlite3 -readonly "$DB" 'PRAGMA integrity_check;' 2>/dev/null | head -1)"
  echo
  echo "== newest and oldest share =="
  sqlite3 -readonly -header "$DB" "SELECT id, datetime(createdAt/1000,'unixepoch') AS created FROM Share ORDER BY createdAt LIMIT 3;" 2>/dev/null
  sqlite3 -readonly -header "$DB" "SELECT id, datetime(createdAt/1000,'unixepoch') AS created FROM Share ORDER BY createdAt DESC LIMIT 3;" 2>/dev/null
else
  echo "  sqlite3 not installed on the host, skipping"
fi

echo
echo "== share directories on disk vs rows in the database =="
echo "  directories: $(ls -1 "$DATA/uploads/shares" 2>/dev/null | wc -l)"
if command -v sqlite3 >/dev/null 2>&1; then
  echo "  rows       : $(sqlite3 -readonly "$DATA/pingvin-share.db" 'SELECT COUNT(*) FROM Share;' 2>/dev/null)"
fi

echo
echo "== migrations applied =="
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 -readonly "$DATA/pingvin-share.db" "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 12;" 2>/dev/null | sed 's/^/  /'
fi

echo
echo "== config sanity =="
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 -readonly "$DATA/pingvin-share.db" "SELECT '  '||category||'.'||name||' = '||COALESCE(value,'<default>') FROM Config WHERE name IN ('allowAdminAccessAllShares','fileRetentionPeriod','maxExpiration','allowRegistration');" 2>/dev/null
  echo "  categories: $(sqlite3 -readonly "$DATA/pingvin-share.db" 'SELECT group_concat(DISTINCT category) FROM Config;' 2>/dev/null)"
fi

echo
echo "== anything in the log about deleting =="
$RUN logs "$CT" 2>&1 \
  | grep -vE "RouterExplorer|RoutesResolver|InstanceLoader" \
  | grep -iE "deleted [0-9]+|migrate reset|Applying migration|removed because" \
  | tail -15

echo
echo "== errors in the log =="
$RUN logs "$CT" 2>&1 \
  | grep -vE "RouterExplorer|Showing .*error.*messages" \
  | grep -iE "ERROR|exception|malformed|ENOENT|permission denied" \
  | tail -10
