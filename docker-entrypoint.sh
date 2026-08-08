#!/bin/sh
# Container start-up: apply pending migrations, then boot the app.
#
# Migrations run HERE (at container start) and not during `docker build`,
# because the image is built once — often in CI, or scanned in the bank's own
# registry — and deployed into an environment whose database it has never seen.
# A build-time migration would require a live DB at image-build time, which is
# wrong for any on-prem deployment.
set -e

echo "[entrypoint] applying database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] starting IT Value Bridge on port ${PORT:-3000}..."
exec node server.js
