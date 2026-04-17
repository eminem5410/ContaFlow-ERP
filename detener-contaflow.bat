@echo off
title ContaFlow ERP - Deteniendo servicios...

echo.
echo  ======================================================
echo            ContaFlow ERP - Detener servicios
echo  ======================================================
echo.

echo  [1/3] Verificando Docker Desktop...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [AVISO] Docker Desktop no esta corriendo.
    echo  No hay servicios activos para detener.
    echo.
    pause
    exit /b 0
)
echo         Docker Desktop: OK
echo.

echo  [2/3] Verificando servicios activos...
docker compose ps --quiet 2>nul | findstr /r "." >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo  No hay servicios de ContaFlow corriendo actualmente.
    echo.
    pause
    exit /b 0
)
echo.

docker compose ps

echo.
echo  [3/3] Deteniendo servicios...
echo.

set /p CLEANUP="  Deseas eliminar los datos tambien? (s/N): "
if /i "%CLEANUP%"=="s" (
    echo.
    echo  Deteniendo servicios y eliminando datos...
    echo  [!] Esto borrara TODOS los datos de la base de datos y cache.
    echo.
    docker compose down -v --remove-orphans
    echo.
    echo  ======================================================
    echo       Servicios detenidos y datos eliminados
    echo  ======================================================
) else (
    echo  Deteniendo servicios (los datos se conservan)...
    echo.
    docker compose down --remove-orphans
    echo.
    echo  ======================================================
    echo          Servicios detenidos correctamente
    echo       Los datos se conservan para la proxima vez
    echo  ======================================================
)

echo.
echo  Para iniciar nuevamente, ejecuta: iniciar-contaflow.bat
echo.
pause
