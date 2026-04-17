# ContaFlow ERP — Guía de Deployment Completa

## Arquitectura de deployment

ContaFlow ERP usa Docker Compose para orquestar todos los servicios. No se necesita instalar PostgreSQL, Redis, Kafka, Nginx, ni nada en el sistema operativo — todo corre dentro de contenedores Docker.

### Diagrama de servicios

```
                    ┌─────────────────────────────────────────┐
  Navegador ──────► │  Nginx (puerto 80/443)                 │
                    │  - Reverse proxy                        │
                    │  - SSL termination                      │
                    │  - Rate limiting                        │
                    │  - Gzip compression                     │
                    │  - Static file cache                    │
                    └────────┬──────────────┬────────────────┘
                             │              │
                    /api/*   │              │  /
                             ▼              ▼
                    ┌──────────┐    ┌──────────────┐
                    │ .NET 8   │    │ Next.js 16   │
                    │ Backend  │    │ Frontend     │
                    │ (8080)   │    │ (3000)       │
                    └──┬──┬──┬─┘    └──────┬───────┘
                       │  │  │               │
              ┌────────┘  │  └──────┐        │
              ▼           ▼         ▼        ▼
        ┌──────────┐ ┌───────┐ ┌──────┐ ┌────────┐
        │PostgreSQL│ │ Redis │ │Kafka │ │Mailpit │
        │  16      │ │  7    │ │ 7.5  │ │SMTP    │
        │ (5432)   │ │(6379) │ │(9092)│ │(1025)  │
        └──────────┘ └───────┘ └──┬───┘ └────────┘
                                 │
                            ┌────┴───┐
                            │Zookeeper│
                            │ (2181) │
                            └────────┘
```

### Archivos de Docker Compose

El proyecto tiene **3 archivos de compose** para diferentes entornos:

| Archivo | Entorno | SSL | Nginx | Mailpit | Puertos expuestos |
|---|---|---|---|---|---|
| `docker-compose.yml` | Desarrollo | No | No | Sí | Todos |
| `docker-compose.local.yml` | Windows local | No | Sí | Sí | Todos |
| `docker-compose.prod.yml` | Producción | Sí | Sí | Dev only | Solo 80/443 |

---

## Entornos de deployment

### 1. Desarrollo (`docker-compose.yml`)

Para trabajo activo de desarrollo. Todos los servicios exponen puertos al host para debugging directo.

```bash
# Levantar
docker compose up -d

# Ver logs
docker compose logs -f backend
docker compose logs -f app

# Rebuild individual
docker compose build backend
docker compose up -d backend
```

Puertos: 3000 (frontend), 8080 (backend), 5432 (postgres), 6379 (redis), 9092 (kafka), 1025/8025 (mailpit)

### 2. Local / Windows (`docker-compose.local.yml`)

Para probar el sistema completo en Windows con Docker Desktop. Nginx actúa como reverse proxy unificando todo en puerto 80, igual que en producción pero sin SSL.

```powershell
# Windows PowerShell
.\deploy-windows.ps1 up
```

```bash
# Linux/macOS
docker compose -f docker-compose.local.yml up -d
```

Puertos: 80 (nginx), 3000, 8080, 5432, 6379, 9092, 1025, 8025

### 3. Producción (`docker-compose.prod.yml`)

Para servidor VPS o dedicado con dominio real. Incluye SSL (Let's Encrypt), resource limits, backups automáticos y seguridad reforzada.

```bash
# Setup inicial
bash deploy-ubuntu.sh

# Solo renuevar SSL
bash deploy-ubuntu.sh --ssl-only

# Ver estado
bash deploy-ubuntu.sh --status
```

Puertos expuestos: Solo 80 (HTTP) y 443 (HTTPS). Todo lo demás es interno.

---

## Configuración de Nginx

### Configuración local (`deploy/nginx/nginx-local.conf`)

- HTTP only, sin SSL
- Rate limiting: 30 requests/segundo para API, 5 requests/minuto para auth
- Gzip compression para text/css/js/json/xml/svg
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- Routing: `/api/*` → backend, `/mailpit/*` → mailpit, `/` → Next.js
- Cache inmutable (365 días) para assets estáticos de Next.js
- Cache 30 días para imágenes

### Configuración producción (`deploy/nginx/nginx.conf`)

Todo lo de local, más:
- SSL/TLS con certificados Let's Encrypt
- HTTP → HTTPS redirect automático
- HSTS (2 años, preload)
- Content Security Policy estricto
- OCSP Stapling
- Health checks sin rate limit ni logging

### Configuración pre-SSL (`deploy/nginx/nginx-initial.conf`)

Igual que la local pero se usa temporalmente antes de obtener el certificado SSL. Nginx la reemplaza automáticamente con la config de producción cuando el cert está listo.

---

## Configuración de SSL (Let's Encrypt)

### Obtención automática

El script `deploy-ubuntu.sh` obtiene el certificado automáticamente si:

1. El dominio en `DOMAIN=tudominio.com.ar` apunta a la IP del servidor (DNS registro A)
2. Los puertos 80 y 443 están abiertos en el firewall
3. El servidor es accesible desde Internet

El proceso es:

1. Crea un certificado auto-firmado temporal (para que Nginx pueda arrancar)
2. Inicia Nginx con el cert temporal
3. Ejecuta Certbot para obtener el cert real de Let's Encrypt
4. Reemplaza la config de Nginx con la versión SSL completa
5. Reinicia Nginx con el cert real

### Renovación automática

El contenedor `certbot` corre permanentemente y renueva el certificado cada 12 horas si es necesario (Let's Encrypt expira cada 90 días). No necesitás hacer nada manualmente.

### Verificar SSL

```bash
# Ver certificados
sudo ls -la deploy/ssl/certbot/conf/live/tudominio.com.ar/

# Fecha de expiración
sudo openssl x509 -in deploy/ssl/certbot/conf/live/tudominio.com.ar/fullchain.pem -noout -dates

# Testeo de seguridad (desde tu PC)
# https://www.ssllabs.com/ssltest/analyze.html?d=tudominio.com.ar
```

---

## Backups automáticos

### Cómo funcionan

El servicio `pg-backup` corre dentro de un contenedor con PostgreSQL Alpine. No necesita cron del sistema operativo porque usa un loop interno con sleep calculado según el cron schedule.

### Programación por entorno

| Entorno | Frecuencia | Retención | Archivo |
|---|---|---|---|
| Windows local | Cada 6 horas | 7 días | `contaflow_contaflow_erp_YYYYMMDD_HHMMSS.sql.gz` |
| Producción | Todos los días a las 3:00 AM | 30 días | Mismo formato |

### Formato de backup

- `pg_dump` en formato SQL plano (compatible con cualquier PostgreSQL)
- Comprimido con gzip (tamaño típico: 100 KB - 5 MB para datos de desarrollo)
- No incluye owner ni privilegios (fácil de restaurar en cualquier servidor)

### Script de backup (uso manual)

```bash
# Ejecutar backup manual
bash deploy/scripts/backup-pg.sh

# O via deploy-ubuntu.sh
bash deploy-ubuntu.sh --backup

# O via deploy-windows.ps1
.\deploy-windows.ps1 backup
```

### Restaurar un backup

```bash
# Listar backups disponibles
ls -lh deploy/backups/

# Restaurar (ATENCIÓN: borra la DB actual)
bash deploy/scripts/restore-pg.sh deploy/backups/contaflow_contaflow_erp_20250415_030000.sql.gz
```

---

## Variables de entorno

### Archivos de configuración

| Archivo | Propósito | Usar en... |
|---|---|---|
| `.env.local.template` | Template para desarrollo local | Windows, pruebas |
| `.env.example` | Template genérico | Desarrollo en Linux/Mac |
| `.env.production` | Template para producción | Ubuntu VPS |
| `.env` | Archivo activo (NUNCA compartir) | Todos los entornos |

### Variables principales

| Variable | Default local | Producción | Descripción |
|---|---|---|---|
| `POSTGRES_HOST` | `postgres` | `postgres` | Host de PostgreSQL (nombre del contenedor) |
| `POSTGRES_PORT` | `5432` | `5432` | Puerto de PostgreSQL |
| `POSTGRES_DB` | `contaflow_erp` | `contaflow_erp` | Nombre de la base de datos |
| `POSTGRES_USER` | `contaflow` | `contaflow_prod` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `contaflow_local_dev_2024` | *(cambiar)* | Contraseña de PostgreSQL |
| `DATABASE_URL` | EF Core format | EF Core format | Connection string para .NET |
| `DATABASE_URL_PRISMA` | Prisma format | Prisma format | Connection string para Next.js |
| `REDIS_HOST` | `redis` | `redis` | Host de Redis |
| `REDIS_PASSWORD` | *(vacío)* | *(cambiar)* | Contraseña de Redis |
| `JWT_KEY` | Clave de dev | *(cambiar)* | Clave secreta JWT (mín. 32 chars) |
| `JWT_EXPIRES_MINUTES` | `480` (8h) | `480` | Duración del token de acceso |
| `KAFKA_ENABLED` | `true` | `true` | Activar mensajería Kafka |
| `EMAIL_SMTP_HOST` | `mailpit` | `smtp.sendgrid.net` | Servidor SMTP |
| `EMAIL_SMTP_PORT` | `1025` | `587` | Puerto SMTP |
| `CORS_ALLOWED_ORIGINS` | `http://localhost` | `https://tudominio.com.ar` | Orígenes CORS permitidos |
| `DOMAIN` | — | `tudominio.com.ar` | Dominio para SSL (solo producción) |

### Generación de claves seguras

Para producción, generá claves seguras con:

```bash
# JWT Key
openssl rand -base64 48

# Contraseña PostgreSQL
openssl rand -base64 24

# Contraseña Redis
openssl rand -base64 24
```

---

## Flujo de actualización (deploy de nueva versión)

### En Windows

```powershell
# 1. Bajá la nueva versión del código
git pull

# 2. Rebuild de imágenes
.\deploy-windows.ps1 rebuild

# 3. Restart con las nuevas imágenes
.\deploy-windows.ps1 restart
```

### En Ubuntu (producción)

```bash
# El script --update hace todo automáticamente
bash deploy-ubuntu.sh --update
```

Este script:

1. Hace `git pull` si es un repositorio Git
2. Reconstruye las imágenes de backend y frontend
3. Reinicia solo los servicios actualizados
4. Muestra el estado final

### Estrategia de zero-downtime (futuro)

Para producción con múltiples usuarios, se recomienda implementar:

1. **Health checks** ya configurados en Nginx (espera a que el backend esté healthy)
2. **Rolling update**: Docker Compose no tiene rolling update nativo. Para eso se recomienda migrar a Docker Swarm o Kubernetes en el futuro.
3. **Blue-green deploy**: Levantar un segundo set de contenedores y cambiar el DNS/Nginx upstream

---

## Checklist de pre-deploy (producción)

Antes de ir a producción con un dominio real, verificá:

- [ ] Dominio configurado en DNS (registro A apuntando a la IP del servidor)
- [ ] Puertos 80 y 443 abiertos en firewall (UFW) y en el router/cloud provider
- [ ] `.env` creado desde `.env.production` con todos los valores reales
- [ ] No quedan valores `CHANGE_ME` en el `.env`
- [ ] `POSTGRES_PASSWORD` es una contraseña fuerte (16+ caracteres)
- [ ] `JWT_KEY` fue generada con `openssl rand -base64 48`
- [ ] `REDIS_PASSWORD` está configurado
- [ ] `EMAIL_SMTP_*` apunta a un SMTP real (SendGrid, Mailgun, etc.)
- [ ] `CORS_ALLOWED_ORIGINS` solo tiene tu dominio real
- [ ] `DOMAIN` tiene tu dominio real
- [ ] SSH con claves configurado (no solo password)
- [ ] Fail2Ban activo (`sudo fail2ban-client status`)
- [ ] Backups automáticos verificados (`ls deploy/backups/`)
- [ ] Certificado SSL obtenido (`curl -I https://tudominio.com.ar`)
