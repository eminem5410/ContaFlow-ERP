#!/bin/sh
# ── ContaFlow ERP — PostgreSQL Restore Script ────────────────────────────
# Usage: ./deploy/scripts/restore-pg.sh <backup_file.sql.gz>
# WARNING: This will DROP and recreate the database!

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

# Parse .env
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_HOST=$(grep '^POSTGRES_HOST=' "$ENV_FILE" | cut -d= -f2 || echo "localhost")
POSTGRES_PORT=$(grep '^POSTGRES_PORT=' "$ENV_FILE" | cut -d= -f2 || echo "5432")
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2)

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "$PROJECT_ROOT/deploy/backups"/contaflow_*.sql.gz 2>/dev/null || echo "  No backups found."
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    # Try relative to backups dir
    BACKUP_FILE="$PROJECT_ROOT/deploy/backups/$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "ERROR: Backup file not found: $1"
        exit 1
    fi
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  ContaFlow ERP — Database Restore"
echo "  Target: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "  Source: ${BACKUP_FILE}"
echo ""
echo "  ⚠️  WARNING: This will ERASE the current database!"
echo "═══════════════════════════════════════════"
echo ""
printf "Type 'CONFIRM' to continue: "
read CONFIRM

if [ "$CONFIRM" != "CONFIRM" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "[1/3] Dropping and recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
    -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

echo "[2/3] Restoring from backup..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -q

echo "[3/3] Running migrations..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -f "$PROJECT_ROOT/download/migrations/001_initial_create.sql" \
    -q 2>/dev/null || true

echo ""
echo "✅ Restore completed successfully!"
echo ""
echo "Run migrations from the backend if needed:"
echo "  docker compose -f docker-compose.prod.yml exec backend dotnet ContaFlow.API.dll --migrate"
