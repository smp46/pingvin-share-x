#!/bin/sh

# Copy default logo to the frontend public folder if it doesn't exist
cp -rn /tmp/img/* /opt/app/frontend/public/img

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

# Pick the Prisma schema matching the database
case "$DATABASE_URL" in
  postgres://* | postgresql://*) PRISMA_SCHEMA=prisma/postgresql/schema.prisma ;;
  *) PRISMA_SCHEMA=prisma/schema.prisma ;;
esac

# Run the backend server. Exit if it fails, for example when the database is
# not reachable yet, so that the container restart policy can retry
cd backend && ./node_modules/.bin/prisma migrate deploy --schema "$PRISMA_SCHEMA" && node dist/prisma/seed/config.seed.js && node dist/src/main || exit 1

# Wait for all processes to finish
wait -n
