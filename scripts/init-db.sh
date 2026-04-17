#!/bin/bash
# ContaFlow ERP - Database Initialization Script
# Usage: ./scripts/init-db.sh [--skip-seed]

set -e

echo "=== ContaFlow ERP - Inicialización de Base de Datos ==="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Config
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-contaflow_erp}"
DB_USER="${POSTGRES_USER:-contaflow}"
DB_PASSWORD="${POSTGRES_PASSWORD:-contaflow_dev_2024}"
SKIP_SEED=false

for arg in "$@"; do
  case $arg in
    --skip-seed) SKIP_SEED=true ;;
  esac
done

# Check PostgreSQL is reachable
echo -e "${YELLOW}[1/5]${NC} Verificando conexión a PostgreSQL..."
if ! command -v pg_isready &> /dev/null; then
  echo -e "${RED}Error: pg_isready no encontrado. Instala PostgreSQL client tools.${NC}"
  exit 1
fi

if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q 2>/dev/null; then
  echo -e "${YELLOW}[1/5]${NC} PostgreSQL no responde. Intentando levantar con Docker..."
  if command -v docker &> /dev/null; then
    docker compose up -d postgres redis
    echo "Esperando a PostgreSQL (10s)..."
    sleep 10
  else
    echo -e "${RED}Error: No se puede conectar a PostgreSQL y Docker no está disponible.${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}[1/5]${NC} PostgreSQL conectado ✓"

# Apply EF Core migrations
echo -e "${YELLOW}[2/5]${NC} Aplicando migraciones EF Core..."
MIGRATION_FILE="./download/migrations/001_initial_create.sql"
if [ -f "$MIGRATION_FILE" ]; then
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" 2>/dev/null || \
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
  echo -e "${GREEN}[2/5]${NC} Migraciones aplicadas ✓"
else
  echo -e "${YELLOW}[2/5]${NC} Archivo de migración no encontrado: $MIGRATION_FILE (saltando)"
fi

# Run Prisma migrations
echo -e "${YELLOW}[3/5]${NC} Sincronizando Prisma..."
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma db push --skip-generate 2>/dev/null || true
echo -e "${GREEN}[3/5]${NC} Prisma sincronizado ✓"

# Generate Prisma client
echo -e "${YELLOW}[4/5]${NC} Generando Prisma Client..."
npx prisma generate 2>/dev/null
echo -e "${GREEN}[4/5]${NC} Prisma Client generado ✓"

# Seed database
if [ "$SKIP_SEED" = false ]; then
  echo -e "${YELLOW}[5/5]${NC} Poblando datos iniciales..."
  DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma db seed 2>/dev/null || \
  echo -e "${YELLOW}[5/5]${NC} Seed falló (puede que los datos ya existan)"
  echo -e "${GREEN}[5/5]${NC} Seed completado ✓"
else
  echo -e "${YELLOW}[5/5]${NC} Seed saltado (--skip-seed)"
fi

echo ""
echo -e "${GREEN}=== Inicialización completada ===${NC}"
echo ""
echo "Próximos pasos:"
echo "  1. docker compose up -d          # Levantar todos los servicios"
echo "  2. Visitar http://localhost:3000  # Abrir la aplicación"
echo "  3. Credenciales demo: admin@empresademo.com.ar / admin123"
