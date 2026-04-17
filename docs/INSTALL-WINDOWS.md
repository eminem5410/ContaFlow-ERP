# ContaFlow ERP — Guía de Instalación en Windows

## Requisitos previos

### Hardware mínimo recomendado

| Componente | Mínimo | Recomendado |
|---|---|---|
| **Procesador** | Dual-core x64 | Quad-core x64 |
| **RAM** | 8 GB | 16 GB |
| **Disco** | 20 GB libres | 50 GB SSD |
| **Sistema** | Windows 10 (64-bit) | Windows 10/11 Pro (64-bit) |

La máquina virtual de Docker Desktop consume aproximadamente 2-4 GB de RAM por defecto. Con 8 GB de RAM totales podés correr todos los servicios sin problemas, pero si tu PC tiene solo 8 GB te recomiendo asignar 4 GB a Docker Desktop y cerrar otros programas pesados mientras usás ContaFlow.

### Software necesario

1. **Docker Desktop para Windows** — Es el único requisito obligatorio. Descargalo desde:
   - https://www.docker.com/products/docker-desktop/
   - Versión mínima: 4.25+ (recomendada la última disponible)
   - Durante la instalación, asegurate de marcar "Use WSL 2 instead of Hyper-V" si te lo pregunta (mejor rendimiento)

2. **PowerShell 5.1+** — Ya viene incluido con Windows 10/11. Verificá la versión con:
   ```powershell
   $PSVersionTable.PSVersion
   ```

3. **Git para Windows** (opcional, si clonas desde un repo):
   - https://git-scm.com/download/win

---

## Pasos de instalación

### Paso 1 — Instalar Docker Desktop

1. Descargá el instalador desde https://www.docker.com/products/docker-desktop/
2. Ejecutá el instalador como Administrador
3. Seguí el asistente con las opciones por defecto
4. Cuando termine, reiniciá la PC si te lo pide
5. Abrí Docker Desktop desde el menú Inicio (o click derecho en el icono de la ballena en la barra de tareas)
6. Esperá a que el icono de la ballena esté **verde** (puede tardar 1-2 minutos la primera vez)
7. Verificá que funcione abriendo PowerShell y ejecutando:
   ```powershell
   docker --version
   docker compose version
   ```

Si ambos comandos muestran un número de versión, Docker Desktop está listo.

### Paso 2 — Configurar Docker Desktop (recomendado)

Abrí Docker Desktop → Settings → Resources:

- **CPUs**: Asigná al menos 2 cores
- **Memory**: Asigná al menos 4 GB (si tenés 16 GB totales, poné 6-8 GB)
- **Disk**: Dejá el default (60 GB es suficiente)
- **Advanced**: Activá "Enable containerd" (opcional)

Estos cambios requieren reiniciar Docker Desktop. Hacelo desde el icono de la ballena → Restart.

### Paso 3 — Preparar el proyecto

Descomprimí el archivo `ContaFlow-ERP-deploy-windows.tar.gz` en la ubicación que prefieras. Por ejemplo:

```
C:\Proyectos\ContaFlow-ERP\
```

Para descomprimir:
- **7-Zip**: Click derecho → "Extract Here" (primero extrae el .tar del .gz, luego extrae el contenido del .tar)
- **WinRAR**: Click derecho → "Extract Here"
- **PowerShell**:
  ```powershell
  Expand-Archive .\ContaFlow-ERP-deploy-windows.tar.gz -DestinationPath .\ContaFlow-ERP-temp
  # Luego extrae el .tar interno
  ```

### Paso 4 — Configurar las variables de entorno

Abrí PowerShell en la carpeta del proyecto:

```powershell
cd C:\Proyectos\ContaFlow-ERP
```

Copiá el template de configuración:

```powershell
copy .env.local.template .env
```

Editá el archivo `.env` con tus valores:

```powershell
notepad .env
```

Los valores por defecto del template funcionan sin cambios para desarrollo local. Los únicos campos que podés querer cambiar:

| Variable | Default | Descripción |
|---|---|---|
| `POSTGRES_PASSWORD` | `contaflow_local_dev_2024` | Contraseña de PostgreSQL (solo para local) |
| `JWT_KEY` | `contaflow_local_jwt_secret_key_2024_dev` | Clave secreta para tokens JWT (mínimo 32 caracteres) |
| `NGINX_PORT` | `80` | Puerto de Nginx (si el 80 está ocupado, usá 8080) |
| `APP_PORT` | `3000` | Puerto directo del frontend (solo si usás `-SkipNginx`) |
| `BACKEND_PORT` | `8080` | Puerto directo del backend (solo si usás `-SkipNginx`) |

**Si tenés otro servicio usando el puerto 80** (como IIS o Apache), cambiá `NGINX_PORT=8080` en el `.env`. En ese caso accederías a http://localhost:8080 en lugar de http://localhost.

### Paso 5 — Levantar los servicios

Opción A — **Con Nginx** (recomendado, todo por puerto 80):

```powershell
.\deploy-windows.ps1 up
```

Opción B — **Sin Nginx** (acceso directo a puertos, útil para debugging):

```powershell
.\deploy-windows.ps1 up -SkipNginx
```

El primer `up` puede tardar **5-15 minutos** porque Docker necesita descargar las imágenes base (PostgreSQL, .NET, Node.js, Nginx, Kafka, etc.) y compilar el frontend y backend. Las veces siguientes será mucho más rápido (1-3 minutos).

Verás el progreso en la consola. Cuando termine, verás algo así:

```
  ══════════════════════════════════════════════════
  DEPLOY EXITOSO!
  ══════════════════════════════════════════════════

  App:       http://localhost
  Backend:   http://localhost/api/ (via nginx)
  Swagger:   http://localhost/swagger
  Mailpit:   http://localhost:8025
```

### Paso 6 — Verificar que todo funciona

Abrí el navegador y probá estas URLs:

| URL | Qué deberías ver |
|---|---|
| http://localhost | Pantalla de login de ContaFlow ERP |
| http://localhost/swagger | API del backend .NET (Swagger UI) |
| http://localhost/api/health/ready | `{"status":"healthy","database":"OK","redis":"OK"}` |
| http://localhost:8025 | Mailpit — Panel de emails de testing |
| http://localhost:5432 (no abre en browser) | PostgreSQL corriendo |

Si la página de login carga correctamente, todo está funcionando.

### Paso 7 — Primer login

Credenciales por defecto (las crea el seed de la base de datos):

```
Email:    admin@empresademo.com.ar
Password: admin123
```

**IMPORTANTE**: Cambiá la contraseña inmediatamente después del primer login desde Configuración o Usuarios.

---

## Uso diario

### Comandos principales

```powershell
# Ver estado de todos los servicios
.\deploy-windows.ps1 status

# Ver logs en tiempo real (Ctrl+C para salir)
.\deploy-windows.ps1 logs

# Reiniciar todos los servicios
.\deploy-windows.ps1 restart

# Detener todo (los datos se conservan)
.\deploy-windows.ps1 down

# Levantar de nuevo después de detener
.\deploy-windows.ps1 up
```

### Backup manual de la base de datos

```powershell
.\deploy-windows.ps1 backup
```

Esto crea un archivo `.sql.gz` en la carpeta `deploy\backups\`. Los backups automáticos se ejecutan cada 6 horas.

### Reconstruir imágenes (después de actualizar el código)

```powershell
.\deploy-windows.ps1 rebuild
.\deploy-windows.ps1 restart
```

### Limpiar espacio en disco

```powershell
.\deploy-windows.ps1 clean
```

Elimina imágenes huérfanas, volumes sin usar, cache de Docker build y backups mayores a 30 días.

---

## Estructura de carpetas importante

```
ContaFlow-ERP/
├── .env                          # Tu configuración (NUNCA compartir)
├── .env.local.template           # Template de configuración
├── docker-compose.local.yml      # Compose para Windows
├── docker-compose.prod.yml       # Compose para producción (Ubuntu)
├── deploy-windows.ps1            # Script PowerShell
├── deploy-ubuntu.sh              # Script para Ubuntu (cuando migres)
├── Dockerfile                    # Build del frontend Next.js
├── package.json                  # Dependencias del frontend
├── next.config.ts                # Config Next.js
├── src/                          # Código fuente del frontend
│   ├── app/                      # Páginas y API routes de Next.js
│   ├── components/               # Componentes React
│   └── lib/                      # Utilidades
├── backend/                      # Código fuente del backend .NET 8
│   ├── ContaFlow.API/            # Controladores, Program.cs
│   ├── ContaFlow.Application/    # Servicios, DTOs, Event handlers
│   ├── ContaFlow.Domain/         # Entidades, Interfaces
│   ├── ContaFlow.Infrastructure/ # Data, Kafka, Redis, Email
│   └── ContaFlow.sln             # Solution de Visual Studio
├── deploy/
│   ├── backups/                  # Backups de PostgreSQL (.sql.gz)
│   ├── nginx/
│   │   ├── nginx-local.conf      # Config Nginx para Windows
│   │   ├── nginx.conf            # Config Nginx para producción
│   │   └── logs/                 # Logs de Nginx
│   └── scripts/                  # Scripts de backup, restore, deploy
├── download/migrations/          # SQL de migración de PostgreSQL
└── docs/                         # Esta documentación
```

---

## Servicios que corren en Docker

| Contenedor | Puerto | Descripción |
|---|---|---|
| `contaflow-postgres` | 5432 | PostgreSQL 16 — Base de datos principal |
| `contaflow-backend` | 8080 | .NET 8 — API backend |
| `contaflow-app` | 3000 | Next.js — Frontend |
| `contaflow-nginx` | 80 | Nginx — Reverse proxy (unifica todo en un puerto) |
| `contaflow-redis` | 6379 | Redis 7 — Cache y distributed locks |
| `contaflow-kafka` | 9092 | Apache Kafka — Mensajería asíncrona |
| `contaflow-zookeeper` | 2181 | Zookeeper — Coordinador de Kafka |
| `contaflow-mailpit` | 1025/8025 | Mailpit — Servidor SMTP de testing + Web UI |
| `contaflow-pg-backup` | — | Backup automático de PostgreSQL (cada 6 horas) |

---

## Datos persistentes

Tus datos se guardan en **Docker volumes**, NO en los contenedores. Esto significa que:

- Al ejecutar `.\deploy-windows.ps1 down` → se detienen los contenedores pero los datos **se conservan**
- Al ejecutar `.\deploy-windows.ps1 up` → se levantan los contenedores con los datos intactos
- Solo perdés datos si borrás los volumes manualmente con `docker volume rm`

Los volumes se llaman: `contaflow_postgres_data` y `contaflow_redis_data`.

Para ver los volumes:

```powershell
docker volume ls
```

---

## Problemas comunes

### "Docker Desktop NO está corriendo"
Abrí Docker Desktop desde el menú Inicio y esperá a que el icono de la ballena esté verde.

### Puerto 80 ya está en uso
Cambiar `NGINX_PORT=8080` en `.env` y acceder a http://localhost:8080.

### Error de permisos en Windows
Ejecutá PowerShell como Administrador y verificá que no haya archivos bloqueados.

### Los contenedores tardan mucho en iniciar
Es normal la primera vez (descarga de imágenes). Las siguientes veces debería tardar 1-2 minutos.

### Se reinició la PC y los servicios no arrancan
Docker Desktop tiene que estar configurado para iniciar con Windows. Abrilo manualmente y ejecutá `.\deploy-windows.ps1 up`.

### Quiero borrar todo y empezar de cero
```powershell
.\deploy-windows.ps1 down
docker volume rm contaflow_postgres_data contaflow_redis_data
.\deploy-windows.ps1 up
```
