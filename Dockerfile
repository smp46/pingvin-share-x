# Stage 1: Frontend dependencies
FROM node:24-alpine AS frontend-dependencies
WORKDIR /opt/app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Stage 2: Build frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /opt/app
# Which commit this image came from, shown on the admin page. Passed in
# because .dockerignore keeps .git out of the build context, so the build
# cannot work it out for itself. Builds that leave it unset are unaffected.
ARG BUILD_COMMIT=""
ENV BUILD_COMMIT=$BUILD_COMMIT
COPY ./frontend .
COPY --from=frontend-dependencies /opt/app/node_modules ./node_modules
RUN npm run build

# Stage 3: Backend dependencies
FROM node:24-alpine AS backend-dependencies
RUN apk add --no-cache python3
WORKDIR /opt/app
COPY backend/package.json backend/package-lock.json ./
# the postinstall hook generates the prisma client, which needs the schema.
# Only the schema is copied, so editing a migration does not invalidate the
# install layer.
COPY backend/prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci

# Stage 4: Build backend
FROM node:24-alpine AS backend-builder
RUN apk add openssl

WORKDIR /opt/app
COPY ./backend .
COPY --from=backend-dependencies /opt/app/node_modules ./node_modules
# naming the file explicitly makes tsc ignore tsconfig.json, so the compiler
# options it needs have to be repeated here. Without them it falls back to the
# ES3 default and chokes on the private fields in prisma's own type defs.
RUN npm run build && npx tsc prisma/seed/config.seed.ts --outDir dist/prisma/seed --rootDir prisma/seed --target es2021 --module commonjs --skipLibCheck && npm prune --production

# Stage 5: Final image
FROM node:24-alpine AS runner
ENV NODE_ENV=docker
# The Prisma CLI keeps state under HOME, and the container runs as an
# arbitrary PUID whose home would otherwise be "/", which is not writable.
# Without this, migrate deploy dies with a permission error on startup.
ENV HOME=/tmp

# Delete default node user
RUN deluser --remove-home node

RUN apk update --no-cache \
    && apk upgrade --no-cache \
    && apk add --no-cache curl caddy su-exec openssl \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /opt/app/frontend
COPY --from=frontend-builder /opt/app/public ./public
COPY --from=frontend-builder /opt/app/.next/standalone ./
COPY --from=frontend-builder /opt/app/.next/static ./.next/static
COPY --from=frontend-builder /opt/app/public/img /tmp/img

WORKDIR /opt/app/backend
COPY --from=backend-builder /opt/app/node_modules ./node_modules
RUN rm -rf ./node_modules/typescript \
           ./node_modules/esbuild \
           ./node_modules/@esbuild \
           ./node_modules/.bin/tsc \
           ./node_modules/.bin/esbuild
COPY --from=backend-builder /opt/app/dist ./dist
COPY --from=backend-builder /opt/app/prisma ./prisma
COPY --from=backend-builder /opt/app/package.json ./
COPY --from=backend-builder /opt/app/tsconfig.json ./
# prisma migrate deploy runs from the entrypoint and refuses to start without
# this. Kept as plain js on purpose: the image has no typescript after the
# production prune, so a prisma.config.ts could not be loaded here.
COPY --from=backend-builder /opt/app/prisma.config.js ./

WORKDIR /opt/app

COPY ./reverse-proxy  /opt/app/reverse-proxy
COPY ./scripts/docker ./scripts/docker

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=90s CMD /bin/sh -c '(if [[ "$CADDY_DISABLED" = "true" ]]; then curl -fs http://localhost:${BACKEND_PORT:-8080}/api/health; else curl -fs http://localhost:3000/api/health; fi) || exit 1'

ENTRYPOINT ["sh", "./scripts/docker/create-user.sh"]
CMD ["sh", "./scripts/docker/entrypoint.sh"]
