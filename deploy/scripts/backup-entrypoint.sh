#!/bin/sh
set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-contaflow}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_DB="${POSTGRES_DB:-contaflow_erp}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 */6 * * *}"

do_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/contaflow_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
    echo "[BACKUP] Starting backup of ${POSTGRES_DB} at $(date)..."
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --format=plain 2>&1 | gzip > "$BACKUP_FILE"
    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
        SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        echo "[BACKUP] OK: ${BACKUP_FILE} (${SIZE})"
    else
        echo "[BACKUP] ERROR: Backup failed!"
        rm -f "$BACKUP_FILE"
        return 1
    fi
    DELETED=$(find "$BACKUP_DIR" -name "contaflow_${POSTGRES_DB}_*.sql.gz" -type f -mtime +"${BACKUP_RETENTION_DAYS}" -print -delete 2>/dev/null | wc -l)
    TOTAL=$(find "$BACKUP_DIR" -name "contaflow_${POSTGRES_DB}_*.sql.gz" -type f | wc -l)
    echo "[BACKUP] Total backups on disk: ${TOTAL}"
    if [ "$DELETED" -gt 0 ]; then
        echo "[BACKUP] Cleaned up ${DELETED} old backup(s)"
    fi
}

calculate_sleep() {
    CURRENT_HOUR=$(date +%H | sed 's/^0//')
    CURRENT_MINUTE=$(date +%M | sed 's/^0//')
    SCHEDULE_HOUR=$(echo "$BACKUP_SCHEDULE" | awk '{print $2}')
    case "$SCHEDULE_HOUR" in
        '*') echo 3600 ;;
        '*/'*)
            INTERVAL=$(echo "$SCHEDULE_HOUR" | cut -d/ -f2)
            NEXT_H=$(( (CURRENT_HOUR / INTERVAL + 1) * INTERVAL ))
            if [ "$NEXT_H" -ge 24 ]; then
                DIFF=$(( (24 - CURRENT_HOUR + 0) * 3600 - CURRENT_MINUTE * 60 ))
            else
                DIFF=$(( (NEXT_H - CURRENT_HOUR) * 3600 - CURRENT_MINUTE * 60 ))
            fi
            if [ "$DIFF" -lt 60 ]; then
                echo 3600
            else
                echo "$DIFF"
            fi
            ;;
        *) echo 3600 ;;
    esac
}

echo "=========================================="
echo " ContaFlow ERP - Auto Backup Scheduler"
echo " DB: ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT}"
echo " Schedule: ${BACKUP_SCHEDULE}"
echo " Retention: ${BACKUP_RETENTION_DAYS} days"
echo "=========================================="

mkdir -p "$BACKUP_DIR"

echo "[INIT] Waiting for PostgreSQL..."
RETRY=0
while [ $RETRY -lt 30 ]; do
    if PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -q 2>/dev/null; then
        echo "[INIT] PostgreSQL is ready!"
        break
    fi
    RETRY=$((RETRY + 1))
    sleep 5
done

if [ $RETRY -eq 30 ]; then
    echo "[INIT] ERROR: PostgreSQL not available"
    exit 1
fi

echo "[INIT] Running initial backup..."
do_backup

echo "[INIT] Entering backup loop..."
while true; do
    SECS=$(calculate_sleep)
    echo "[SLEEP] Next backup in ${SECS} seconds ($((SECS/3600))h $(( (SECS%3600)/60 ))m)"
    sleep "$SECS" || sleep 60
    do_backup
done
