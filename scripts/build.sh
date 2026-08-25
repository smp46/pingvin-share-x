#!/bin/sh
# Builds a tagged image and stamps it with the commit it came from.
#
#   scripts/build.sh 32          -> pingvin-share-x:v32
#
# The stamp is the reason this exists rather than a bare build command. A build
# argument has to be passed with --build-arg: setting BUILD_COMMIT in the
# environment before the command only sets it for the build tool's own process,
# the ARG in the Dockerfile stays empty, and the admin page then shows the
# version with no commit after it. Nothing warns about that, so the check at
# the end does.

set -eu

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: $0 <version>   e.g. $0 32" >&2
  exit 1
fi

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
TAG="pingvin-share-x:v${VERSION}"

RUN="${RUNTIME:-}"
if [ -z "$RUN" ]; then
  for c in podman docker; do
    if command -v "$c" >/dev/null 2>&1 && "$c" info >/dev/null 2>&1; then RUN="$c"; break; fi
  done
fi
[ -z "$RUN" ] && { echo "no working container runtime, set RUNTIME=podman or RUNTIME=docker" >&2; exit 1; }

COMMIT=$(git -C "$REPO_ROOT" rev-parse HEAD)
SHORT=$(echo "$COMMIT" | cut -c1-7)

# Building from a dirty tree means the stamp names a commit the image does not
# actually contain, which is worse than no stamp at all.
if ! git -C "$REPO_ROOT" diff --quiet HEAD -- backend frontend Dockerfile 2>/dev/null; then
  echo "warning: backend, frontend or Dockerfile has uncommitted changes."
  echo "         the image will be stamped $SHORT but will not match it."
fi

echo "runtime: $RUN"
echo "tag:     $TAG"
echo "commit:  $SHORT"
echo

"$RUN" build --build-arg "BUILD_COMMIT=$COMMIT" -t "$TAG" "$REPO_ROOT"

# Confirm the stamp actually reached the bundle, rather than assuming it did.
echo
if "$RUN" run --rm --entrypoint sh "$TAG" -c \
     "grep -ql '$SHORT' /opt/app/frontend/.next/static/chunks/pages/admin-*.js" 2>/dev/null; then
  echo "built $TAG, admin page will show ($SHORT)"
else
  echo "built $TAG, but $SHORT is NOT in the admin bundle." >&2
  echo "the version will show without a commit after it." >&2
  exit 1
fi
