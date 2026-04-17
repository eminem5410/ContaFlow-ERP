@echo off
title ContaFlow ERP - Iniciando servicios...

echo.
echo  ======================================================
echo            ContaFlow ERP - Inicio de servicios
echo  ======================================================
echo.

echo  [1/4] Verificando Docker Desktop...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Docker Desktop no esta corriendo.
    echo  Por favor, abri Docker Desktop y espera a que este listo.
    echo  Luego ejecuta este script nuevamente.
    echo.
    pause
    exit /b 1
)
echo         Docker Desktop: OK
echo.

echo  [2/4] Verificando archivos de configuracion...
if not exist "docker-compose.yml" (
    echo  [ERROR] No se encontro docker-compose.yml en el directorio actual.
    echo  Asegurate de ejecutar este script desde la raiz del proyecto.
    echo.
    pause
    exit /b 1
)
echo         Archivos encontrados: OK
echo.

echo  [3/4] Iniciando servicios Docker...
echo  (Esto puede tardar unos minutos la primera vez)
echo.

docker compose up -d --build

if %ERRORLEVEL% neq 0 (
    echo.
    echo  [ERROR] Hubo un error al iniciar los servicios.
    echo  Revisa los mensajes de error arriba.
    echo.
    pause
    exit /b 1
)

echo.
echo  [4/4] Verificando estado de servicios...
echo.
timeout /t 5 /nobreak >nul 2>&1

docker compose ps

echo.
echo  ======================================================
echo               Servicios iniciados!
echo  ======================================================
echo.
echo    Frontend (Next.js):  http://localhost:3000
echo    Backend  (.NET API): http://localhost:8080
echo    Swagger:             http://localhost:8080/swagger
echo    Mailpit (SMTP):      http://localhost:8025
echo.
echo  ======================================================
echo.
echo  Presiona cualquier tecla para abrir el navegador...
pause >nul

start http://localhost:3000
