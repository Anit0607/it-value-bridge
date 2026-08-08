# IT Value Bridge — production image (Next.js standalone output).
# Self-contained: no external services or CDNs at runtime.
#
# Build:  docker build -t itvb-app .
# Run:    docker compose up -d        (see docker-compose.yml for the full stack)
#
# Migrations are NOT run during this build — they run at container start via
# docker-entrypoint.sh, because the image is built once and deployed into an
# environment whose database it has never seen.

# 1) Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma needs OpenSSL to select its query engine on Alpine/musl.
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
# The `postinstall` script runs `prisma generate`, so the schema must be present
# before `npm ci` — otherwise install fails with "schema.prisma: file not found".
COPY prisma ./prisma
RUN npm ci

# 2) Build the app
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Build-stage placeholders, scoped to this single command so they never persist
# in image metadata. Next collects page data at build time, which instantiates
# Auth.js and Prisma — both refuse to initialise without these. The runtime
# image is a separate stage and receives real values injected at container start.
RUN AUTH_SECRET=build-time-placeholder-never-used-at-runtime \
    DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    npm run build

# 3) Minimal runtime image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Everything is chowned to the runtime user: Prisma writes to its engine
# directory on start-up, and the container runs as non-root.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma CLI + generated client/engines. Next's standalone tracing includes
# @prisma/client where it's imported, but not the `prisma` CLI that
# `migrate deploy` needs at start-up — so copy those explicitly.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

COPY --chmod=755 --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["./docker-entrypoint.sh"]
