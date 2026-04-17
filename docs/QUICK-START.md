# ContaFlow ERP — Guía Rápida (Quick Start)

## Windows — 3 pasos

```
1. Instalar Docker Desktop → https://www.docker.com/products/docker-desktop/
2. Descomprimir el proyecto y copiar el template de config:

   cd ContaFlow-ERP
   copy .env.local.template .env

3. Levantar todo:

   .\deploy-windows.ps1 up
```

Abrir http://localhost → Listo.

---

## Ubuntu — 3 pasos

```
1. Instalar dependencias:

   sudo bash deploy/scripts/install-deps.sh

2. Configurar:

   cp .env.local.template .env     # para pruebas
   # o
   cp .env.production .env         # para producción

3. Deploy:

   bash deploy-ubuntu.sh --local   # pruebas
   # o
   bash deploy-ubuntu.sh           # producción con SSL
```

Abrir http://IP-DEL-SERVIDOR → Listo.

---

## Credenciales por defecto

```
Email:    admin@empresademo.com.ar
Password: admin123
```

**Cambiala después del primer login.**

---

## URLs de acceso

| Servicio | Windows | Ubuntu (local) | Ubuntu (prod) |
|---|---|---|---|
| **App** | http://localhost | http://IP | https://tudominio.com.ar |
| **API** | http://localhost/api/ | http://IP/api/ | https://tudominio.com.ar/api/ |
| **Swagger** | http://localhost/swagger | http://IP/swagger | https://tudominio.com.ar/swagger |
| **Health** | http://localhost/api/health/ready | http://IP/api/health/ready | https://tudominio.com.ar/api/health/ready |
| **Mailpit** | http://localhost:8025 | http://IP:8025 | — |

---

## Comandos principales

| Acción | Windows | Ubuntu |
|---|---|---|
| **Levantar** | `.\deploy-windows.ps1 up` | `bash deploy-ubuntu.sh --local` |
| **Detener** | `.\deploy-windows.ps1 down` | `bash deploy-ubuntu.sh --stop` |
| **Reiniciar** | `.\deploy-windows.ps1 restart` | `bash deploy-ubuntu.sh --restart` |
| **Estado** | `.\deploy-windows.ps1 status` | `bash deploy-ubuntu.sh --status` |
| **Logs** | `.\deploy-windows.ps1 logs` | `bash deploy-ubuntu.sh --logs` |
| **Backup** | `.\deploy-windows.ps1 backup` | `bash deploy-ubuntu.sh --backup` |
| **Update** | `.\deploy-windows.ps1 rebuild` + `restart` | `bash deploy-ubuntu.sh --update` |
| **SSL** | — | `bash deploy-ubuntu.sh --ssl-only` |

---

## Requisitos

| | Mínimo | Recomendado |
|---|---|---|
| **RAM** | 8 GB | 16 GB |
| **Disco** | 20 GB | 50 GB SSD |
| **Docker** | 4.25+ | Última versión |
| **SO** | Windows 10 / Ubuntu 22.04 | Windows 11 / Ubuntu 24.04 |

---

## Stack técnico

- **Frontend**: Next.js 16 + React 19 + TypeScript + Prisma + shadcn/ui
- **Backend**: .NET 8 + Clean Architecture + EF Core + PostgreSQL
- **Infra**: Docker Compose + Nginx + Redis + Kafka + Mailpit
- **Auth**: JWT + BCrypt + RBAC (54 permisos)
- **Email**: SMTP async queue con Channel<T>
- **i18n**: Español, Inglés, Portugués (505 claves × 3 locales)

---

## Documentación completa

| Documento | Descripción |
|---|---|
| `docs/INSTALL-WINDOWS.md` | Guía de instalación Windows paso a paso |
| `docs/INSTALL-UBUNTU.md` | Guía de instalación Ubuntu paso a paso |
| `docs/DEPLOY-GUIDE.md` | Guía de deployment completo (arquitectura, SSL, backups, variables) |
| `docs/TROUBLESHOOTING.md` | Solución de problemas comunes |
| `docs/QUICK-START.md` | Esta guía rápida |
