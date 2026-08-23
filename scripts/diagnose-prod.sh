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
echo "== database contents =="
# queried from inside the container: the host often has no sqlite3, and the
# database lives on a volume whose host path we would have to guess. node:sqlite
# ships with the runtime and is opened read only here.
$RUN exec "$CT" node -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("/opt/app/backend/data/pingvin-share.db", { readOnly: true });
const one = (sql) => { try { return Object.values(db.prepare(sql).get())[0]; } catch (e) { return "?"; } };
const all = (sql) => { try { return db.prepare(sql).all(); } catch (e) { return []; } };

for (const t of ["Share","File","User","Config","ShareAccessLog","_prisma_migrations"]) {
  console.log("  " + t.padEnd(20) + one(`SELECT COUNT(*) FROM "${t}"`));
}
console.log("  integrity            " + one("PRAGMA integrity_check"));

const span = all("SELECT MIN(createdAt) a, MAX(createdAt) b FROM Share")[0];
if (span && span.a) {
  const d = (v) => new Date(Number(v)).toISOString().slice(0,16).replace("T"," ");
  console.log("  oldest share         " + d(span.a));
  console.log("  newest share         " + d(span.b));
}

console.log("");
console.log("== migrations, newest first ==");
for (const r of all("SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10"))
  console.log("  " + r.migration_name);

console.log("");
console.log("== config sanity ==");
const watch = ["allowAdminAccessAllShares","fileRetentionPeriod","maxExpiration","allowRegistration"];
for (const r of all("SELECT category, name, value FROM Config").filter(r => watch.includes(r.name)))
  console.log("  " + r.category + "." + r.name + " = " + (r.value === null ? "<default>" : r.value));
console.log("  categories: " + all("SELECT DISTINCT category FROM Config ORDER BY category").map(r=>r.category).join(", "));
db.close();
' 2>&1

echo
echo "== share directories inside the container =="
$RUN exec "$CT" sh -c 'ls -1 /opt/app/backend/data/uploads/shares 2>/dev/null | wc -l | sed "s/^/  directories: /"'

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
