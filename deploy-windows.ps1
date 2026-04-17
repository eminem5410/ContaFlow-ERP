# ContaFlow ERP - Deploy Script para Windows (PowerShell)
# Requisitos:
#   - Docker Desktop para Windows instalado y corriendo
#   - Al menos 8GB de RAM disponibles (recomendado asignar 4GB a Docker)
#
# Uso:
#   .\deploy-windows.ps1 up            # Levantar todo (build + start)
#   .\deploy-windows.ps1 up -SkipNginx # Sin nginx (acceso directo a puertos)
#   .\deploy-windows.ps1 down          # Detener todo
#   .\deploy-windows.ps1 restart       # Reiniciar todo
#   .\deploy-windows.ps1 status        # Ver estado de servicios
#   .\deploy-windows.ps1 logs          # Ver logs en tiempo real
#   .\deploy-windows.ps1 backup        # Backup manual de PostgreSQL
#   .\deploy-windows.ps1 rebuild       # Rebuild de imagenes
#   .\deploy-windows.ps1 clean         # Limpiar imagenes/volumes viejos

param(
    [Parameter(Position=0, Mandatory=$false)]
    [ValidateSet("up", "down", "restart", "status", "logs", "backup", "rebuild", "clean")]
    [string]$Command = "up",

    [switch]$SkipNginx,

    [switch]$Help
)

# -- Config --
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }
$ComposeFile = Join-Path $ProjectRoot "docker-compose.local.yml"
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvTemplate = Join-Path $ProjectRoot ".env.local.template"
$BackupDir = Join-Path $ProjectRoot "deploy\backups"

# -- Helper Functions --

function Write-Logo {
    Write-Host ""
    Write-Host "  =============================================" -ForegroundColor Cyan
    Write-Host "    ContaFlow ERP - Local Deploy" -ForegroundColor Cyan
    Write-Host "    Windows + Docker Desktop" -ForegroundColor Cyan
    Write-Host "  =============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step($Message) {
    Write-Host "  [PASO] " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-Ok($Message) {
    Write-Host "  [OK]   " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warn($Message) {
    Write-Host "  [!]    " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Err($Message) {
    Write-Host "  [ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Test-Docker {
    Write-Step "Verificando Docker Desktop..."
    try {
        $null = docker info 2>&1
        Write-Ok "Docker Desktop esta corriendo"
        return $true
    } catch {
        Write-Err "Docker Desktop NO esta corriendo!"
        Write-Host ""
        Write-Host "  Abri Docker Desktop desde el menu Inicio y espera a que" -ForegroundColor Yellow
        Write-Host "  el icono de la ballena este verde en la barra de tareas." -ForegroundColor Yellow
        Write-Host "  Luego ejecuta este script de nuevo." -ForegroundColor Yellow
        Write-Host ""
        return $false
    }
}

function Test-DockerCompose {
    Write-Step "Verificando Docker Compose..."
    try {
        $version = docker compose version 2>&1
        Write-Ok "Docker Compose disponible: $version"
        return $true
    } catch {
        Write-Err "Docker Compose plugin no encontrado"
        Write-Host ""
        Write-Host "  Asegurate de tener Docker Desktop actualizado." -ForegroundColor Yellow
        Write-Host "  Descarga: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        return $false
    }
}

function Test-EnvFile {
    Write-Step "Verificando archivo .env..."
    if (-not (Test-Path $EnvFile)) {
        Write-Warn ".env no encontrado. Creando desde template..."
        if (Test-Path $EnvTemplate) {
            Copy-Item $EnvTemplate $EnvFile
            Write-Ok ".env creado desde .env.local.template"
            Write-Warn "Edita .env con tus valores antes de continuar!"
            Write-Host ""
            Write-Host "  notepad .env" -ForegroundColor Yellow
            Write-Host ""
            $response = Read-Host "  Queres editar el .env ahora? (S/N)"
            if ($response -match "^[Ss]") {
                notepad $EnvFile
            }
        } else {
            Write-Err ".env.local.template tampoco encontrado!"
            return $false
        }
    } else {
        Write-Ok ".env encontrado"
    }
    return $true
}

function New-Directories {
    Write-Step "Creando directorios necesarios..."
    $dirs = @(
        "deploy\backups",
        "deploy\nginx\logs",
        "deploy\ssl\certbot\conf",
        "deploy\ssl\certbot\www"
    )
    foreach ($dir in $dirs) {
        $fullPath = Join-Path $ProjectRoot $dir
        if (-not (Test-Path $fullPath)) {
            New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        }
    }
    Write-Ok "Directorios creados"
}

function Wait-Healthy {
    param(
        [string]$ContainerName,
        [int]$MaxWaitSeconds = 120
    )
    Write-Host "  Esperando a $ContainerName (max ${MaxWaitSeconds}s)... " -NoNewline
    $elapsed = 0
    while ($elapsed -lt $MaxWaitSeconds) {
        $status = docker inspect --format='{{.State.Health.Status}}' $ContainerName 2>$null
        if ($status -eq "healthy") {
            Write-Host "OK" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline
    }
    Write-Host "TIMEOUT" -ForegroundColor Yellow
    return $false
}

# -- Commands --

function Do-Up {
    Write-Logo

    # Pre-flight checks
    if (-not (Test-Docker)) { return }
    if (-not (Test-DockerCompose)) { return }
    if (-not (Test-EnvFile)) { return }

    New-Directories

    # Step 1: Build
    Write-Step "1/4 - Construyendo imagenes Docker..."
    Write-Host ""
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile build --progress plain 2>&1 | ForEach-Object { Write-Host $_ }
    $buildExitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldEA
    if ($buildExitCode -ne 0) {
        Write-Err "Build fallo!"
        return
    }
    Write-Ok "Imagenes construidas"
    Write-Host ""

    # Step 2: Start infrastructure
    Write-Step "2/4 - Iniciando servicios de infraestructura..."
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile up -d postgres redis zookeeper kafka 2>&1 | ForEach-Object { Write-Host $_ }
    $ErrorActionPreference = $oldEA
    Write-Host ""

    Wait-Healthy -ContainerName "contaflow-postgres" -MaxWaitSeconds 90

    # Step 3: Start app services
    Write-Step "3/4 - Iniciando aplicaciones..."
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile up -d backend app mailpit 2>&1 | ForEach-Object { Write-Host $_ }
    $ErrorActionPreference = $oldEA
    Write-Host ""

    Wait-Healthy -ContainerName "contaflow-backend" -MaxWaitSeconds 150

    # Step 4: Start nginx
    if (-not $SkipNginx) {
        Write-Step "4/4 - Iniciando Nginx reverse proxy..."
        $oldEA = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        docker compose -f $ComposeFile up -d nginx 2>&1 | ForEach-Object { Write-Host $_ }
        $ErrorActionPreference = $oldEA
        Write-Host ""

        Start-Sleep -Seconds 3
        Write-Ok "Nginx levantado"
    } else {
        Write-Step "4/4 - Nginx omitido (-SkipNginx)"
        Write-Host ""
    }

    # Final status
    Write-Step "Verificando estado final..."
    Write-Host ""
    Do-Status

    Write-Host ""
    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host "  DEPLOY EXITOSO!" -ForegroundColor Green
    Write-Host "  =============================================" -ForegroundColor Green
    Write-Host ""
    if ($SkipNginx) {
        Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
        Write-Host "  Backend:   http://localhost:8080" -ForegroundColor White
        Write-Host "  Swagger:   http://localhost:8080/swagger" -ForegroundColor White
    } else {
        Write-Host "  App:       http://localhost" -ForegroundColor White
        Write-Host "  Backend:   http://localhost/api/ via nginx" -ForegroundColor White
        Write-Host "  Swagger:   http://localhost/swagger" -ForegroundColor White
        Write-Host "  Mailpit:   http://localhost:8025 SMTP testing" -ForegroundColor White
    }
    Write-Host "  Mailpit Web: http://localhost:8025" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Comandos utiles:" -ForegroundColor Yellow
    Write-Host "    .\deploy-windows.ps1 status   # Ver estado" -ForegroundColor Gray
    Write-Host "    .\deploy-windows.ps1 logs     # Ver logs" -ForegroundColor Gray
    Write-Host "    .\deploy-windows.ps1 backup   # Backup DB" -ForegroundColor Gray
    Write-Host "    .\deploy-windows.ps1 down     # Detener todo" -ForegroundColor Gray
    Write-Host ""
}

function Do-Down {
    Write-Logo
    Write-Step "Deteniendo todos los servicios..."
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile down 2>&1
    $ErrorActionPreference = $oldEA
    Write-Ok "Todos los servicios detenidos"
    Write-Host ""
}

function Do-Restart {
    Write-Logo
    Write-Step "Reiniciando todos los servicios..."
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile restart 2>&1
    $ErrorActionPreference = $oldEA
    Start-Sleep -Seconds 5
    Write-Ok "Servicios reiniciados"
    Write-Host ""
    Do-Status
}

function Do-Status {
    Write-Host ""
    Write-Host "  +----------------------------------------------------+" -ForegroundColor White
    Write-Host "  |        ContaFlow ERP - Estado de Servicios         |" -ForegroundColor White
    Write-Host "  +----------------------------------------------------+" -ForegroundColor White

    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $services = docker compose -f $ComposeFile ps --format "table {{.Name}}`t{{.Status}}`t{{.Ports}}" 2>&1
    $services | ForEach-Object { Write-Host "  | $_" }
    $ErrorActionPreference = $oldEA

    Write-Host "  +----------------------------------------------------+" -ForegroundColor White
    Write-Host ""

    # Individual health checks
    $containers = @("contaflow-postgres", "contaflow-backend", "contaflow-redis")
    foreach ($c in $containers) {
        $health = docker inspect --format='{{.State.Health.Status}}' $c 2>$null
        if ($health) {
            $color = if ($health -eq "healthy") { "Green" } else { "Yellow" }
            Write-Host "  $c : " -NoNewline
            Write-Host "$health" -ForegroundColor $color
        }
    }
    Write-Host ""
}

function Do-Logs {
    Write-Logo
    Write-Step "Mostrando logs (Ctrl+C para salir)..."
    Write-Host ""
    docker compose -f $ComposeFile logs -f --tail=50 2>&1
}

function Do-Backup {
    Write-Logo

    if (-not (Test-Docker)) { return }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $BackupDir "contaflow_backup_${timestamp}.sql"

    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }

    Write-Step "Creando backup de PostgreSQL..."
    Write-Host ""

    # Run pg_dump via the postgres container
    docker exec contaflow-postgres pg_dump -U contaflow -d contaflow_erp --no-owner --no-privileges --format=plain 2>&1 | Out-File -FilePath $backupFile -Encoding UTF8

    if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile)) {
        $size = (Get-Item $backupFile).Length / 1KB
        $sizeStr = "{0:N1} KB" -f $size

        # Compress with PowerShell
        $compressedFile = "${backupFile}.gz"
        $inputStream = New-Object System.IO.FileStream($backupFile, [System.IO.FileMode]::Open)
        $outputStream = New-Object System.IO.FileStream($compressedFile, [System.IO.FileMode]::Create)
        $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, [System.IO.Compression.CompressionMode]::Compress)
        $inputStream.CopyTo($gzipStream)
        $gzipStream.Close()
        $outputStream.Close()
        $inputStream.Close()
        Remove-Item $backupFile -Force

        $compSize = (Get-Item $compressedFile).Length / 1KB
        $compSizeStr = "{0:N1} KB" -f $compSize

        Write-Ok "Backup completado: $compressedFile ($compSizeStr)"
        Write-Host ""
        Write-Host "  Backups existentes:" -ForegroundColor Yellow
        Get-ChildItem $BackupDir -Filter "contaflow_backup_*.sql.gz" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 5 |
            ForEach-Object {
                $s = "{0:N1} KB" -f ($_.Length / 1KB)
                Write-Host "    $($_.Name) ($s)" -ForegroundColor Gray
            }
        Write-Host ""
    } else {
        Write-Err "Backup fallo!"
        Write-Warn "Asegurate que el contenedor contaflow-postgres este corriendo"
    }
}

function Do-Rebuild {
    Write-Logo

    if (-not (Test-Docker)) { return }

    Write-Step "Reconstruyendo imagenes..."
    Write-Host ""
    $oldEA = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    docker compose -f $ComposeFile build --progress plain --no-cache backend app 2>&1 | ForEach-Object { Write-Host $_ }
    $ErrorActionPreference = $oldEA
    Write-Host ""
    Write-Ok "Rebuild completado!"
    Write-Warn "Ejecuta .\deploy-windows.ps1 restart para aplicar cambios"
    Write-Host ""
}

function Do-Clean {
    Write-Logo
    Write-Warn "Esto va a eliminar:"
    Write-Host "    - Imagenes Docker huerfanas" -ForegroundColor Gray
    Write-Host "    - Volumes sin usar" -ForegroundColor Gray
    Write-Host "    - Cache de build" -ForegroundColor Gray
    Write-Host "    - Backups mayores a 30 dias" -ForegroundColor Gray
    Write-Host ""

    $response = Read-Host "  Confirmar? (S/N)"
    if ($response -notmatch "^[Ss]") {
        Write-Ok "Cancelado"
        return
    }

    Write-Step "Limpiando imagenes huerfanas..."
    docker image prune -f 2>&1 | Out-Null

    Write-Step "Limpiando volumes sin usar..."
    docker volume prune -f 2>&1 | Out-Null

    Write-Step "Limpiando cache de build..."
    docker builder prune -f 2>&1 | Out-Null

    # Clean old backups
    Write-Step "Limpiando backups viejos..."
    if (Test-Path $BackupDir) {
        Get-ChildItem $BackupDir -Filter "contaflow_backup_*.sql.gz" |
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
            ForEach-Object {
                Remove-Item $_.FullName -Force
                Write-Host "    Eliminado: $($_.Name)" -ForegroundColor Gray
            }
    }

    Write-Ok "Limpieza completada!"
    Write-Host ""
}

# -- Main --

if ($Help) {
    Write-Logo
    Write-Host "  Uso: .\deploy-windows.ps1 [comando]" -ForegroundColor White
    Write-Host ""
    Write-Host "  Comandos:" -ForegroundColor Yellow
    Write-Host "    up              Levantar todo - build + start - default" -ForegroundColor Gray
    Write-Host "    up -SkipNginx  Sin nginx - puertos directos" -ForegroundColor Gray
    Write-Host "    down            Detener todos los servicios" -ForegroundColor Gray
    Write-Host "    restart         Reiniciar servicios" -ForegroundColor Gray
    Write-Host "    status          Ver estado de servicios" -ForegroundColor Gray
    Write-Host "    logs            Ver logs en tiempo real" -ForegroundColor Gray
    Write-Host "    backup          Backup manual de PostgreSQL" -ForegroundColor Gray
    Write-Host "    rebuild         Rebuild de imagenes - no cache" -ForegroundColor Gray
    Write-Host "    clean           Limpiar imagenes/volumes/backup viejos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Requisitos:" -ForegroundColor Yellow
    Write-Host "    - Docker Desktop para Windows" -ForegroundColor Gray
    Write-Host "    - Minimo 8GB RAM - 4GB para Docker" -ForegroundColor Gray
    Write-Host "    - PowerShell 5.1 o superior" -ForegroundColor Gray
    Write-Host ""
    return
}

Set-Location $ProjectRoot

switch ($Command) {
    "up"      { Do-Up }
    "down"    { Do-Down }
    "restart" { Do-Restart }
    "status"  { Do-Status }
    "logs"    { Do-Logs }
    "backup"  { Do-Backup }
    "rebuild" { Do-Rebuild }
    "clean"   { Do-Clean }
}
