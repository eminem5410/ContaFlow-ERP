#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════
# ContaFlow ERP — Deploy simplificado para Ubuntu (VPS / Servidor local)
# ══════════════════════════════════════════════════════════════════════════
# Uso:
#   bash deploy-ubuntu.sh                   # Full deploy (con SSL via Let's Encrypt)
#   bash deploy-ubuntu.sh --skip-ssl        # Deploy sin SSL (HTTP only)
#   bash deploy-ubuntu.sh --stop            # Detener servicios
#   bash deploy-ubuntu.sh --restart         # Reiniciar servicios
#   bash deploy-ubuntu.sh --status          # Estado de servicios
#   bash deploy-ubuntu.sh --backup          # Backup manual de DB
#   bash deploy-ubuntu.sh --logs            # Ver logs
#   bash deploy-ubuntu.sh --update          # Update + rebuild
# ══════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[PASO]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_PROD="$PROJECT_ROOT/docker-compose.prod.yml"
COMPOSE_LOCAL="$PROJECT_ROOT/docker-compose.local.yml"
ENV_FILE="$PROJECT_ROOT/.env"
DEPLOY_DIR="$PROJECT_ROOT/deploy"

# ── Helpers ─────────────────────────────────────────────────────────────

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env no encontrado!"
        echo ""
        echo "  Para deploy local (sin dominio):"
        echo "    cp .env.local.template .env"
        echo ""
        echo "  Para produccion (con dominio + SSL):"
        echo "    cp .env.production .env"
        echo "    nano .env  (editar con tus valores)"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker no esta instalado!"
        echo ""
        echo "  Instalar Docker:"
        echo "    curl -fsSL https://get.docker.com | bash"
        echo "    sudo usermod -aG docker \$USER"
        echo "    # Cerrar sesion y volver a entrar"
        exit 1
    fi
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose plugin no encontrado!"
        exit 1
    fi
}

wait_for() {
    local name=$1 max=${2:-120} elapsed=0
    log_info "Esperando $name (${max}s max)..."
    while [ $elapsed -lt $max ]; do
        status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "")
        if [ "$status" = "healthy" ]; then
            log_ok "$name listo"
            return 0
        fi
        sleep 5; elapsed=$((elapsed + 5))
        echo -n "."
    done
    echo ""
    log_warn "$name no respondio a tiempo"
}

choose_compose() {
    if [ "$1" = "--local" ]; then
        echo "$COMPOSE_LOCAL"
    else
        echo "$COMPOSE_PROD"
    fi
}

# ── Commands ────────────────────────────────────────────────────────────

cmd_up() {
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  ContaFlow ERP — Deploy en Ubuntu"
    echo "  $(date)"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    check_docker
    check_env

    local COMPOSE=$(choose_compose "$1")

    # Create dirs
    log_step "1/5 — Creando directorios..."
    mkdir -p "$DEPLOY_DIR/backups" "$DEPLOY_DIR/nginx/logs" \
             "$DEPLOY_DIR/ssl/certbot/conf" "$DEPLOY_DIR/ssl/certbot/www" \
             "$DEPLOY_DIR/ssl/nginx/ssl"
    log_ok "Directorios listos"

    # Build
    log_step "2/5 — Construyendo imagenes..."
    docker compose -f "$COMPOSE" build --parallel 2>&1 | tail -10
    log_ok "Build completado"

    # Infrastructure
    log_step "3/5 — Iniciando infraestructura..."
    docker compose -f "$COMPOSE" up -d postgres redis zookeeper kafka
    wait_for "contaflow-postgres" 90

    # Applications
    log_step "4/5 — Iniciando aplicaciones..."
    docker compose -f "$COMPOSE" up -d backend app
    wait_for "contaflow-backend" 150

    # Nginx + SSL
    log_step "5/5 — Iniciando Nginx..."
    if [ "$1" = "--skip-ssl" ] || [ "$1" = "--local" ]; then
        # Use local compose (no SSL, no certbot)
        if [ "$1" = "--local" ]; then
            docker compose -f "$COMPOSE" up -d nginx mailpit pg-backup
        else
            # Prod compose but skip SSL — use initial nginx config
            cp "$DEPLOY_DIR/nginx/nginx-initial.conf" "$DEPLOY_DIR/nginx/nginx.conf.bak" 2>/dev/null || true
            docker compose -f "$COMPOSE" up -d nginx pg-backup
            log_warn "SSL omitido — HTTP only en puerto 80"
        fi
    else
        # Full SSL setup (production)
        source "$ENV_FILE"
        DOMAIN=${DOMAIN:-contaflow.com.ar}

        # Create self-signed cert temporarily
        mkdir -p "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN"
        if [ ! -f "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
            openssl req -x509 -nodes -days 1 \
                -newkey rsa:2048 \
                -keyout "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/privkey.pem" \
                -out "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/fullchain.pem" \
                -subj "/CN=$DOMAIN/O=ContaFlow/C=AR" 2>/dev/null
            log_info "Cert temporal creado"
        fi

        docker compose -f "$COMPOSE" up -d nginx certbot pg-backup
        sleep 5

        # Try to get real SSL cert
        log_info "Intentando obtener cert SSL para $DOMAIN..."
        docker compose -f "$COMPOSE" run --rm certbot certonly \
            --webroot --webroot-path=/var/www/certbot \
            --email "admin@${DOMAIN}" --agree-tos --no-eff-email \
            -d "$DOMAIN" 2>&1 | tail -5

        if [ -f "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
            docker compose -f "$COMPOSE" up -d --force-recreate nginx
            log_ok "SSL configurado correctamente!"
        else
            log_warn "No se pudo obtener SSL — verificar DNS"
            log_warn "Cuando el dominio apunte a este servidor, ejecutar:"
            log_warn "  bash deploy-ubuntu.sh --ssl-only"
        fi
    fi

    echo ""
    sleep 3
    cmd_status
}

cmd_down() {
    check_docker
    local COMPOSE=$(choose_compose "$1")
    log_info "Deteniendo servicios..."
    docker compose -f "$COMPOSE" down
    log_ok "Servicios detenidos"
}

cmd_restart() {
    check_docker
    local COMPOSE=$(choose_compose "$1")
    log_info "Reiniciando servicios..."
    docker compose -f "$COMPOSE" restart
    sleep 5
    cmd_status
}

cmd_status() {
    check_docker
    local COMPOSE=$(choose_compose "$1")
    echo ""
    echo "┌────────────────────────────────────────────────────┐"
    echo "│         ContaFlow ERP — Estado                    │"
    echo "├────────────────────────────────────────────────────┤"
    docker compose -f "$COMPOSE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | \
        sed 's/^/│ /' | sed 's/$/ │/' | head -20
    echo "└────────────────────────────────────────────────────┘"
    echo ""

    for c in contaflow-postgres contaflow-backend contaflow-redis; do
        h=$(docker inspect --format='{{.State.Health.Status}}' "$c" 2>/dev/null || echo "")
        [ -n "$h" ] && echo "  $c: $h"
    done
    echo ""
}

cmd_backup() {
    check_docker
    bash "$DEPLOY_DIR/scripts/backup-pg.sh"
}

cmd_logs() {
    check_docker
    local COMPOSE=$(choose_compose "$1")
    docker compose -f "$COMPOSE" logs -f --tail=100 2>&1
}

cmd_update() {
    check_docker
    local COMPOSE=$(choose_compose "$1")
    log_info "Actualizando ContaFlow ERP..."
    if [ -d "$PROJECT_ROOT/.git" ]; then
        log_step "Pull de codigo..."
        git -C "$PROJECT_ROOT" pull
    fi
    log_step "Rebuild..."
    docker compose -f "$COMPOSE" build --parallel backend app 2>&1 | tail -5
    log_step "Restart..."
    docker compose -f "$COMPOSE" up -d backend app
    sleep 5
    cmd_status
    log_ok "Update completado!"
}

cmd_ssl_only() {
    check_docker
    check_env
    source "$ENV_FILE"
    DOMAIN=${DOMAIN:-contaflow.com.ar}
    local COMPOSE="$COMPOSE_PROD"

    log_info "Configurando SSL para $DOMAIN..."

    mkdir -p "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN"
    openssl req -x509 -nodes -days 1 \
        -newkey rsa:2048 \
        -keyout "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/privkey.pem" \
        -out "$DEPLOY_DIR/ssl/certbot/conf/live/$DOMAIN/fullchain.pem" \
        -subj "/CN=$DOMAIN/O=ContaFlow/C=AR" 2>/dev/null

    docker compose -f "$COMPOSE" up -d nginx certbot
    sleep 5

    docker compose -f "$COMPOSE" run --rm certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        --email "admin@${DOMAIN}" --agree-tos --no-eff-email \
        -d "$DOMAIN" 2>&1 | tail -5

    docker compose -f "$COMPOSE" up -d --force-recreate nginx
    log_ok "Nginx reiniciado con SSL"
}

# ── Main ────────────────────────────────────────────────────────────────

cd "$PROJECT_ROOT"

case "${1:-}" in
    --local)          cmd_up "--local" ;;
    --skip-ssl)       cmd_up "--skip-ssl" ;;
    --ssl-only)       cmd_ssl_only ;;
    --stop)           cmd_down ;;
    --restart)        cmd_restart ;;
    --status)         cmd_status ;;
    --backup)         cmd_backup ;;
    --logs)           cmd_logs ;;
    --update)         cmd_update ;;
    ""|up)            cmd_up ;;
    *)
        echo ""
        echo "ContaFlow ERP — Deploy Ubuntu"
        echo ""
        echo "Uso: bash deploy-ubuntu.sh <comando>"
        echo ""
        echo "Comandos:"
        echo "  (sin args)  Deploy completo (SSL con Let's Encrypt)"
        echo "  --local     Deploy local (HTTP, sin SSL, con Mailpit)"
        echo "  --skip-ssl  Deploy produccion sin SSL"
        echo "  --ssl-only  Configurar/renovar SSL"
        echo "  --stop      Detener servicios"
        echo "  --restart   Reiniciar servicios"
        echo "  --status    Ver estado"
        echo "  --backup    Backup manual de DB"
        echo "  --logs      Ver logs"
        echo "  --update    Pull + rebuild + restart"
        echo ""
        ;;
esac
