# ContaFlow ERP — Solución de Problemas

## Problemas de Docker

### "Docker Desktop is not running"

**Síntoma**: El script muestra `Docker Desktop NO está corriendo!`

**Solución**:
1. Abrí Docker Desktop desde el menú Inicio de Windows
2. Esperá a que el icono de la ballena en la barra de tareas esté **verde**
3. Si no arranca, reiniciá la PC y volvé a intentar
4. Verificá que WSL 2 esté habilitado: PowerShell como Admin → `wsl --status`

### "Cannot connect to the Docker daemon"

**Síntoma**: `error during connect: This error may indicate that the docker daemon is not running`

**Solución** (Windows):
```powershell
# Reiniciar Docker Desktop
Stop-Service docker
Start-Service docker

# O reiniciá Docker Desktop desde el icono → Restart
```

**Solución** (Ubuntu):
```bash
sudo systemctl restart docker
sudo systemctl status docker
```

### "port is already allocated"

**Síntoma**: `Error response from daemon: Ports are not available: listen tcp 0.0.0.0:80: bind: address already in use`

**Solución**:
1. Identificá qué usa el puerto: `netstat -ano | findstr :80` (Windows) o `sudo lsof -i :80` (Ubuntu)
2. Cambiá el puerto en `.env`: `NGINX_PORT=8080`
3. O detené el servicio que usa el puerto 80 (normalmente IIS en Windows: `iisreset /stop`)

**Puertos comunes en conflicto**:

| Puerto | Servicio | Alternativa en .env |
|---|---|---|
| 80 | IIS, Apache, Skype | `NGINX_PORT=8080` |
| 443 | IIS, Apache | (no se usa en deploy local) |
| 3000 | Otra app Node.js | `APP_PORT=3001` |
| 5432 | PostgreSQL local | `POSTGRES_PORT=5433` |
| 8080 | Otra app .NET/Java | `BACKEND_PORT=8081` |
| 6379 | Redis local | Cambiar en compose si es necesario |

### "no space left on device"

**Síntoma**: Docker no puede crear contenedores o imágenes por falta de espacio.

**Solución**:
```powershell
# Limpiar Docker (Windows)
.\deploy-windows.ps1 clean

# O manualmente:
docker system prune -a --volumes
```

```bash
# Ubuntu: limpiar Docker
docker system prune -a --volumes

# Ver uso de disco
df -h
docker system df
```

### Los contenedores se reinician constantemente (crash loop)

**Síntoma**: `docker compose ps` muestra `Restarting` en varios servicios.

**Solución**:
```bash
# Ver logs del contenedor que falla
docker logs contaflow-backend --tail 50
docker logs contaflow-app --tail 50
docker logs contaflow-postgres --tail 50

# Ver detalles del contenedor
docker inspect contaflow-backend | grep -A 5 "State"
```

Causas comunes:
- **PostgreSQL no inicia**: Error en `.env` (contraseña con caracteres especiales), o los volumes están corruptos. Borrar volumes y empezar de cero.
- **Backend no inicia**: Error de conexión a PostgreSQL o Kafka. Verificar que postgres esté healthy primero.
- **Frontend no inicia**: Error de build de Next.js. Verificar que `node_modules` no esté corrupto (rebuild).

---

## Problemas de Base de Datos

### "relation does not exist" o tablas faltantes

**Síntoma**: El backend muestra errores 500 diciendo que alguna tabla no existe.

**Causa**: La migración SQL no se ejecutó correctamente al crear el contenedor de PostgreSQL.

**Solución**:
```bash
# Verificar si las tablas existen
docker exec -it contaflow-postgres psql -U contaflow -d contaflow_erp -c "\dt"

# Si faltan tablas, ejecutar la migración manualmente
docker exec -it contaflow-postgres psql -U contaflow -d contaflow_erp -f /docker-entrypoint-initdb.d/01-initial-create.sql

# Si aún hay problemas, recrear todo (PERDE LOS DATOS)
.\deploy-windows.ps1 down
docker volume rm contaflow_postgres_data
.\deploy-windows.ps1 up
```

### "password authentication failed"

**Síntoma**: El backend no puede conectarse a PostgreSQL.

**Causa**: La contraseña en `.env` no coincide con la que usa el contenedor de PostgreSQL.

**Solución**:
1. Verificá que `POSTGRES_PASSWORD` sea idéntico en `.env` y en la variable `DATABASE_URL`
2. La `DATABASE_URL` tiene la contraseña embebida: `Password=TU_PASSWORD`
3. Si cambiaste la contraseña después de crear el contenedor, tenés que recrear el volume:
```bash
.\deploy-windows.ps1 down
docker volume rm contaflow_postgres_data
# Actualizá el .env con la nueva contraseña
.\deploy-windows.ps1 up
```

### Base de datos corrupta

**Síntoma**: Errores extraños, datos que no se guardan, querys que fallan.

**Solución**:
```bash
# 1. Hacer backup de lo que se pueda
.\deploy-windows.ps1 backup

# 2. Restaurar desde el último backup funcional
bash deploy/scripts/restore-pg.sh deploy/backups/contaflow_contaflow_erp_YYYYMMDD_HHMMSS.sql.gz

# 3. Si no hay backup, empezar de cero
.\deploy-windows.ps1 down
docker volume rm contaflow_postgres_data contaflow_redis_data
.\deploy-windows.ps1 up
```

---

## Problemas de Red / Conexión

### No puedo acceder desde otro dispositivo en la red local

**Síntoma**: Funciona en http://localhost pero no desde http://IP-DE-TU-PC.

**Solución** (Windows):
1. Asegurate de que el firewall de Windows permita el puerto 80
2. PowerShell como Admin:
```powershell
New-NetFirewallRule -DisplayName "ContaFlow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
```

3. Verificá la IP de tu PC: `ipconfig`
4. Desde el otro dispositivo: `http://192.168.X.X`

### Error de CORS en el navegador

**Síntoma**: El navegador muestra errores de CORS al hacer requests al backend.

**Solución**: Verificá `CORS_ALLOWED_ORIGINS` en `.env`:
```
# Incluí TODOS los orígenes desde los que accedés
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:3000,http://192.168.1.100,http://tudominio.com.ar
```

Luego reiniciá:
```powershell
.\deploy-windows.ps1 restart
```

### Nginx muestra 502 Bad Gateway

**Síntoma**: Al entrar a http://localhost, Nginx muestra "502 Bad Gateway".

**Causa**: Nginx no puede conectarse al backend o al frontend.

**Solución**:
```bash
# Verificar que los servicios estén corriendos
.\deploy-windows.ps1 status

# Ver logs de Nginx
docker logs contaflow-nginx --tail 20

# Verificar health del backend
docker exec contaflow-nginx wget -qO- http://backend:8080/health/ready

# Verificar health del frontend
docker exec contaflow-nginx wget -qO- http://app:3000

# Reiniciar
.\deploy-windows.ps1 restart
```

---

## Problemas de Build

### "npm ERR! code ELIFECYCLE" o "next build" falla

**Síntoma**: El contenedor de Next.js falla al construir.

**Solución**:
```powershell
# Limpiar cache de Docker
docker builder prune -f

# Reconstruir sin cache
docker compose -f docker-compose.local.yml build --no-cache app
docker compose -f docker-compose.local.yml up -d app
```

### ".NET build falla"

**Síntoma**: El contenedor del backend falla al compilar.

**Solución**:
```powershell
# Ver el error completo
docker compose -f docker-compose.local.yml build --no-cache backend 2>&1

# Verificar que no haya archivos .cs con errores
docker compose -f docker-compose.local.yml build backend
```

### Build lento

**Síntoma**: El primer `up` tarda más de 15 minutos.

**Solución**:
1. Es normal la primera vez (descarga imágenes base + compila)
2. Verificá tu conexión a internet
3. En Docker Desktop → Settings → Docker Engine, podés configurar un mirror:
```json
{
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ]
}
```

---

## Problemas de Email

### Los emails no se envían

**Síntoma**: El sistema no muestra errores pero no llegan emails.

**Solución**:

En **desarrollo/local** con Mailpit:
1. Verificá que Mailpit esté corriendo: http://localhost:8025
2. Verificá `EMAIL_SMTP_HOST=mailpit` y `EMAIL_SMTP_PORT=1025` en `.env`
3. Los emails se ven en el panel de Mailpit (no se envían realmente)

En **producción**:
1. Verificá las credenciales SMTP (SendGrid, Mailgun, etc.)
2. Verificá `EMAIL_USE_SSL=true` para puertos 465/587
3. Verificá que la IP del servidor no esté en listas negras
4. Para SendGrid: usá una API Key como password, no tu password de cuenta

---

## Problemas de SSL

### Certbot no puede obtener el certificado

**Síntoma**: "Certbot failed to obtain certificate"

**Causas comunes**:
1. El dominio no apunta a la IP del servidor (DNS no propagado)
2. El puerto 80 está bloqueado por el firewall o el router
3. El dominio es nuevo y Let's Encrypt tiene una restricción

**Solución**:
```bash
# Verificar DNS
dig tudominio.com.ar +short
# Debería mostrar tu IP

# Verificar puerto 80 desde afuera
# (desde tu PC)
curl http://tudominio.com.ar

# Verificar firewall
sudo ufw status

# Reintentar SSL
bash deploy-ubuntu.sh --ssl-only
```

### El certificado expiró

**Síntoma**: El navegador muestra "Your connection is not private"

**Solución**: El certbot debería renovar automáticamente. Si no lo hizo:
```bash
# Renovar manualmente
bash deploy-ubuntu.sh --ssl-only

# Verificar fecha de expiración
sudo openssl x509 -in deploy/ssl/certbot/conf/live/tudominio.com.ar/fullchain.pem -noout -dates
```

---

## Problemas de Performance

### Aplicación lenta

**Síntoma**: Las páginas tardan más de 3-5 segundos en cargar.

**Verificaciones**:
```bash
# Ver uso de recursos
docker stats

# Ver si PostgreSQL está saturado
docker exec contaflow-postgres psql -U contaflow -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Ver si Redis está funcionando
docker exec contaflow-redis redis-cli ping
```

**Soluciones**:
1. Aumentá la RAM asignada a Docker Desktop (Settings → Resources → Memory)
2. Verificá que no haya antivirus escaneando los archivos de Docker (agregar exclusión)
3. En Windows, usá WSL 2 en vez de Hyper-V para mejor performance de disco

### Kafka consume mucha memoria

**Síntoma**: El contenedor de Kafka usa más de 768 MB.

**Solución**: Si no usás eventos en tiempo real, podés desactivar Kafka:
```
KAFKA_ENABLED=false
```
Esto no elimina los contenedores de Kafka pero el backend no se conecta a ellos. Para eliminarlos por completo, editá `docker-compose.local.yml` y comentá los servicios `kafka` y `zookeeper`.

---

## Comandos de diagnóstico

### Ver todo de golpe

```bash
# Estado de contenedores
docker compose ps

# Uso de recursos
docker stats --no-stream

# Health checks
docker inspect --format='{{.Name}}: {{.State.Health.Status}}' $(docker ps -q)

# Espacio en disco de Docker
docker system df

# Networks de Docker
docker network ls

# Volumes de Docker
docker volume ls
```

### Reset total (último recurso)

```powershell
# Windows: BORRA TODOS LOS DATOS
.\deploy-windows.ps1 down
docker system prune -a --volumes
docker volume rm contaflow_postgres_data contaflow_redis_data
Remove-Item -Recurse -Force deploy\backups\*
.\deploy-windows.ps1 up
```

```bash
# Ubuntu: BORRA TODOS LOS DATOS
bash deploy-ubuntu.sh --stop
docker system prune -a --volumes
docker volume rm contaflow_postgres_data contaflow_redis_data
rm -f deploy/backups/*.sql.gz
bash deploy-ubuntu.sh --local
```

---

## Contacto y soporte

Si none de las soluciones anteriores funciona:

1. Guardá los logs completos: `.\deploy-windows.ps1 logs > logs-error.txt`
2. Guardá el estado: `docker compose ps > status-error.txt`
3. Guardá el `.env` (ocultando passwords): `copy .env .env-safe` (reemplazá passwords con XXXX)
4. Compartí esa información para diagnóstico
