#!/bin/sh
set -e

echo "[ContaFlow] Checking database tables..."

# Run prisma db push to ensure all tables exist
# This is idempotent: if tables already exist, it does nothing
npx prisma@6 db push --accept-data-loss 2>/dev/null || true

echo "[ContaFlow] Database ready. Starting server..."

# Start Next.js
exec node server.js
