# ContaFlow ERP — Guía de Instalación en Ubuntu (VPS / Servidor Local)

## Requisitos previos

### Hardware mínimo recomendado

| Componente | Mínimo | Recomendado |
|---|---|---|
| **Procesador** | 1 vCPU | 2 vCPU |
| **RAM** | 2 GB | 4 GB |
| **Disco** | 20 GB SSD | 40 GB SSD |
| **Sistema** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Software necesario

No necesitás instalar nada manualmente. El script `deploy-ubuntu.sh` se encarga de todo:

- Docker CE + Docker Compose plugin
- Git, curl, wget
- Firewall (UFW)
- Fail2Ban (protección anti-brute-force)
- Logrotate (rotación de logs de Docker)
- Ajustes de kernel para rendimiento

---

## Pasos de instalación

### Paso 1 — Instalar Ubuntu

Si estás instalando en el disco M2 nuevo:

1. Descargá Ubuntu Server 24.04 LTS desde: https://ubuntu.com/download/server
2. Creá un USB booteable con Rufus o BalenaEtcher
3. Instalá Ubuntu con las opciones por defecto
4. Durante la instalación, marcá "Install OpenSSH server" para poder acceder remotamente
5. Anotá la IP que te asigna (o configurá una IP fija en tu router)

### Paso 2 — Configurar acceso SSH (recomendado)

Desde tu PC con Windows, abrí PowerShell:

```powershell
ssh tu-usuario@IP-DEL-SERVIDOR
```

La primera vez te preguntará si confías en el fingerprint. Escribí `yes` y enter.

### Paso 3 — Instalar dependencias del servidor

Conectado por SSH al servidor, ejecutá:

```bash
# Descargar el proyecto (si tenes un repo de Git)
git clone <URL-DE-TU-REPO> /opt/contaflow
cd /opt/contaflow

# O copiar los archivos desde tu PC
# scp -r ContaFlow-ERP-deploy-windows.tar.gz tu-usuario@IP-DEL-SERVIDOR:/opt/
# ssh tu-usuario@IP-DEL-SERVIDOR
# cd /opt && tar xzf ContaFlow-ERP-deploy-windows.tar.gz && cd contaflow
```

Instalá las dependencias base del servidor:

```bash
chmod +x deploy/scripts/install-deps.sh
sudo bash deploy/scripts/install-deps.sh
```

Este script instala y configura:

- **Docker CE + Docker Compose** — Motor de contenedores
- **UFW Firewall** — Abre solo puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Fail2Ban** — Bloquea IPs con intentos de login fallidos
- **Swap** — Crea swap file si la RAM es menor a 4 GB (previene out-of-memory)
- **Logrotate** — Rota logs de Docker (evita que llenen el disco)
- **Kernel tuning** — Aumenta conexiones simultáneas, file descriptors, etc.

### Paso 4 — Configurar variables de entorno

```bash
# Para deploy local (sin dominio, HTTP only)
cp .env.local.template .env

# Para producción (con dominio y SSL)
cp .env.production .env
```

Editá el archivo con tus valores reales:

```bash
nano .env
```

Si es para **producción con dominio**, cambiá OBLIGATORIAMENTE estos valores:

```bash
# Tu dominio real
DOMAIN=tudominio.com.ar

# Contraseña fuerte para PostgreSQL (mínimo 16 caracteres)
POSTGRES_PASSWORD=TU_PASSWORD_MUY_SEGURA_AQUI_2024

# JWT Key (generá una con: openssl rand -base64 48)
JWT_KEY=TU_JWT_KEY_GENERADO_AQUI_MIN_32_CHARS

# Contraseña para Redis
REDIS_PASSWORD=TU_PASSWORD_REDIS_AQUI

# SMTP real para envío de emails
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=TU_SMTP_API_KEY

# CORS con tu dominio real
CORS_ALLOWED_ORIGINS=https://tudominio.com.ar
```

### Paso 5 — Deploy local (sin dominio, para pruebas)

Si estás probando en un servidor local sin dominio configurado:

```bash
chmod +x deploy-ubuntu.sh
bash deploy-ubuntu.sh --local
```

Esto levanta todo en HTTP (puerto 80), con Mailpit para testing de emails y backups automáticos.

Accedé desde tu navegador: http://IP-DEL-SERVIDOR

### Paso 6 — Deploy de producción (con dominio y SSL)

Antes de ejecutar el deploy de producción, necesitás:

1. **Un dominio** apuntando a la IP de tu servidor (registro A en DNS)
2. **Puertos 80 y 443 abiertos** en tu router/firewall

```bash
# Verificar que los puertos están abiertos
sudo ufw status
# Deberías ver: 22, 80, 443 ALLOW

# Ejecutar deploy completo
bash deploy-ubuntu.sh
```

El deploy de producción hace lo siguiente automáticamente:

1. Crea los directorios necesarios
2. Construye las imágenes Docker
3. Inicia PostgreSQL, Redis, Kafka, Zookeeper
4. Inicia el backend .NET y el frontend Next.js
5. Crea un certificado SSL temporal autofirmado
6. Inicia Nginx con el cert temporal
7. Intenta obtener un certificado SSL real de Let's Encrypt
8. Si lo logra, reinicia Nginx con el cert real (HTTPS)

Si el certificado SSL no se obtiene (porque el DNS aún no propaga), el sistema queda en HTTP. Cuando el DNS propague, ejecutá:

```bash
bash deploy-ubuntu.sh --ssl-only
```

### Paso 7 — Configurar DNS

En tu registrador de dominios (Nic.ar, DonWeb, Namecheap, etc.):

| Tipo | Nombre | Valor |
|---|---|---|
| A | @ | IP-DE-TU-SERVIDOR |
| A | www | IP-DE-TU-SERVIDOR |

La propagación DNS puede tardar entre 5 minutos y 48 horas (generalmente menos de 1 hora).

### Paso 8 — Verificar SSL

```bash
# Verificar que el certificado se obtuvo correctamente
sudo ls -la deploy/ssl/certbot/conf/live/tudominio.com.ar/

# Verificar la fecha de expiración
sudo openssl x509 -in deploy/ssl/certbot/conf/live/tudominio.com.ar/fullchain.pem -noout -dates

# Probar desde tu PC
curl -I https://tudominio.com.ar
```

Deberías ver `200 OK` y los headers con `strict-transport-security`.

---

## Comandos de uso diario

```bash
# Ver estado de servicios
bash deploy-ubuntu.sh --status

# Ver logs en tiempo real (Ctrl+C para salir)
bash deploy-ubuntu.sh --logs

# Reiniciar servicios
bash deploy-ubuntu.sh --restart

# Detener todo
bash deploy-ubuntu.sh --stop

# Levantar de nuevo
bash deploy-ubuntu.sh

# Backup manual de la base de datos
bash deploy-ubuntu.sh --backup

# Actualizar el sistema (pull + rebuild + restart)
bash deploy-ubuntu.sh --update

# Renovar/configurar SSL
bash deploy-ubuntu.sh --ssl-only
```

---

## Backup y Restore

### Backups automáticos

Los backups automáticos corren en un contenedor dedicado:

- **Producción**: Todos los días a las 3:00 AM, retiene 30 días
- **Local**: Cada 6 horas, retiene 7 días

Los backups se guardan en `deploy/backups/` como archivos `.sql.gz`.

### Backup manual

```bash
bash deploy-ubuntu.sh --backup
```

### Restaurar un backup

```bash
# Listar backups disponibles
ls -lh deploy/backups/

# Restaurar un backup específico
bash deploy/scripts/restore-pg.sh deploy/backups/contaflow_contaflow_erp_20250415_030000.sql.gz
```

Advertencia: `restore-pg.sh` borra la base de datos actual y la reemplaza con el backup.

### Copiar backups a otra máquina

```bash
# Desde tu PC con Windows (PowerShell)
scp tu-usuario@IP-DEL-SERVIDOR:/opt/contaflow/deploy/backups/contaflow_*.sql.gz C:\Backups\
```

---

## Seguridad

### Firewall (UFW)

El script `install-deps.sh` configura el firewall automáticamente:

```
Puerto 22 (SSH)    — ALLOW
Puerto 80 (HTTP)   — ALLOW
Puerto 443 (HTTPS) — ALLOW
Todo lo demás       — DENY
```

Para ver el estado:

```bash
sudo ufw status verbose
```

### Fail2Ban

Protege contra ataques de fuerza bruta:

- **SSH**: Bloquea después de 3 intentos fallidos (baneo 24 horas)
- **Nginx auth**: Bloquea después de 5 intentos fallidos
- **Nginx rate limit**: Bloquea después de 10 excesos de rate limit

Para ver IPs baneadas:

```bash
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth
```

### Actualizaciones de seguridad

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Actualizar Docker
sudo apt-get install --only-upgrade docker-ce docker-ce-cli containerd.io

# Reiniciar servicios
bash deploy-ubuntu.sh --restart
```

---

## Monitoreo básico

### Ver uso de recursos

```bash
# CPU, RAM, discos
htop

# Uso de disco
df -h

# Uso de Docker
docker stats

# Logs de un contenedor específico
docker logs contaflow-backend --tail 100 -f
docker logs contaflow-app --tail 100 -f
docker logs contaflow-postgres --tail 100 -f
```

### Health checks

```bash
# Backend health (debería responder 200)
curl http://localhost:8080/health/ready

# Via Nginx (desde afuera)
curl https://tudominio.com.ar/health/ready
```

---

## Migración de Windows a Ubuntu

Si ya probaste el deploy en Windows, la migración es directa:

1. Copiá los archivos del proyecto al servidor Ubuntu
2. Copiá el `.env` (o crealo desde el template)
3. Exportá el backup de PostgreSQL desde Windows y restauralo en Ubuntu:

```bash
# Desde Windows: generar backup
.\deploy-windows.ps1 backup

# Copiar al servidor
scp deploy\backups\contaflow_*.sql.gz tu-usuario@IP:/opt/contaflow/deploy/backups/

# En Ubuntu: restaurar
bash deploy/scripts/restore-pg.sh deploy/backups/contaflow_backup_XXXXXXXX_XXXXXX.sql.gz

# Levantar
bash deploy-ubuntu.sh --local
```

Los mismos Dockerfiles, el mismo docker-compose, las mismas imágenes. Solo cambian las credenciales del `.env` y el certificado SSL.
