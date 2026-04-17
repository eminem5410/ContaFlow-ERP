#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════
# ContaFlow ERP — Server Setup Script
# ══════════════════════════════════════════════════════════════════════════
# Run this on a FRESH Ubuntu 22.04/24.04 VPS as root:
#   curl -sL https://raw.githubusercontent.com/your-repo/deploy/main/install-deps.sh | bash
#   or: bash deploy/scripts/install-deps.sh
#
# What it does:
#   1. Updates system packages
#   2. Installs Docker + Docker Compose
#   3. Installs Git + useful tools
#   4. Configures firewall (ufw)
#   5. Sets up swap (if needed)
#   6. Creates backup directories
# ══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ContaFlow ERP — Server Setup"
echo "  OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 || echo 'Unknown')"
echo "  Date: $(date)"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# ── 1. System Update ────────────────────────────────────────────────────
log_info "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get dist-upgrade -y -qq
log_success "System updated"

# ── 2. Install Dependencies ────────────────────────────────────────────
log_info "Installing dependencies..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    htop \
    ncdu \
    tree \
    jq \
    unzip \
    fail2ban \
    ufw \
    logrotate \
    cron \
    > /dev/null 2>&1
log_success "Dependencies installed"

# ── 3. Docker + Docker Compose ─────────────────────────────────────────
if command -v docker &> /dev/null; then
    log_success "Docker already installed: $(docker --version)"
else
    log_info "Installing Docker..."
    # Add Docker GPG key and repository
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    log_success "Docker installed: $(docker --version)"
fi

# Enable Docker service
systemctl enable docker
systemctl start docker

# Add current user to docker group if exists
CURRENT_USER=${SUDO_USER:-$(whoami)}
if [ "$CURRENT_USER" != "root" ] && id "$CURRENT_USER" &> /dev/null; then
    usermod -aG docker "$CURRENT_USER"
    log_success "User '$CURRENT_USER' added to docker group"
fi

# ── 4. Firewall (UFW) ─────────────────────────────────────────────────
log_info "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (allow existing connections to prevent lockout)
ufw allow ssh

# HTTP + HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

ufw --force enable
log_success "Firewall configured (SSH, HTTP, HTTPS allowed)"

# ── 5. Fail2Ban ───────────────────────────────────────────────────────
log_info "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sender = root@localhost

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban
log_success "Fail2Ban configured"

# ── 6. Swap (if < 2GB RAM or no swap) ──────────────────────────────────
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024))
CURRENT_SWAP_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')

if [ "$CURRENT_SWAP_KB" -eq 0 ] && [ "$TOTAL_MEM_MB" -lt 4000 ]; then
    SWAP_SIZE=$((TOTAL_MEM_MB))M
    log_info "Creating ${SWAP_SIZE} swap file (detected ${TOTAL_MEM_MB}MB RAM)..."
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    log_success "Swap created: ${SWAP_SIZE}"
else
    log_success "Swap not needed (${TOTAL_MEM_MB}MB RAM, $((CURRENT_SWAP_KB/1024))MB swap)"
fi

# ── 7. Logrotate for Docker ────────────────────────────────────────────
log_info "Configuring log rotation..."
cat > /etc/logrotate.d/docker-containers << 'EOF'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
EOF
log_success "Log rotation configured"

# ── 8. Kernel Tuning ───────────────────────────────────────────────────
log_info "Tuning kernel parameters..."
cat > /etc/sysctl.d/99-contaflow.conf << 'EOF'
# Network
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1

# Memory
vm.overcommit_memory = 0
vm.swappiness = 10

# File descriptors
fs.file-max = 2097152
EOF

sysctl --system > /dev/null 2>&1
log_success "Kernel parameters tuned"

# ── 9. File Descriptor Limits ─────────────────────────────────────────
cat > /etc/security/limits.d/contaflow.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF
log_success "File descriptor limits increased"

# ── 10. System Information ─────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  System Info:"
echo "    OS:          $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2)"
echo "    Kernel:      $(uname -r)"
echo "    CPU:         $(nproc) cores"
echo "    RAM:         ${TOTAL_MEM_MB} MB"
echo "    Swap:        $(free -m | awk '/Swap/{print $2}') MB"
echo "    Disk:        $(df -h / | awk 'NR==2{print $4}') free"
echo "    Docker:      $(docker --version)"
echo ""
echo "  Firewall:      $(ufw status | head -1)"
echo "  Fail2Ban:      $(systemctl is-active fail2ban)"
echo ""
echo "  Next Steps:"
echo "    1. Clone your repo: git clone <repo-url> /opt/contaflow"
echo "    2. cd /opt/contaflow && cp .env.production .env"
echo "    3. Edit .env with your production values"
echo "    4. Run: bash deploy/scripts/deploy.sh"
echo ""
