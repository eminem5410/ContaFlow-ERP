#!/bin/sh
# ── ContaFlow ERP — PostgreSQL Backup Script (standalone) ─────────────────
# Run from the HOST: ./deploy/scripts/backup-pg.sh
# Creates a timestamped gzipped SQL dump in deploy/backups/

set -e

# Load .env from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env file not found at $ENV_FILE"
    exit 1
fi

# Parse .env (simple: no quotes/escapes handling needed)
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
POSTGRES_HOST=$(grep '^POSTGRES_HOST=' "$ENV_FILE" | cut -d= -f2 || echo "localhost")
POSTGRES_PORT=$(grep '^POSTGRES_PORT=' "$ENV_FILE" | cut -d= -f2 || echo "5432")
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2)

BACKUP_DIR="$PROJECT_ROOT/deploy/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/contaflow_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "═══════════════════════════════════════════"
echo "  ContaFlow ERP — Database Backup"
echo "  Target: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "  Output: ${BACKUP_FILE}"
echo "═══════════════════════════════════════════"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-privileges \
    --format=plain \
    | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "✅ Backup completed: ${BACKUP_FILE} (${SIZE})"
echo ""

# List existing backups
echo "Existing backups:"
ls -lh "$BACKUP_DIR"/contaflow_*.sql.gz 2>/dev/null | tail -5
echo ""
TOTAL=$(ls "$BACKUP_DIR"/contaflow_*.sql.gz 2>/dev/null | wc -l)
echo "Total: ${TOTAL} backup(s)"
