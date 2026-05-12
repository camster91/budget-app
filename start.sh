#!/bin/sh
set -e

echo "=== Budget App Startup ==="
echo "NODE_ENV: $NODE_ENV"
echo "HOSTNAME: $HOSTNAME"
echo "PORT: $PORT"
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'NO - CRITICAL')"

# Validate environment
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Application cannot start."
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "WARNING: JWT_SECRET is not set. Using insecure default for development only."
fi

# Only run migrations in production if explicitly enabled
if [ "$NODE_ENV" = "production" ] && [ "$PRISMA_MIGRATE_ON_START" = "true" ]; then
  echo "=== Running Prisma migrations..."
  npx prisma migrate deploy || echo "WARNING: Migration deploy failed. Check database connectivity."
fi

# Generate Prisma Client if needed (standalone image may need this)
if [ ! -d "./node_modules/.prisma/client" ]; then
  echo "=== Generating Prisma Client..."
  npx prisma generate
fi

echo "=== Starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000} ==="
exec node server.js
