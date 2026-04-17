#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════
# ContaFlow ERP — Production Deploy Script
# ══════════════════════════════════════════════════════════════════════════
# Usage:
#   ./deploy/scripts/deploy.sh                    # Full deploy
#   ./deploy/scripts/deploy.sh --skip-ssl        # Deploy without SSL
#   ./deploy/scripts/deploy.sh --ssl-only        # Only setup/renew SSL
#   ./deploy/scripts/deploy.sh --stop            # Stop all services
#   ./deploy/scripts/deploy.sh --restart         # Restart all services
#   ./deploy/scripts/deploy.sh --status          # Show service status
#   ./deploy/scripts/deploy.sh --backup          # Create a manual backup
#   ./deploy/scripts/deploy.sh --logs            # Tail logs from all services
# ══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

# Project paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_DIR="$PROJECT_ROOT/deploy"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"
SSL_DIR="$DEPLOY_DIR/ssl"

# ── Helper Functions ────────────────────────────────────────────────────

check_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found!"
        echo ""
        echo "  Run:  cp .env.production .env"
        echo "  Then: nano .env  (edit with your production values)"
        exit 1
    fi

    # Check for CHANGE_ME placeholders
    if grep -q "CHANGE_ME" "$ENV_FILE"; then
        log_warn "Found CHANGE_ME placeholders in .env — make sure all values are set!"
        grep "CHANGE_ME" "$ENV_FILE" | head -5
        echo ""
        echo "  Edit .env with your production values:  nano .env"
        echo ""
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        echo "  Run:  bash deploy/scripts/install-deps.sh"
        exit 1
    fi

    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose plugin is not installed!"
        exit 1
    fi
}

wait_for_healthy() {
    local service=$1
    local max_wait=${2:-120}
    local elapsed=0

    log_info "Waiting for $service to be healthy (max ${max_wait}s)..."

    while [ $elapsed -lt $max_wait ]; do
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "not found")
        if [ "$STATUS" = "healthy" ]; then
            log_success "$service is healthy"
            return 0
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -n "."
    done

    echo ""
    log_warn "$service did not become healthy in ${max_wait}s"
    return 1
}

# ── Commands ────────────────────────────────────────────────────────────

cmd_deploy() {
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  ContaFlow ERP — Production Deploy"
    echo "  $(date)"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    check_docker
    check_env

    # Step 1: Create directories
    log_step "1/6 — Creating directories..."
    mkdir -p "$SSL_DIR/certbot/conf" "$SSL_DIR/certbot/www" "$SSL_DIR/nginx/ssl" "$DEPLOY_DIR/nginx/logs" "$DEPLOY_DIR/backups"
    chmod 755 "$DEPLOY_DIR/backups"
    log_success "Directories created"

    # Step 2: Build images
    log_step "2/6 — Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build --parallel 2>&1 | tail -10
    log_success "Images built"

    # Step 3: Start infrastructure services (DB, Redis, Kafka)
    log_step "3/6 — Starting infrastructure services..."
    docker compose -f "$COMPOSE_FILE" up -d \
        postgres redis zookeeper kafka

    wait_for_healthy "contaflow-postgres" 60

    # Step 4: Start application services
    log_step "4/6 — Starting application services..."
    docker compose -f "$COMPOSE_FILE" up -d \
        backend app

    wait_for_healthy "contaflow-backend" 120

    # Step 5: Setup SSL or start nginx
    source "$ENV_FILE"
    DOMAIN=${DOMAIN:-contaflow.com.ar}

    if [ "$1" = "--skip-ssl" ]; then
        log_step "5/6 — Starting nginx (HTTP only, skip SSL)..."
        # Use initial config (no SSL)
        cp "$DEPLOY_DIR/nginx/nginx-initial.conf" "$DEPLOY_DIR/nginx/nginx.conf"
        docker compose -f "$COMPOSE_FILE" up -d nginx
        log_warn "SSL skipped — running HTTP only on port 80"
        log_warn "To enable SSL later, run:  ./deploy/scripts/deploy.sh --ssl-only"
    else
        log_step "5/6 — Setting up SSL for ${DOMAIN}..."
        setup_ssl "$DOMAIN"
    fi

    # Step 6: Final status
    log_step "6/6 — Final check..."
    echo ""
    sleep 3
    show_status
}

setup_ssl() {
    local DOMAIN=$1

    # Create self-signed cert for initial nginx start (before certbot)
    log_info "Creating temporary self-signed certificate..."
    mkdir -p "$SSL_DIR/certbot/conf/live/$DOMAIN"

    if [ ! -f "$SSL_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        openssl req -x509 -nodes -days 1 \
            -newkey rsa:2048 \
            -keyout "$SSL_DIR/certbot/conf/live/$DOMAIN/privkey.pem" \
            -out "$SSL_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" \
            -subj "/CN=$DOMAIN/O=ContaFlow/C=AR" \
            2>/dev/null
        log_success "Temporary certificate created"
    fi

    # Start nginx with self-signed cert first
    docker compose -f "$COMPOSE_FILE" up -d nginx
    sleep 5

    # Request real certificate from Let's Encrypt
    log_info "Requesting SSL certificate from Let's Encrypt for ${DOMAIN}..."

    docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "admin@${DOMAIN}" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        2>&1 | tail -5

    if [ -f "$SSL_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
        # Reload nginx with real SSL config
        cp "$DEPLOY_DIR/nginx/nginx.conf" "$DEPLOY_DIR/nginx/nginx.conf"
        docker compose -f "$COMPOSE_FILE" up -d --force-recreate nginx
        log_success "SSL certificate obtained and nginx reloaded!"
    else
        log_warn "SSL certificate not obtained — nginx is running with HTTP only"
        log_warn "Make sure your domain ($DOMAIN) points to this server's IP"
        log_warn "Run again later:  ./deploy/scripts/deploy.sh --ssl-only"
    fi
}

cmd_ssl_only() {
    check_docker
    check_env

    source "$ENV_FILE"
    DOMAIN=${DOMAIN:-contaflow.com.ar}

    echo ""
    echo "Setting up SSL for ${DOMAIN}..."
    setup_ssl "$DOMAIN"
}

cmd_stop() {
    log_info "Stopping all ContaFlow services..."
    docker compose -f "$COMPOSE_FILE" down
    log_success "All services stopped"
}

cmd_restart() {
    log_info "Restarting all services..."
    docker compose -f "$COMPOSE_FILE" restart
    sleep 5
    show_status
}

cmd_status() {
    check_docker
    show_status
}

show_status() {
    echo ""
    echo "┌────────────────────────────────────────────────────┐"
    echo "│         ContaFlow ERP — Service Status             │"
    echo "├────────────────────────────────────────────────────┤"

    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | \
        sed 's/^/│ /' | sed 's/$/ │/' | head -20

    echo "└────────────────────────────────────────────────────┘"
    echo ""

    # Health check
    if docker ps --format '{{.Names}}' | grep -q "contaflow-backend"; then
        BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' contaflow-backend 2>/dev/null || echo "unknown")
        log_info "Backend health: $BACKEND_HEALTH"
    fi

    if docker ps --format '{{.Names}}' | grep -q "contaflow-postgres"; then
        PG_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' contaflow-postgres 2>/dev/null || echo "unknown")
        log_info "PostgreSQL health: $PG_HEALTH"
    fi
}

cmd_backup() {
    bash "$DEPLOY_DIR/scripts/backup-pg.sh"
}

cmd_logs() {
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100 2>&1
}

cmd_update() {
    echo ""
    log_info "Updating and redeploying ContaFlow ERP..."
    echo ""

    # Pull latest code (if git repo)
    if [ -d "$PROJECT_ROOT/.git" ]; then
        log_step "Pulling latest code..."
        git -C "$PROJECT_ROOT" pull
    fi

    # Rebuild and restart
    log_step "Rebuilding images..."
    docker compose -f "$COMPOSE_FILE" build --parallel backend app 2>&1 | tail -5

    log_step "Restarting services..."
    docker compose -f "$COMPOSE_FILE" up -d backend app
    sleep 5

    show_status
    log_success "Update complete!"
}

# ── Main Entry Point ────────────────────────────────────────────────────

cd "$PROJECT_ROOT"

case "${1:-}" in
    --skip-ssl)  cmd_deploy "--skip-ssl" ;;
    --ssl-only)  cmd_ssl_only ;;
    --stop)      cmd_stop ;;
    --restart)   cmd_restart ;;
    --status)    cmd_status ;;
    --backup)    cmd_backup ;;
    --logs)      cmd_logs ;;
    --update)    cmd_update ;;
    ""|deploy)   cmd_deploy ;;
    *)
        echo ""
        echo "ContaFlow ERP — Deployment Manager"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  (no args)   Full deploy (build + SSL + start)"
        echo "  --skip-ssl  Deploy without SSL (HTTP only)"
        echo "  --ssl-only  Setup/renew SSL certificate"
        echo "  --stop      Stop all services"
        echo "  --restart   Restart all services"
        echo "  --status    Show service status"
        echo "  --backup    Create manual database backup"
        echo "  --logs      Tail logs from all services"
        echo "  --update    Pull latest code + rebuild + restart"
        echo ""
        ;;
esac
