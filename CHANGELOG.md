# CHANGELOG - ContaFlow ERP

## v0.8.1 - 16/04/2026 (Patch Ubuntu)

### Bugs Resueltos
- DATABASE_URL en .env estaba en formato .NET (Host=postgres;Port=5432...) en vez de postgresql://. Prisma requiere postgresql://. Solucion: sed en .env + docker compose --force-recreate
- Tablas snake_case residuales (clients, providers, companies, etc) de un esquema anterior causaban confusion al listar. Solucion: DROP TABLE CASCADE de 8 tablas viejas
- create-tables.sql de Windows tenia tablas mezcladas (PascalCase + snake_case). Solucion: recrear SQL desde cero en Ubuntu con cat heredoc
- Contraseñas en DB en texto plano pero la app usa bcrypt. Solucion: generar hashes bcrypt desde el contenedor y actualizar con UPDATE
- JSON tabs en i18n (en.json, es.json, pt.json): Turbopack rechaza tabulaciones en JSON. Solucion: sed -i "s/\t/  /g" archivo.json
- Coma faltante en en.json despues de "profile": "Profile". Solucion: sed para agregar la coma
- Postgres inicia "unhealthy" porque otros contenedores intentan conectar antes de que esté listo. Solucion: docker compose restart despues de 30s
- docker compose exec sin -T falla con "cannot attach stdin to a TTY". Solucion: agregar flag -T cuando se usa con pipes/redireccion
- Tablas PascalCase en PostgreSQL necesitan comillas dobles para consultarlas: "\d Account" falla, SELECT FROM "Account" funciona

### Cambios Realizados
- Archivo: src/components/erp/AuthScreen.tsx - Agregado boton "Página principal" (onBack prop)
- Archivo: src/app/page.tsx - Conectado onBack en AuthScreen para volver al landing
- Archivo: src/i18n/locales/en.json - Agregada clave "goToLanding": "Home page"
- Archivo: src/i18n/locales/es.json - Agregada clave "goToLanding": "Pagina principal"
- Archivo: src/i18n/locales/pt.json - Agregada clave "goToLanding": "Pagina principal"
- Archivo: .env - Corregido DATABASE_URL a formato postgresql://
- Creado: iniciar.sh - Script para levantar todos los servicios
- Creado: detener.sh - Script para detener todos los servicios
- Creado: INSTALACION-UBUNTU.md - Guia de instalacion y comandos
- Creado: seed-datos-prueba.sql - Datos de prueba completos
- Creado: create-tables.sql - Schema SQL limpio con 15 tablas PascalCase

### Notas Tecnicas
- Las tablas NO usan @@map() en Prisma, se crean con nombres PascalCase en PostgreSQL
- Los nombres de columna usan camelCase (companyId, createdAt, etc)
- docker-compose.local.yml es el archivo compose a usar (no docker-compose.yml)
- Para cambios en .env que afectan Prisma: docker compose up -d --force-recreate (no basta con restart)
- apt default en Ubuntu 22.04 NO tiene docker-compose-plugin, hay que usar el repo oficial de Docker

### Datos de Prueba
- 40 cuentas contables (activo, pasivo, patrimonio, gasto, ingreso)
- 5 clientes: Garcia SA, Lopez Comercial, Martinez Ind., Rodriguez Constructora, Fernandez SP
- 5 proveedores: Distribuidora Nacional, Tech Solutions, Papelera del Sur, Transportes Ruta, Seguros La Boca
- 2 cuentas bancarias: Banco Nacion, Banco Provincia
- 7 facturas (5 venta, 2 compra) con 11 items
- 5 pagos (3 cobros, 2 pagos proveedores)
- 10 asientos contables con 37 lineas (apertura, ventas, cobros, compras, alquiler, sueldos)
- 10 registros de auditoria

### Usuarios de Prueba
- admin@empresademo.com.ar / admin123 (rol: admin)
- contador@empresademo.com.ar / contador123 (rol: contador)
- viewer@empresademo.com.ar / viewer123 (rol: viewer)

### Company
- Empresa Demo S.R.L. / ID: cmo0p45e00000lq01dnyoaj4b

## v0.8.0 - 15/04/2026

### Cambios
- Migracion del proyecto a Ubuntu 22.04 LTS
- Docker Compose v5.1.3 instalado desde repo oficial
- Build completo exitoso con 14/14 contenedores

### Bugs
- Docker se colgaba durante npm install/build en Windows
- npm install en Windows era lento y congelaba la PC

## v0.7.x - Sesiones previas

### Cambios
- Desarrollo de ContaFlow ERP multi-tenant
- Stack: Next.js 16 + TypeScript + Prisma 6 + PostgreSQL 16 + Redis 7 + .NET 8 + Docker Compose
- 9 contenedores: app, backend, postgres, redis, nginx, kafka, zookeeper, mailpit, pg-backup
- Sistema de autenticacion con 3 roles y 50 permisos
- i18n: espanol, ingles, portugues
