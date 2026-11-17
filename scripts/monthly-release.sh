#!/usr/bin/env bash
# Monthly release, explorer part (docs/deploy.md "Monthly release"; run by the scheduled task sdl-db-monthly-release
# after sdl-db's update/release.py has built the new version and its Zenodo draft). Steps:
#
#   prepare   before the Zenodo publish: branch release-<v> from main, pin <v> from sdl-db (update/release.py
#             explorer-pin), fetch-release from sdl-db's local zip (SDL_RELEASE_ZIP), commit the pin, build-data.
#             Exit 3 and the list in .cache/untagged-<v>.csv when new modules need technique tags.
#   check     build-data, typecheck and vitest on the pinned release
#   e2e       npm run e2e, then record-baselines; commits data-overlay/module-techniques.csv and
#             tests/derived-baselines.json on the branch (run it in the background: it takes 6-10 min)
#   finalize  after sdl-db's zenodo-verify: the pin must be the published file; fetch-release from Zenodo, build-data,
#             typecheck, vitest; fast-forward main, push, `gh workflow run pages.yml`, `gh run watch`, and check that
#             the live data/index.json names <v>
#   abort     back to main; the release branch keeps the state reached (uncommitted changes committed as wip)
#
# Environment (tests and dry runs only; the scheduled task sets none): SDLDB (sdl-db folder), GH (gh command),
# LIVE_URL (site), SKIP_LIVE=1, and SDL_RELEASE_ZIP passed through to fetch-release in finalize.
set -euo pipefail
cd "$(dirname "$0")/.."
SDLDB=${SDLDB:-$HOME/research/sdl-db}
GH=${GH:-gh}
LIVE_URL=${LIVE_URL:-https://ccy5123.github.io/sdl-workflows-explorer}
COAUTHOR="Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

die() { echo "STOP: $*" >&2; exit 1; }
say() { echo "== $*"; }
version() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["release_version"])' "$SDLDB/update/release.json"; }
pin_field() { python3 -c 'import json,sys; print(json.load(open("release.config.json"))[sys.argv[1]])' "$1"; }
branch() { git rev-parse --abbrev-ref HEAD; }
clean() { [ -z "$(git status --porcelain --untracked-files=no)" ]; }

step=${1:-}
case "$step" in
prepare)
  v=$(version)
  [ "$(branch)" = main ] || die "explorer is on $(branch), not main"
  clean || die "explorer has uncommitted changes on main"
  git pull --ff-only origin main
  git checkout -B "release-$v" main
  python3 "$SDLDB/update/release.py" explorer-pin release.config.json
  SDL_RELEASE_ZIP="$SDLDB/release/out/sdl-workflows-$v.zip" npm run fetch-release
  git add release.config.json
  git commit -q -m "feat(release): pin data release $v (Zenodo $(pin_field record_id))" -m "Pinned by the monthly release (docs/deploy.md); sha256 $(pin_field sha256)." -m "$COAUTHOR"
  if npm run build-data; then
    say "PREPARE OK: release-$v pins $v; no module needs a technique tag"
  else
    npm run --silent list-untagged > ".cache/untagged-$v.csv" || true
    n=$(($(wc -l < ".cache/untagged-$v.csv") - 1))
    [ "$n" -gt 0 ] || die "build-data failed and no module is untagged: not a tagging problem"
    cat ".cache/untagged-$v.csv"
    say "UNTAGGED: $n module(s) need rows in data-overlay/module-techniques.csv (list in .cache/untagged-$v.csv)"
    exit 3
  fi
  ;;
check)
  v=$(version)
  [ "$(branch)" = "release-$v" ] || die "not on release-$v"
  npm run build-data
  npm run typecheck
  npm test
  say "UNIT OK: release-$v passes build-data, typecheck and vitest"
  ;;
e2e)
  v=$(version)
  [ "$(branch)" = "release-$v" ] || die "not on release-$v"
  npm run e2e
  npm run record-baselines
  git add data-overlay/module-techniques.csv tests/derived-baselines.json
  git diff --cached --quiet || git commit -q -m "feat(release): technique tags and derived-file baseline of release $v" -m "$COAUTHOR"
  clean || die "uncommitted changes after the checks: $(git status --porcelain --untracked-files=no | head -5)"
  say "E2E OK: release-$v passes e2e; tags and baseline committed"
  ;;
finalize)
  v=$(version)
  [ "$(branch)" = "release-$v" ] || die "not on release-$v"
  clean || die "uncommitted changes on release-$v"
  python3 - "$SDLDB/update/releases.json" "$v" <<'PY' || die "release $v is not recorded as published with the pinned sha256 (run sdl-db zenodo-verify first)"
import json, sys
rels = {r["version"]: r for r in json.load(open(sys.argv[1]))["releases"]}
pin = json.load(open("release.config.json"))
r = rels.get(sys.argv[2])
sys.exit(0 if r and r["zip_sha256"] == pin["sha256"] and str(r["record_id"]) == pin["record_id"] else 1)
PY
  rm -f .cache/release/verified.json ".cache/release/sdl-workflows-$v.zip"
  npm run fetch-release   # from Zenodo (SDL_RELEASE_ZIP only in dry runs)
  npm run build-data
  npm run typecheck
  npm test
  git checkout -q main
  git pull --ff-only origin main
  git merge --ff-only "release-$v"
  git push origin main
  head=$(git rev-parse HEAD)
  "$GH" workflow run pages.yml --ref main
  id=""
  for _ in $(seq 1 30); do
    id=$("$GH" run list --workflow pages.yml --branch main --limit 5 --json databaseId,headSha \
          --jq "map(select(.headSha == \"$head\"))[0].databaseId // empty")
    [ -n "$id" ] && break
    sleep 5
  done
  [ -n "$id" ] || die "no pages.yml run for $head appeared"
  "$GH" run watch "$id" --exit-status || die "pages.yml run $id failed; main is pushed, the live site is still the old release"
  if [ "${SKIP_LIVE:-}" = 1 ]; then
    say "FINALIZE OK (live check skipped): main at $head, pages run $id"
    exit 0
  fi
  live=""
  for _ in $(seq 1 40); do
    live=$(curl -fsS -H 'Cache-Control: no-cache' "$LIVE_URL/data/index.json?v=$head" \
           | python3 -c 'import json,sys; print(json.load(sys.stdin)["release"]["version"])' || true)
    [ "$live" = "$v" ] && break
    sleep 15
  done
  [ "$live" = "$v" ] || die "live data/index.json gives ${live:-nothing}, expected $v (pages run $id succeeded)"
  say "FINALIZE OK: main at $head, pages run $id, live site on $v"
  ;;
abort)
  b=$(branch)
  if ! clean; then
    git add -A -- release.config.json data-overlay tests/derived-baselines.json
    git commit -q -m "wip: state of $b when the monthly release stopped" -m "$COAUTHOR" || true
  fi
  git checkout -q main
  say "ABORTED: explorer back on main ($(git rev-parse --short HEAD)); $b kept for inspection"
  ;;
*)
  sed -n '2,20p' "$0"
  exit 2
  ;;
esac
