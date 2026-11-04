#!/usr/bin/env bash
# Build and run the Liquorify backend for the storefront's browser tests, from
# the revisions recorded in e2e-backend/liquorify-backend.env.
#
#   liquorify-backend.sh fetch   check out the backend and its host app
#   liquorify-backend.sh start   fetch, install gems, prepare the database and
#                                start Rails on http://localhost:4000
#   liquorify-backend.sh stop    stop that Rails server
#
# Everything lives in E2E_BACKEND_DIR (default .e2e-backend/, gitignored).
# Needs Git, the host app's Ruby (its .ruby-version) and a PostgreSQL server;
# DATABASE_URL defaults to the local `postgres` role without a password, as
# the CI service has. Sourced by bootstrap-spree.sh for the same environment.

set -euo pipefail

readonly E2E_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly E2E_BACKEND_DIR="${E2E_BACKEND_DIR:-$E2E_REPO_ROOT/.e2e-backend}"

# Exports the recorded settings and the paths derived from E2E_BACKEND_DIR.
liquorify_backend_env() {
  set -a
  # shellcheck disable=SC1091
  source "$E2E_REPO_ROOT/e2e-backend/liquorify-backend.env"
  set +a
  export SPREE_PATH="$E2E_BACKEND_DIR/liquorify"
  export BUNDLE_PATH="${BUNDLE_PATH:-$E2E_BACKEND_DIR/bundle}"
  export BUNDLE_WITHOUT="development:test"
  export DATABASE_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/storefront_e2e}"
}

# Checks out one commit of a repository into a directory, unless it is there.
checkout_revision() {
  local directory=$1 repository=$2 revision=$3
  if [[ "$(git -C "$directory" rev-parse HEAD 2>/dev/null || true)" == "$revision" ]]; then
    return
  fi
  rm -rf "$directory"
  mkdir -p "$directory"
  git -C "$directory" init --quiet
  git -C "$directory" fetch --quiet --depth 1 "$repository" "$revision"
  git -C "$directory" checkout --quiet --detach FETCH_HEAD
}

fetch() {
  echo "==> Checking out liquorify at $LIQUORIFY_REVISION"
  checkout_revision "$SPREE_PATH" "$LIQUORIFY_REPOSITORY" "$LIQUORIFY_REVISION"
  echo "==> Checking out the host app at $HOST_APP_REVISION"
  checkout_revision "$E2E_BACKEND_DIR/server" "$HOST_APP_REPOSITORY" "$HOST_APP_REVISION"
}

start() {
  fetch
  cd "$E2E_BACKEND_DIR/server"

  echo "==> Installing gems"
  bundle install --jobs 4 --quiet

  # The host app's committed migrations predate any the backend has added
  # since; this copies those in before the database is prepared.
  echo "==> Preparing the database"
  bin/rails spree:install:migrations db:prepare

  # A server left on the port would answer the health check below while this
  # one fails to bind, and the tests would then run against the wrong database.
  if curl -fsS http://localhost:4000/up >/dev/null 2>&1; then
    echo "Something already answers on http://localhost:4000. Stop it first." >&2
    exit 1
  fi

  echo "==> Starting Rails on http://localhost:4000"
  PIDFILE="$E2E_BACKEND_DIR/server.pid" nohup bin/rails server -b 127.0.0.1 -p 4000 \
    >"$E2E_BACKEND_DIR/server.log" 2>&1 &
  local server_pid=$!
  for _ in $(seq 1 60); do
    if ! kill -0 "$server_pid" 2>/dev/null; then
      echo "Rails stopped while starting. See $E2E_BACKEND_DIR/server.log." >&2
      exit 1
    fi
    if curl -fsS http://localhost:4000/up >/dev/null 2>&1; then
      return
    fi
    sleep 2
  done
  echo "Rails did not come up. See $E2E_BACKEND_DIR/server.log." >&2
  exit 1
}

stop() {
  if [[ -f "$E2E_BACKEND_DIR/server.pid" ]]; then
    kill "$(cat "$E2E_BACKEND_DIR/server.pid")" 2>/dev/null || true
    rm -f "$E2E_BACKEND_DIR/server.pid"
  fi
}

liquorify_backend_env

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  case "${1:-}" in
    fetch | start | stop) "$1" ;;
    *)
      echo "Usage: $0 fetch|start|stop" >&2
      exit 1
      ;;
  esac
fi
