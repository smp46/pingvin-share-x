#!/bin/sh

# Copy default logo to the frontend public folder if it doesn't exist
(cd /tmp/img && find . -type f | while read -r f; do
  dest="/opt/app/frontend/public/img/$f"
  [ -e "$dest" ] || { mkdir -p "$(dirname "$dest")" && cp "$f" "$dest"; }
done)

if [ "$CADDY_DISABLED" != "true" ]; then
  # Start Caddy
  echo "Starting Caddy..."
  if [ "$TRUST_PROXY" = "true" ]; then
    caddy start --adapter caddyfile --config /opt/app/reverse-proxy/Caddyfile.trust-proxy &
  else
    caddy start --adapter caddyfile --config /opt/app/reverse-proxy/Caddyfile &
  fi
else
  echo "Caddy is disabled. Skipping..."
fi

# Run the frontend server
PORT=3333 HOSTNAME=0.0.0.0 node frontend/server.js &

# Run the backend server
cd backend && ./node_modules/.bin/prisma migrate deploy && node dist/prisma/seed/config.seed.js && node dist/src/main

# Wait for all processes to finish
wait -n
