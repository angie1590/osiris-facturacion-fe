#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_DIR="$ROOT_DIR/../osiris-facturacion-be"
COMPOSE_FILE="$BACKEND_DIR/docker-compose.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "No se encontro $COMPOSE_FILE"
  exit 1
fi

exec docker compose -f "$COMPOSE_FILE" up --build -d "$@"
