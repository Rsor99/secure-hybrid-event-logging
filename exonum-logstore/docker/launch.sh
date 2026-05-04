#!/usr/bin/env bash
# Launch a single-node Exonum LogStore blockchain + frontend.
set -e

START_PEER_PORT=${START_PEER_PORT:-6331}
START_PUBLIC_PORT=${START_PUBLIC_PORT:-8200}
PRIVATE_PORT=$((START_PUBLIC_PORT + 1))
FRONTEND_PORT=${FRONTEND_PORT:-8080}
NODE_API_URL=${NODE_API_URL:-http://host.docker.internal:3000}
BIN=exonum-logstore

cd /app && mkdir -p chain && cd chain

# 1. Generate template + single-node config (idempotent: skip if already done)
if [ ! -f common.toml ]; then
  ${BIN} generate-template common.toml --validators-count 1
  ${BIN} generate-config common.toml 1 \
    --peer-address 127.0.0.1:${START_PEER_PORT} \
    --master-key-pass pass:
  ${BIN} finalize \
    --public-api-address  0.0.0.0:${START_PUBLIC_PORT} \
    --private-api-address 0.0.0.0:${PRIVATE_PORT} \
    1/sec.toml 1/node.toml \
    --public-configs 1/pub.toml
fi

# Print the service key so it can be copied to .env
echo "=== EXONUM SERVICE KEY (copy to .env) ==="
grep "^service_public_key" 1/pub.toml || true
echo "========================================="

# 2. Start frontend in background
echo "Starting frontend on :${FRONTEND_PORT}"
cd /app/frontend
node server.js \
  --port=${FRONTEND_PORT} \
  --api-root=http://127.0.0.1:${START_PUBLIC_PORT} \
  --node-api=${NODE_API_URL} &

# 3. Run node in foreground (container's main process — logs and errors visible here)
echo "Starting Exonum node on :${START_PUBLIC_PORT}"
exec ${BIN} run \
  --node-config /app/chain/1/node.toml \
  --db-path     /app/chain/1/db \
  --public-api-address  0.0.0.0:${START_PUBLIC_PORT} \
  --master-key-pass pass:
