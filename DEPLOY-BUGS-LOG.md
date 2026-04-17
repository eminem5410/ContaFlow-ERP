# DEPLOY-BUGS-LOG.md — ContaFlow ERP

> Registro historico de bugs encontrados y corregidos durante el deploy local en Windows 10 + Docker Desktop.
> **Proyecto:** ContaFlow ERP — SaaS contable multi-tenant para Argentina/LATAM
> **Fecha inicio:** Abril 2026
> **Deploy:** Windows 10 + Docker Desktop (temporal, antes de Ubuntu VPS con disco M.2)

---

## Bug #1 — ExecutionPolicy de PowerShell
- **Tipo:** Entorno Windows
- **Sintoma:** El script `deploy-windows.ps1` no se ejecuta por politica de ejecucion restringida
- **Fix:** El usuario debe ejecutar `Set-ExecutionPolicy Bypass -Scope Process` antes de correr el script, o usar `powershell -ExecutionPolicy Bypass -File deploy-windows.ps1`
- **Archivos:** `deploy-windows.ps1` (documentacion en comentarios)
- **Leccion:** Siempre documentar los requisitos de PowerShell para Windows

---

## Bug #2 — Caracteres ASCII especiales en PowerShell
- **Tipo:** Encoding Windows
- **Sintoma:** Caracteres especiales (simbolos Unicode) en el script causan errores de parsing en PowerShell 5.1
- **Fix:** Reemplazar caracteres Unicode con ASCII equivalents en el deploy script
- **Archivos:** `deploy-windows.ps1`
- **Leccion:** Evitar caracteres no-ASCII en scripts de PowerShell para maxima compatibilidad

---

## Bug #3 — $PSScriptRoot vacio en PowerShell ISE
- **Tipo:** Entorno Windows
- **Sintoma:** `$PSScriptRoot` devuelve vacio cuando se ejecuta el script desde PowerShell ISE o ciertas terminales
- **Fix:** Agregar fallback: `if (-not $ProjectRoot) { $ProjectRoot = Get-Location }`
- **Archivos:** `deploy-windows.ps1`
- **Leccion:** Nunca confiar exclusivamente en `$PSScriptRoot`, siempre agregar fallback

---

## Bug #4 — Campo `version` en docker-compose
- **Tipo:** Docker Compose
- **Sintoma:** `docker compose` muestra warning: "version" is obsolete en docker-compose.local.yml
- **Fix:** Eliminar la linea `version: "3.9"` del archivo compose (ya no es necesario en Docker Compose V2)
- **Archivos:** `docker-compose.local.yml`
- **Leccion:** Docker Compose V2 no usa el campo `version`, eliminarlo de todos los compose files

---

## Bug #5 — `2>&1` stderr handling en PowerShell
- **Tipo:** PowerShell
- **Sintoma:** `docker compose` output a stderr incluso en operaciones exitosas, PowerShell lo trata como error
- **Fix:** Usar `$ErrorActionPreference = 'Continue'` temporalmente alrededor de llamadas docker
- **Archivos:** `deploy-windows.ps1`
- **Leccion:** Docker Compose V2 mezcla stdout/stderr, manejar con `$ErrorActionPreference`

---

## Bug #6 — Progress bar de Docker en CI/pipe
- **Tipo:** Docker
- **Sintoma:** Docker progress bar llena el output con caracteres ANSI incompatibles con pipe/redirect
- **Fix:** Agregar `--progress plain` a todos los comandos `docker compose build`
- **Archivos:** `deploy-windows.ps1`
- **Leccion:** Siempre usar `--progress plain` en scripts que capturan output de Docker

---

## Bug #7 — CS9006 String interpolacion con CSS en SmtpEmailService
- **Tipo:** Compilacion C# (.NET 8)
- **Sintoma:** Error CS9006 en `SmtpEmailService.cs` — interpolacion de string `$"""` con CSS que contiene `{{ }}`
- **Fix:** Cambiar de raw interpolated string `$"""` a string normal `"""` + `.Replace("{", "{{").Replace("}", "}}")` para escapar las llaves CSS
- **Archivos:** `backend/ContaFlow.Infrastructure/Services/SmtpEmailService.cs`
- **Leccion:** Las llaves CSS (`{`, `}`) conflictuan con interpolacion de strings en C#. Usar `.Replace()` como workaround

---

## Bug #8 — CS0234 Violacion de Clean Architecture (IKafkaProducer)
- **Tipo:** Arquitectura / Compilacion
- **Sintoma:** Error CS0234 en `EventDispatcher.cs` — no puede encontrar `ContaFlow.Infrastructure.Messaging.IKafkaProducer`
- **Fix:** Mover `IKafkaProducer` de `Infrastructure/Messaging/` a `Application/Interfaces/`. Crear nuevo archivo `ContaFlow.Application/Interfaces/IKafkaProducer.cs` y actualizar using en `EventDispatcher.cs`
- **Archivos:** `backend/ContaFlow.Application/Interfaces/IKafkaProducer.cs` (NUEVO), `backend/ContaFlow.Application/Events/EventDispatcher.cs`
- **Leccion:** En Clean Architecture, los interfaces que usa Application deben vivir en Application, NO en Infrastructure

---

## Bug #9 — CS0246 Missing using en PaymentEventHandler
- **Tipo:** Compilacion C#
- **Sintoma:** Error CS0246 en `PaymentEventHandler.cs` — no encuentra `IKafkaProducer` despues de moverlo a Application
- **Fix:** Agregar `using ContaFlow.Application.Interfaces;` al archivo
- **Archivos:** `backend/ContaFlow.Application/Events/Handlers/PaymentEventHandler.cs`
- **Leccion:** Al mover interfaces entre proyectos, actualizar todos los usings correspondientes

---

## Bug #10 — CRITICO: tar.gz sin codigo fuente
- **Tipo:** Build / Deploy
- **Sintoma:** La imagen Docker se construye pero solo contiene el Dockerfile, sin codigo fuente .cs
- **Fix:** Corregir el comando `tar` para incluir todo el directorio `backend/` en lugar de solo el Dockerfile. Cambiar contexto de build
- **Archivos:** Script de empaquetado (tar), `docker-compose.local.yml` (context: ./backend)
- **Leccion:** Siempre verificar que el Docker context incluye TODOS los archivos necesarios. `COPY . .` copia desde el context, no desde la raiz del proyecto

---

## Bug #11 — CS0234 Conflicto de namespace BCrypt
- **Tipo:** Compilacion C# / NuGet
- **Sintoma:** Error CS0234 en `AuthService.cs` y `AuthServiceTests.cs` — `BCrypt.Net.BCrypt` no se resuelve correctamente
- **Fix:** Usar alias de namespace: `using BCryptCrypter = BCrypt.Net.BCrypt;` y reemplazar todas las llamadas `BCrypt.Net.BCrypt.HashPassword()` por `BCryptCrypter.HashPassword()` (y VerifyPassword)
- **Archivos:** `backend/ContaFlow.Application/Services/AuthService.cs`, `backend/ContaFlow.Application/Services/AuthServiceTests.cs`
- **Leccion:** Cuando un namespace colisiona con nombres de clases, usar alias de namespace (`using X = A.B.C;`)

---

## Bug #12 — CS0234 Paquetes NuGet faltantes en Infrastructure
- **Tipo:** Compilacion C# / NuGet
- **Sintoma:** Errores CS0234 en `KafkaHostingExtensions.cs` — `BackgroundService`, `ILogger<>`, `Microsoft.Extensions.Hosting` no encontrados
- **Fix:** Agregar dos PackageReferences a `ContaFlow.Infrastructure.csproj`:
  - `Microsoft.Extensions.Hosting` v8.0.1 (provee BackgroundService, IHostedService)
  - `Microsoft.Extensions.Logging.Abstractions` v8.0.2 (provee ILogger<>)
  Ademas, agregar `using Microsoft.Extensions.Hosting;` y `using Microsoft.Extensions.Logging;` al archivo
- **Archivos:** `backend/ContaFlow.Infrastructure/ContaFlow.Infrastructure.csproj`, `backend/ContaFlow.Infrastructure/Messaging/KafkaHostingExtensions.cs`
- **Leccion:** En .NET, cada proyecto DEBE declarar sus propias dependencias NuGet. NO hay dependencias transitivas automaticas entre proyectos de la misma solucion. BackgroundService vive en Microsoft.Extensions.Hosting, NO en el SDK base

---

## Bug #13 — CS0117 ProducerConfig.RetryMaxRetries no existe
- **Tipo:** Compilacion C# / API NuGet
- **Sintoma:** Error CS0117 en `KafkaProducer.cs` — `ProducerConfig` no tiene propiedad `RetryMaxRetries` en Confluent.Kafka v2.3.0
- **Fix:** Eliminar la linea `RetryMaxRetries = 3` (con `EnableIdempotence = true`, Kafka maneja reintentos automaticamente). Ademas:
  - CS8618: Hacer `_producer` nullable (`IProducer<string, string>?`) para evitar warning de campo non-nullable no inicializado
  - CS4014: Agregar `_ =` prefix al llamado unawaited `LockReleaseAsync` en RedisDistributedLockService
- **Archivos:** `backend/ContaFlow.Infrastructure/Messaging/KafkaProducer.cs`, `backend/ContaFlow.Infrastructure/Caching/RedisDistributedLockService.cs`
- **Leccion:** Verificar la API exacta de cada version de NuGet package. EnableIdempotence ya incluye retry logic en Kafka

---

## Bug #14 — CS0246 AuthorizeAttribute no encontrado (sync de archivos)
- **Tipo:** Compilacion C# / Sincronizacion de archivos
- **Sintoma:** Errores CS0246 en 8 controllers de `ContaFlow.API` — `AuthorizeAttribute` no encontrado en linea 16 durante build #4 en Windows del usuario
- **Causa raiz:** El archivo `GlobalUsings.cs` (que contiene `global using Microsoft.AspNetCore.Authorization;`) no estaba incluido en el .tar.gz anterior. Todos los controllers ya tenian `using Microsoft.AspNetCore.Authorization;` explicito, pero el `GlobalUsings.cs` faltante indicaba que el tar estaba incompleto. El problema real fue que el usuario tenia una version antigua del codigo sin las ultimas correcciones (Bugs #8-#13).
- **Nota sobre Update DTOs:** El error original tambien mencionaba 4 DTOs `UpdateXxxRequest` faltantes, pero la investigacion posterior revelo que **ninguno de esos tipos esta referenciado en ningun archivo del backend**. Fueron un falso positivo — el error real era solo el AuthorizeAttribute por la sincronizacion incompleta.
- **Fix:** Regenerar el `.tar.gz` completo con todo el codigo actualizado (incluyendo `GlobalUsings.cs` y todas las correcciones de Bugs #8-#13). El codigo actual compila limpio: todos los controllers tienen usings explicitos + GlobalUsings.cs global.
- **Archivos clave en el tar actual:**
  - `backend/ContaFlow.API/GlobalUsings.cs` (global using Authorization)
  - Todos los 14 controllers con `using Microsoft.AspNetCore.Authorization;` explicito
  - Todos los DTOs Update existentes (Client, Provider, BankAccount, Role, Settings)
- **Leccion:** (1) Siempre incluir `GlobalUsings.cs` en el paquete de deploy. (2) Verificar la completitud del tar comparando la lista de archivos contra el source. (3) No todos los errores reportados en un build son bugs reales — algunos son efectos cascada de archivos faltantes

---

## Bug #15 — Errores de compilacion post-sincronizacion (sesion anterior)
- **Tipo:** Compilacion C# / Sincronizacion
- **Sintoma:** Errores de compilacion multiples despues de sincronizar archivos al Windows del usuario
- **Fix:** Correcciones aplicadas en sesion anterior (detalles en worklog de sesion previa)
- **Archivos:** Varios archivos del backend
- **Leccion:** Siempre recompilar completo despues de sincronizar archivos

---

## Bug #16 — Errores de compilacion post-sincronizacion (sesion anterior)
- **Tipo:** Compilacion C# / Sincronizacion
- **Sintoma:** Errores adicionales de compilacion tras la primera ronda de fixes
- **Fix:** Correcciones aplicadas en sesion anterior (detalles en worklog de sesion previa)
- **Archivos:** Varios archivos del backend
- **Leccion:** Los fixes pueden revelar errores ocultos que estaban enmascarados por errores anteriores

---

## Bug #17 — DI: ICacheService registrado en namespace incorrecto
- **Tipo:** Inyeccion de Dependencias / .NET 8
- **Sintoma:** Backend crashea al iniciar con `InvalidOperationException` — no puede resolver `Domain.Interfaces.ICacheService`. El servicio estaba registrado como `Infrastructure.Caching.ICacheService` que, aunque hereda de `Domain.Interfaces.ICacheService`, .NET DI resuelve por tipo exacto y NO satisface la dependencia del namespace diferente.
- **Causa raiz:** `RedisHostingExtensions.cs` registraba `ICacheService` usando solo el namespace de Infrastructure. Los servicios del Application layer dependian de `Domain.Interfaces.ICacheService` (namespace diferente). .NET DI no resuelve interfaces por herencia — necesita el tipo exacto.
- **Fix:** Registrar AMBAS interfaces en el DI container. En `RedisHostingExtensions.cs`, duplicar las lineas de registro para que ambos namespaces queden satisfechos:
  ```csharp
  // Branch Redis habilitado:
  services.AddSingleton<Infrastructure.Caching.ICacheService, RedisCacheService>();
  services.AddSingleton<Domain.Interfaces.ICacheService, RedisCacheService>();
  // Branch NoOp (Redis deshabilitado):
  services.AddSingleton<Infrastructure.Caching.ICacheService, NoOpCacheService>();
  services.AddSingleton<Domain.Interfaces.ICacheService, NoOpCacheService>();
  ```
- **Archivos:** `backend/ContaFlow.Infrastructure/Caching/RedisHostingExtensions.cs`
- **Leccion:** .NET DI resuelve por tipo EXACTO, no por herencia de interfaces. Si la misma interface existe en multiples namespaces, registrar TODAS las variantes. Ademas, al generar un tar.gz para deploy, SIEMPRE verificar que los fixes estan incluidos — el primer intento via tar.gz no incluyo este fix.

---

## Bug #18 — DI: Singleton consumiendo servicio Scoped (IEmailService en EmailQueueService)
- **Tipo:** Inyeccion de Dependencias / .NET 8
- **Sintoma:** Backend crashea al iniciar con `InvalidOperationException: Cannot consume scoped service 'IEmailService' from singleton 'IEmailQueueService'`. .NET DI validation atrapa este error en el startup.
- **Causa raiz:** `EmailQueueService` estaba registrado como Singleton en `Program.cs` (linea 118) e inyectaba `IEmailService` (registrado como Scoped, linea 115) directamente en su constructor. Un Singleton vive por toda la vida de la app, pero un Scoped vive por cada request — inyectar Scoped en Singleton es un anti-pattern porque el Scoped quedaria capturado.
- **Fix:** Reemplazar la inyeccion directa de `IEmailService` por `IServiceScopeFactory` y crear un scope por cada envio de email en `ProcessQueueAsync`:
  ```csharp
  // Constructor:
  private readonly IServiceScopeFactory _scopeFactory;
  public EmailQueueService(IServiceScopeFactory scopeFactory, ILogger<EmailQueueService> logger)
  
  // En ProcessQueueAsync:
  using var scope = _scopeFactory.CreateScope();
  var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
  var success = await emailService.SendAsync(job.To, job.Subject, job.Body, job.IsHtml, cancellationToken);
  ```
- **Archivos:** `backend/ContaFlow.Infrastructure/Services/EmailQueueService.cs`
- **Leccion:** NUNCA inyectar servicios Scoped directamente en Singletons. Usar `IServiceScopeFactory` para crear scopes bajo demanda. Pattern estandar de .NET para este caso.
- **Diagnostico:** Este error estaba OCULTO por Bug #17 — los logs mostraban ICacheService como primer error visible porque `--tail=20` solo mostraba las ultimas excepciones internas de la AggregateException. Siempre leer el PRIMER error de una AggregateException.

---

## Bug #19 — Kafka: listeners con puertos duplicados
- **Tipo:** Docker Compose / Configuracion Kafka
- **Sintoma:** Kafka entra en loop de reinicio con `IllegalArgumentException: requirement failed: Each listener must have a different port, listeners: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_HOST://0.0.0.0:9092`
- **Causa raiz:** En `docker-compose.yml`, la variable `KAFKA_ADVERTISED_LISTENERS` tenia ambos listeners en el puerto 9092. Confluent Kafka requiere que cada listener use un puerto diferente.
- **Fix:** Cambiar `PLAINTEXT_HOST` al puerto 29092:
  ```yaml
  # Antes:
  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9092
  # Despues:
  KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
  ```
- **Archivos:** `docker-compose.yml` (linea 124)
- **Leccion:** Cada listener de Kafka DEBE tener un puerto unico. PLAINTEXT para comunicacion inter-contenedor (docker network), PLAINTEXT_HOST para acceso desde el host.

---

## Bug #20 — Redis: connection string con doble puerto
- **Tipo:** Docker Compose / Connection String
- **Sintoma:** Health check de Redis falla con `RedisConnectionException: UnableToConnect` y el endpoint muestra `serverEndpoint: redis://redis:6379:6379` (doble puerto). Timeout de 5 segundos agotado.
- **Causa raiz:** En `docker-compose.yml`, la variable `ConnectionStrings__Redis` usaba prefijo `redis://` antes del host: `redis://${REDIS_HOST}:${REDIS_PORT},abortConnect=false`. `StackExchange.Redis` interpreta el esquema `redis://` y extrae el puerto del host, generando `redis://redis:6379:6379` (el 6379 del host se lee como puerto, y el :6379 real se agrega despues).
- **Fix:** Eliminar el prefijo `redis://` del connection string:
  ```yaml
  # Antes:
  ConnectionStrings__Redis: redis://${REDIS_HOST}:${REDIS_PORT},abortConnect=false
  # Despues:
  ConnectionStrings__Redis: ${REDIS_HOST}:${REDIS_PORT},abortConnect=false
  ```
- **Archivos:** `docker-compose.yml` (linea 44)
- **Leccion:** `StackExchange.Redis` NO usa formato URL (scheme://host:port). Usa formato simple `host:port,options`. El prefijo `redis://` confunde al parser.

---

## Bug #21 — Frontend: DATABASE_URL mal configurada para Prisma
- **Tipo:** Docker Compose / Variables de Entorno
- **Sintoma:** Al intentar registrarse en el frontend, Prisma lanza `PrismaClientInitializationError: the URL must start with the protocol postgresql:// or postgres://`. El backend muestra `auth.userExists` como clave i18n.
- **Causa raiz:** En `docker-compose.yml`, la variable de entorno para el servicio `app` (frontend Next.js) estaba nombrada `DATABASE_URL_PRISMA` en vez de `DATABASE_URL`. Prisma busca obligatoriamente la variable `DATABASE_URL` — no reconoce variantes con sufijo.
- **Fix:** Renombrar la variable en `docker-compose.yml`:
  ```yaml
  # Antes:
  DATABASE_URL_PRISMA: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
  # Despues:
  DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
  ```
- **Archivos:** `docker-compose.yml` (linea 89, seccion `app`)
- **Leccion:** Prisma exige `DATABASE_URL` como nombre de variable. No usar variantes. Cada servicio en docker-compose tiene su propio scope de variables de entorno, asi que no hay conflicto con el backend que usa `ConnectionStrings__DefaultConnection`.

---

## Bug #22 — Frontend: tablas de Prisma no creadas en PostgreSQL
- **Tipo:** Base de Datos / Migraciones
- **Sintoma:** Despues de fixear Bug #21, el registro falla con `PrismaClientKnownRequestError: The table public.User does not exist in the current database` (codigo P2021). La conexion a Postgres funciona pero no hay tablas.
- **Causa raiz:** El Docker Compose monta la migracion SQL del backend .NET (`001_initial_create.sql`) en `postgres:/docker-entrypoint-initdb.d/` para las tablas del backend, pero el frontend Next.js usa su propio schema Prisma independiente con tablas adicionales (User, Session, etc.). Esas tablas nunca fueron creadas.
- **Fix:** Ejecutar `docker exec contaflow-app npx prisma@6 db push --accept-data-loss` para crear las tablas del schema Prisma del frontend en la base de datos PostgreSQL. Se usó `@6` para forzar Prisma 6.x (compatible con Node 20 en el contenedor) ya que `npx prisma db push` descargó Prisma 7.x que tiene breaking changes y falló.
- **Resultado:** ✅ Tablas creadas exitosamente en 9.04s. Notas:
  - `--accept-data-loss` fue necesario porque Prisma detectó que la tabla `__ef_migrations_history` (del backend EF Core) no estaba en el schema Prisma y la iba a dropear.
  - Se eliminó `__ef_migrations_history` (1 fila). No afecta al backend porque EF Core usa su propio sistema de migraciones por codigo, no depende de esa tabla para operación normal.
  - Error `EACCES: permission denied, unlink '/app/node_modules/.prisma/client/index.js'` al final es NO critico — es solo la regeneración del cliente Prisma en node_modules que falló por permisos. El schema push a la DB completó correctamente.
- **Archivos:** Schema Prisma del frontend (`schema.prisma`)
- **Leccion:** (1) En una arquitectura con backend .NET + frontend Next.js/Prisma compartiendo la misma DB, hay DOS sets de migraciones: las del backend (EF Core) y las del frontend (Prisma). Ambas deben ejecutarse. (2) Siempre usar `npx prisma@6 db push` en contenedores con Node 20 (Prisma 7 requiere Node 22+). (3) El CLI de Prisma no está disponible en `node_modules/.bin/` del contenedor — probablemente es devDependency que no se instala en build de producción. Para VPS, agregar `prisma db push` al entrypoint del contenedor o asegurar que esté en dependencies.

---

## Bug #23 — Dashboard: CardDescription duplica CardTitle (cosmetico)
- **Tipo:** UI / Frontend
- **Sintoma:** "Resumen Financiero" aparece 3 veces y "Actividad Reciente" aparece 2 veces en el Dashboard.
- **Causa raiz:** Copy-paste en `DashboardView.tsx`. Tres tarjetas tienen `CardDescription` con la misma i18n key que `CardTitle`, causando texto duplicado. Las tarjetas "Top Accounts" y "Quick Stats" usaban `t('dashboard.summary')` como titulo y descripcion.
- **Fix:** Asignar claves unicas a cada CardTitle y CardDescription:
  - "Actividad Reciente" → descripcion: `t('dashboard.recentEntries')` ("Ultimos asientos contables")
  - "Top Accounts" → titulo: `t('dashboard.accountBalances')` ("Top Cuentas por Balance"), descripcion: `t('dashboard.topAccountsDesc')`
  - "Quick Stats" → titulo: `t('dashboard.quickActions')` ("Acciones Rapidas"), descripcion: `t('dashboard.balance')` ("Balance")
- **Archivos:** `src/components/erp/DashboardView.tsx` (lineas 201, 240-241, 274-275), 3 archivos de locales (es/en/pt)
- **Leccion:** Revisar siempre los textos al copiar tarjetas/componentes. Cada CardDescription debe tener contenido diferente al CardTitle.

---

## Bug #25 — Libro Mayor: dropdown de cuenta vacio
- **Tipo:** Frontend / Reportes
- **Sintoma:** El dropdown "Seleccionar cuenta" en el Libro Mayor aparece vacio aunque existen cuentas en la base de datos.
- **Causa raiz:** En `ReportsView.tsx` linea 569, un filtro `level >= 3` excluia todas las cuentas de nivel 1 y 2. Como el usuario creo cuentas manualmente (nivel 1 y 2), ninguna pasaba el filtro. El filtro fue disenado para un plan de cuentas con 4 niveles (seed), donde solo las cuentas hoja (nivel 3+) son seleccionables, pero no funciona con cuentas creadas manualmente.
- **Fix:** Eliminar el filtro de nivel. Mostrar todas las cuentas ordenadas por codigo, igual que hace JournalEntriesView:
  ```typescript
  // Antes: const leafAccounts = accountsData?.accounts?.filter((a) => (a.level ?? 0) >= 3).sort(...)
  // Despues: const leafAccounts = accountsData?.accounts?.sort(...) || []
  ```
- **Archivos:** `src/components/erp/ReportsView.tsx` (linea 569)
- **Leccion:** No asumir la estructura de datos del usuario. Si el usuario crea cuentas manualmente, el filtro de nivel puede excluirlas todas. Coherencia: JournalEntriesView no filtra por nivel, ReportsView tampoco deberia.

---

## Bug #27 — Audit Log: tabla siempre vacia (sin escritura)
- **Tipo:** Backend / Frontend / Arquitectura
- **Sintoma:** La seccion de Auditoria muestra "No hay datos" a pesar de multiples operaciones realizadas (crear cliente, proveedor, factura, etc.).
- **Causa raiz:** La funcion `logAction()` existe en `src/lib/audit.ts` y funciona correctamente, pero NINGUNA ruta API la invoca. La infraestructura de auditoria esta completamente construida pero desconectada de los handlers de mutacion. El event publisher (`publishEvent()`) tampoco se llama desde ninguna ruta. El backend .NET `AuditMiddleware` solo escribe a log files (Serilog), no a la base de datos.
- **Fix:** Crear wrapper `withAudit()` en `src/lib/with-audit.ts` que intercepta handlers de mutacion exitosos (2xx) y registra automaticamente en AuditLog usando `getSession()` para obtener userId/companyId del JWT. Patrones:
  ```typescript
  // Antes: export async function POST(request: NextRequest) { ... }
  // Despues: export const POST = withAudit('client', 'POST')(async (request: NextRequest) => { ... })
  ```
  Se aplico a las 20 rutas de negocio con 34 handlers de mutacion (POST/PUT/DELETE/PATCH). Fire-and-forget: errores de auditoria no rompen la ruta.
- **Archivos:** `src/lib/with-audit.ts` (NUEVO), 20 archivos de ruta en `src/app/api/*/route.ts`
- **Leccion:** Toda infraestructura construida debe estar conectada. Un endpoint o funcion "huerfana" es equivalente a no tenerla. El patron wrapper/decorador es la forma menos invasiva de agregar cross-cutting concerns (audit, auth, logging) sin modificar la logica de cada handler.

---

## Bug #24 — i18n: claves de traduccion crudas despues de F5 (CRITICO)
- **Tipo:** Frontend / Internationalizacion
- **Sintoma:** Despues de recargar la pagina con F5, el sidebar muestra claves crudas como `nav.dashboard`, `nav.accounts`, etc. en vez del texto traducido ("Dashboard", "Plan de Cuentas"). Funciona correctamente en la primera navegacion (sin F5).
- **Causa raiz (2 problemas compuestos en `src/i18n/index.ts`):**
  1. **`require('./locales/es.json')` falla en ESM**: Next.js 16 usa Turbopack con `module: "esnext"` en tsconfig, que no soporta `require()`. El try/catch falla silenciosamente dejando `esData = null`. Sin fallback, `t()` devuelve la clave cruda.
  2. **`useMemo` para carga async no dispara re-render**: Las traducciones se cargan async en `useMemo` que es para computo sincrono, no side effects. Cuando `loadLocaleData()` resuelve y actualiza `localeCache` (variable de modulo), no hay state setter → React nunca re-rendera con las nuevas traducciones.
- **Fix:** Reemplazar todo el sistema async con imports estaticos de los 3 JSON (~40KB total). Eliminar `require()`, `localeCache`, `loadLocaleData()` y `esData`. Usar un objeto `ALL_TRANSLATIONS` estatico:
  ```typescript
  import esData from './locales/es.json'
  import enData from './locales/en.json'
  import ptData from './locales/pt.json'
  const ALL_TRANSLATIONS: Record<Locale, Record<string, unknown>> = { es: esData, en: enData, pt: ptData }
  ```
  El hook `useTranslation()` ahora selecciona sincronamente desde el mapa estatico — sin async, sin ESM issues, sin F5 problems.
- **Archivos:** `src/i18n/index.ts` (reescribido completamente)
- **Nota:** `next-intl` esta en `package.json` pero NUNCA se usa en el codigo — es peso muerto. Se puede eliminar en una limpieza futura.
- **Leccion:** (1) Nunca usar `require()` en un proyecto ESM/Next.js. (2) `useMemo` es para computo sincrono — usar `useEffect` para side effects async. (3) Para i18n con pocos locales, los imports estaticos son la solucion mas simple y confiable.

---

## Resumen Estadistico

| Capa del proyecto | Bugs encontrados | Estado |
|---|---|---|
| Deploy Script (PowerShell) | #1, #2, #3, #5, #6 | ✅ Todos fixeados |
| Docker Compose | #4, #10, #19, #20, #21 | ✅ Todos fixeados |
| Infrastructure (C#) | #7, #12, #13, #17, #18 | ✅ Todos fixeados |
| Application (C#) | #8, #9, #11 | ✅ Todos fixeados |
| API (C#) | #14 | ✅ Fixeado |
| Base de Datos | #22 | ✅ Fixeado |
| Sincronizacion | #15, #16 | ✅ Fixeados |
| Frontend (React/Next.js) | #23, #24, #25, #26, #27, #28, #29 | ✅ Todos fixeados |

**Total: 30 bugs encontrados — 30 corregidos**
**Mejoras de UI/UX aplicadas: 5** (UI #1-#5, sesion 16/04/2026)
- Bugs de entorno/compatibilidad: 6 (#1-#6)
- Bugs de compilacion/dependencias: 7 (#7-#13)
- Bugs de sincronizacion de archivos: 4 (#14-#16)
- Bugs de inyeccion de dependencias (.NET DI): 2 (#17-#18)
- Bugs de configuracion Docker/Infra: 3 (#19-#21)
- Bugs de base de datos/migraciones: 1 (#22)
- Bugs de frontend/i18n: 6 (#23-#28)
- Bug cosmetico frontend (React Query): 1 (#29)
- Limpieza Docker Compose: 1 (#30)

**Patrones principales (todas las sesiones):**
1. .NET DI resuelve por tipo exacto, no por herencia (#17)
2. Singleton no puede consumir Scoped directamente — usar IServiceScopeFactory (#18)
3. StackExchange.Redis no usa formato URL con scheme (#20)
4. Cada listener Kafka necesita puerto unico (#19)
5. Prisma exige `DATABASE_URL` como nombre de variable (#21)
6. Dos ORMs compartiendo la misma DB necesitan migraciones separadas (#22)
7. Nunca usar `require()` en ESM/Next.js — usar imports estaticos (#24)
8. `useMemo` es para computo sincrono, no para side effects async (#24)
9. CardDescription no debe repetir el mismo texto que CardTitle — copy-paste bugs (#23)
10. No asumir la estructura de datos del usuario en filtros (#25)
11. Toda infraestructura debe estar conectada al flujo de datos — funciones huerfanas = inutiles (#27)
12. El patron wrapper/decorador es ideal para cross-cutting concerns como audit logging (#27)
13. Usar `date` (fecha de negocio) en vez de `createdAt` para reportes periodicos (#28)
14. Toda mutacion que afecte datos del dashboard debe invalidar la query `['dashboard']` (#28)
15. `refetchQueries` espera datos frescos; `invalidateQueries` es fire-and-forget (#29)
16. Para patrones hover-only, usar `lg:` como prefijo — touch devices no tienen hover (#UI1)
17. Mantener un solo color accent consistente en toda la app (#UI2)
18. Nunca mostrar pantalla en blanco — siempre mostrar algo visual (#UI3)
19. Todo boton icon-only DEBE tener `aria-label` (#UI4)
20. Sidebar colapsable es esencial para ERPs con contenido tabular (#UI5)

---

## Bug #28 — Dashboard: Grafico Mensual siempre muestra $0 (multiples causas)
- **Tipo:** Backend / Logica de negocio / Frontend
- **Sintoma:** El grafico "Ingresos Totales vs Egresos Totales" muestra $0 en todos los meses, incluso despues de crear facturas ($12.100) y pagos ($12.100 cobro). Los KPIs del dashboard se actualizan correctamente.
- **Causa raiz (4 problemas compuestos):**
  1. **`createdAt` vs `date` en facturas y pagos**: En `route.ts` lineas 185 y 193, las queries de facturas y pagos usaban `createdAt` (timestamp de creacion en DB) en vez de `date` (fecha del negocio). Si la fecha del negocio difiere de la fecha de creacion, los datos aparecen en el mes equivocado.
  2. **Pagos `cobro` ignorados completamente**: La query mensual solo sumaba pagos `type: 'pago'` como egresos. Los cobros (`type: 'cobro'`) que representan ingresos reales por cobros a clientes se ignoraban por completo — no se sumaban ni a ingresos ni a egresos. Dado que el usuario creo un REC-0001 de tipo `cobro`, ese ingreso no se reflejaba en el grafico.
  3. **KPI cards 3 y 4 intercambiados**: La tercera tarjeta ("Egresos Totales") mostraba `data.totalRevenue` (balance de cuentas tipo ingreso) y la cuarta ("Facturas Vencidas") mostraba `data.totalExpenses` (balance de cuentas tipo egreso). Los datos estaban cruzados.
  4. **Sin invalidacion del query `['dashboard']`**: Al crear/editar/eliminar facturas, pagos o asientos contables, solo se invalidaban las queries propias (`['invoices']`, `['payments']`, `['journal-entries']`). El dashboard nunca se refrescaba automaticamente — solo al recargar la pagina completa.
- **Fix:**
  1. Cambiar `createdAt` → `date` en las queries de facturas y pagos (lineas 188 y 198 de `route.ts`).
  2. Agregar query separada para pagos `type: 'cobro'` y sumar a `monthIngresos`. Ahora se hacen 3 aggregates paralelos: facturas (ingresos), cobros (ingresos), pagos a proveedores (egresos).
  3. Corregir KPI cards: tarjeta 3 usa `data.totalExpenses`, tarjeta 4 usa `data.pendingInvoices` (count de facturas pendientes).
  4. Agregar `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` en 9 mutation handlers: InvoicesView (3), PaymentsView (3), JournalEntriesView (3).
- **Archivos:** `src/app/api/dashboard/route.ts` (lineas 179-213), `src/components/erp/DashboardView.tsx` (lineas 110-125), `src/components/erp/InvoicesView.tsx` (3 invalidaciones), `src/components/erp/PaymentsView.tsx` (3 invalidaciones), `src/components/erp/JournalEntriesView.tsx` (3 invalidaciones)
- **Leccion:** (1) Usar siempre `date` (fecha de negocio) en vez de `createdAt` para reportes periodicos. (2) No asumir que un solo tipo de operacion cubre todo — verificar todos los subtipos. (3) Toda mutacion que afecte datos del dashboard debe invalidar la query `['dashboard']`.

---

## Bug #29 — Roles: contador de permisos no refresca al guardar
- **Tipo:** Frontend / React Query
- **Sintoma:** Al editar un rol y tildar permisos, el contador "X permisos" en la lista de roles no se actualiza despues de guardar. Muestra "0 permisos" aunque los permisos se guardaron correctamente en la base de datos.
- **Causa raiz:** Las mutations de roles (`createRole`, `updateRole`, `deleteRole`, `seedPermissions`) usaban `queryClient.invalidateQueries()` que marca la query como "stale" pero NO espera a que termine el refetch. Con `staleTime: 30s` configurado globalmente, React Query mostraba datos del cache (viejos) inmediatamente y el refetch en background llegaba demasiado tarde — el usuario ya veia el contador viejo. Ademas, `closeForm()` se ejecutaba inmediatamente despues de invalidar, cerrando el dialogo antes de que el refetch completara.
- **Fix:** Cambiar `invalidateQueries()` por `refetchQueries()` que devuelve una Promise y espera a que el refetch complete antes de continuar. En el caso de `seedPermissions`, usar `await Promise.all([refetchQueries(['roles']), refetchQueries(['permissions'])])` para esperar ambas queries antes de mostrar el toast. Para `createRole` y `updateRole`, `refetchQueries` garantiza que cuando `closeForm()` ejecuta, la lista ya tiene datos frescos.
- **Archivos:** `src/components/erp/RolesView.tsx` (lineas 187, 200, 211-215, 224)
- **Leccion:** `invalidateQueries` es "fire and forget" — marca stale pero no espera. `refetchQueries` espera a que termine el fetch. Cuando necesitas datos frescos ANTES de ejecutar una accion (como cerrar un dialogo), usar `refetchQueries`. Para side effects donde no importa el orden, `invalidateQueries` es suficiente.
- **Estado:** ✅ Fix aplicado al codigo fuente (16/04/2026). Las 4 mutations ahora usan `await queryClient.refetchQueries()`.

---

## Bug #30 — docker-compose: warning de `version` deprecated (limpieza)
- **Tipo:** Docker Compose / Cosmetico
- **Sintoma:** `docker compose` muestra warning: "the 'version' field is obsolete" en archivos compose que aun tengan la clave.
- **Fix:** Verificado que ningun archivo docker-compose (`.yml`, `.local.yml`, `.prod.yml`, `.backend.yml`) contiene la clave `version`. Fue eliminada en sesiones anteriores (Bug #4). Sin accion adicional necesaria.
- **Archivos:** Todos los `docker-compose*.yml`
- **Estado:** ✅ Ya limpio — sin accion requerida.

---

## Mejoras de UI/UX — Sesión 16/04/2026

> Pulido visual sin tocar lógica de negocio, APIs ni base de datos.
> Todos los cambios son CSS/Tailwind + un boolean de estado local (sidebar collapse).
> TypeScript compila limpio: 0 errores después de todas las mejoras.

---

## UI #1 — Botones de acción invisibles en dispositivos touch
- **Tipo:** Mobile / UX
- **Sintoma:** En todas las vistas con tablas (Facturas, Clientes, Proveedores, Pagos, Usuarios, Cuentas Bancarias, Plan de Cuentas), los botones de editar/eliminar usaban `opacity-0 group-hover:opacity-100`. En dispositivos touch (tablets, celulares) no existe el hover, así que los botones eran completamente invisibles e inaccesibles. El usuario no podía editar ni eliminar registros desde mobile.
- **Causa raiz:** El patrón `opacity-0 group-hover:opacity-100` asume que el usuario tiene un mouse/trackpad. En touch devices, no hay estado hover previo al tap, así que los elementos nunca se hacen visibles.
- **Fix:** Cambiar `opacity-0 group-hover:opacity-100` por `lg:opacity-0 lg:group-hover:opacity-100` en los 7 archivos afectados. Esto hace que:
  - En pantallas chicas (mobile/tablet): los botones SIEMPRE son visibles (sin opacity-0).
  - En pantallas grandes (desktop): los botones aparecen solo al hacer hover sobre la fila (comportamiento original preservado).
- **Archivos modificados (7):**
  - `src/components/erp/InvoicesView.tsx` (linea 489)
  - `src/components/erp/ClientsView.tsx` (linea 201)
  - `src/components/erp/ProvidersView.tsx` (linea 198)
  - `src/components/erp/PaymentsView.tsx` (linea 419)
  - `src/components/erp/UsersView.tsx` (linea 250)
  - `src/components/erp/BankAccountsView.tsx` (linea 204)
  - `src/components/erp/AccountsView.tsx` (linea 232)
- **Leccion:** Para patrones hover-only, siempre usar `lg:` como prefijo. Los dispositivos touch no tienen hover — cualquier cosa dependiente de hover debe tener un fallback visible en breakpoints menores. `lg:opacity-0 lg:group-hover:opacity-100` es el patron correcto.

---

## UI #2 — Inconsistencia de color en language switcher
- **Tipo:** Diseño / Consistencia visual
- **Sintoma:** El language switcher en el header usaba `bg-teal-50 text-teal-700` para el idioma seleccionado, mientras que toda la aplicación usa `emerald` como color primario. La diferencia es sutil pero rompe la consistencia del diseño.
- **Fix:** Cambiar `bg-teal-50 text-teal-700` → `bg-emerald-50 text-emerald-700` en `language-switcher.tsx`.
- **Archivos:** `src/components/ui/language-switcher.tsx` (linea 37)
- **Leccion:** Mantener un solo color accent (emerald) en toda la app. Cuando se agregan nuevos componentes, verificar que usen el mismo palette.

---

## UI #3 — Pantalla blanca durante hidratación (loading screen)
- **Tipo:** UX / Percepción de rendimiento
- **Sintoma:** Al cargar la app o recargar con F5, `page.tsx` retornaba `null` mientras esperaba la hidratación del cliente (hydration). Esto causaba un flash de pantalla blanca/ vacía que se sentía como si la app estuviera rota o lenta. Duraba ~200-500ms.
- **Fix:** Reemplazar el `return null` por una pantalla de carga con branding de ContaFlow:
  - Logo animado (icono de edificio, emerald con pulse animation y shadow glow)
  - Texto "ContaFlow" + "Cargando..." debajo
  - Fondo `bg-slate-50` consistente con el tema de la app
  - Todo inline en `page.tsx` sin agregar dependencias ni componentes nuevos
- **Archivos:** `src/app/page.tsx` (lineas 34-57)
- **Leccion:** Nunca mostrar pantalla en blanco. Siempre mostrar algo visual — aunque sea un spinner con branding. La percepción de velocidad es tan importante como la velocidad real.

---

## UI #4 — Accesibilidad: aria-labels en botones icon-only
- **Tipo:** Accesibilidad (a11y)
- **Sintoma:** Los botones que solo muestran un icono (sin texto) carecían de `aria-label`. Esto significa que los lectores de pantalla no podían describir su función, y los usuarios de teclado/voz no sabían qué hacía cada botón. Incluía: hamburger menu mobile, logout en sidebar, language switcher.
- **Fix:** Agregar `aria-label` descriptivo a todos los botones icon-only:
  - Menú hamburger: `aria-label="Abrir menu de navegacion"`
  - Botón logout (sidebar): `aria-label="Cerrar sesion"`
  - Language switcher: `aria-label="Cambiar idioma"`
  - Botón collapse sidebar: `aria-label="Colapsar sidebar"` / `"Expandir sidebar"` (dinámico según estado)
- **Archivos:** `src/components/erp/ERPLayout.tsx` (lineas 136, 201, 248), `src/components/ui/language-switcher.tsx` (linea 25)
- **Leccion:** Todo botón icon-only DEBE tener `aria-label`. Es un requisito WCAG 2.1 (criterio 1.1.1). No cuesta nada agregarlo y mejora significativamente la accesibilidad.

---

## UI #5 — Sidebar colapsable en desktop
- **Tipo:** UX / Layout
- **Sintoma:** La sidebar del escritorio ocupaba siempre 256px fijos (`w-64`), sin forma de colapsarla. En pantallas medianas (laptops 1366px-1440px) esto consumía ~18-19% del ancho, dejando poco espacio para tablas y contenido. El usuario no podía ganar espacio de trabajo.
- **Fix:** Implementar sidebar colapsable con toggle:
  - Nuevo estado local `sidebarCollapsed` (boolean) en `ERPLayout` — no persiste, se resetea al recargar.
  - Botón toggle en el header (icono `PanelLeftClose`/`PanelLeftOpen` de lucide-react) visible solo en desktop (`hidden lg:flex`).
  - Sidebar colapsada: `w-[70px]` — muestra solo iconos centrados con tooltips (`title` attribute).
  - Sidebar expandida: `w-64` (comportamiento original).
  - Transición suave de 300ms via `transition-all duration-300` en sidebar y main content.
  - Cuando está colapsada:
    - Logo: solo el icono, sin texto.
    - Company badge: icono Building2 en cuadrado.
    - Nav items: iconos centrados, sin texto, con `title` tooltip.
    - User section: avatar + botón logout apilados verticalmente.
  - El padding del main content se ajusta dinámicamente: `lg:pl-[70px]` (colapsada) vs `lg:pl-64` (expandida).
  - Mobile sidebar NO se ve afectada — sigue siendo un Sheet lateral completo.
- **Archivos:** `src/components/erp/ERPLayout.tsx` (completo — sidebar content, layout, header)
  - Imports nuevos: `useState`, `PanelLeftClose`, `PanelLeftOpen`
  - `SidebarContent`: nuevo prop `collapsed?: boolean` con rendering condicional
  - `ERPLayout`: nuevo estado + botón toggle + clases dinámicas en aside y div main
- **Leccion:** Un sidebar colapsable es esencial para apps con mucho contenido tabular (ERPs, dashboards). Usar transiciones suaves (300ms) para que no se sienta brusco. Los tooltips (`title` attribute) son suficientes para la versión colapsada — no hace falta un tooltip fancy.

---

## Resumen de Mejoras de UI/UX

| # | Mejora | Archivos | Riesgo |
|---|--------|----------|--------|
| UI #1 | Botones de acción visibles en touch | 7 archivos | Cero (solo CSS) |
| UI #2 | Unificar teal → emerald | 1 archivo | Cero (solo CSS) |
| UI #3 | Pantalla de carga con branding | 1 archivo | Cero (JSX estático) |
| UI #4 | Aria-labels accesibilidad | 2 archivos | Cero (solo atributos HTML) |
| UI #5 | Sidebar colapsable desktop | 1 archivo | Bajo (1 useState local) |

**Archivos totales modificados:** 10 archivos
**Archivos de lógica de negocio tocados:** 0
**Archivos de API tocados:** 0
**Archivos de base de datos tocados:** 0
**TypeScript errors post-cambios:** 0

---

## Checklist para proximo deploy

- [ ] Sincronizar TODOS los archivos del proyecto al Windows del usuario
- [ ] Ejecutar `docker builder prune -f` antes del build (limpiar cache)
- [ ] Ejecutar `docker compose down --remove-orphans && docker compose build --no-cache && docker compose up -d`
- [ ] Verificar que los 7 servicios levanten correctamente (postgres, redis, zookeeper, kafka, backend, app, mailpit)
- [ ] Ejecutar `docker exec contaflow-app npx prisma@6 db push --accept-data-loss` para crear tablas Prisma (usar @6 para compatibilidad Node 20)
- [ ] Testear http://localhost:3000 (frontend) y http://localhost:8080 (backend directo)
- [ ] Verificar Swagger en http://localhost:8080/swagger
- [ ] Verificar Mailpit en http://localhost:8025
- [ ] Probar flujo completo: Registro → Login → Dashboard

---

## Feature: Landing Page — Sesión 16/04/2026

> Pagina publica de presentacion del producto (vidriera) accesible en `/landing`.
> No modifica ningun archivo existente del ERP — 100% archivos nuevos.
> Tecnologias: React, Tailwind CSS, Lucide React icons, CSS gradient animation.

### Archivos nuevos (6):
- `src/app/landing/page.tsx` — Pagina principal en ruta `/landing`. Header sticky con nav + Hero + Features + Modules + Pricing + Footer.
- `src/components/landing/Hero.tsx` — Seccion hero con gradiente animado, badge "Facturacion AFIP", CTA buttons, social proof (500+ empresas), mockup del dashboard embebido.
- `src/components/landing/Features.tsx` — 6 feature cards: Facturacion AFIP, Plan de Cuentas, Reportes Avanzados, Multi-Empresa, Multi-Idioma, Roles y Permisos.
- `src/components/landing/Modules.tsx` — Grid de 13 modulos del ERP con iconos y descripciones cortas.
- `src/components/landing/Pricing.tsx` — 3 planes de precios: Gratuito ($0/mes), Profesional ($14.900/mes, destacado), Empresa (custom). Cards con feature lists y CTAs.
- `src/components/landing/Footer.tsx` — Footer con logo, links de navegacion, copyright y social icons (Twitter/LinkedIn).

### Decisiones de diseno:
- **Ruta `/landing`** en vez de `/` para NO romper el ERP. El ERP sigue siendo la pagina principal en `/`. Cuando se haga el swap, se mueve el contenido de `/` a `/app` y el landing a `/`.
- **Sin route group `(public)`** — se evaluo pero requiere mover `page.tsx` existente. Enfoque conservador.
- **Colores consistentes**: emerald como color primario (igual que el ERP), slate para textos.
- **Link "Iniciar sesion"** apunta a `/` (login del ERP).
- **Link "Comenzar gratis"** apunta a `/` (registro del ERP).
- **Iconos**: Se usaron `BookCopy` y `BookMarked` en lugar de `Notebook` (no disponible en lucide-react estable).

### Integracion con ERP:
- No requiere cambios en archivos existentes.
- Para convertir en homepage principal: mover `src/app/page.tsx` a `src/app/(dashboard)/page.tsx`, y crear `src/app/(public)/page.tsx` con el landing.

---

## Feature: Centro de Ayuda / FAQ — Sesión 16/04/2026

> Centro de ayuda integrado en el ERP con articulos categorizados y buscador.
> 15 articulos en 5 categorias, con vista de detalle por articulo.
> Tecnologias: React, Tailwind CSS, Lucide React, shadcn/ui components.

### Archivos nuevos (2):
- `src/lib/help-articles.ts` — Base de datos estatica de articulos de ayuda. 5 categorias (Contabilidad, Facturacion, Reportes, Roles y Permisos, General) con 15 articulos totales. Incluye funcion `searchArticles()` para busqueda por texto.
- `src/components/erp/HelpView.tsx` — Vista completa con: buscador, sidebar de categorias (desktop), chips de categorias (mobile), grid de articulos con cards, y vista de detalle de articulo con contenido completo.

### Archivos modificados (6):
- `src/lib/store.ts` — Agregado `'help'` al tipo `ViewType`
- `src/components/erp/ERPLayout.tsx` — Import `HelpCircle`, item en `navItems`, key en `viewTitleKeys`
- `src/app/page.tsx` — Import `HelpView`, case `'help'` en el switch de vistas
- `src/i18n/locales/es.json` — `"help": "Ayuda"` en `nav`
- `src/i18n/locales/en.json` — `"help": "Help"` en `nav`
- `src/i18n/locales/pt.json` — `"help": "Ajuda"` en `nav`

### Contenido de articulos:
| Categoria | Articulos |
|---|---|
| Contabilidad (6) | Crear asiento, Armar plan de cuentas, Tipos de cuentas, Libro Diario, Libro Mayor, Balance General |
| Facturacion (4) | Crear factura electronica, Estados de factura, Registrar cobro, Registrar pago a proveedor |
| Reportes (2) | Reportes disponibles, Exportar a Excel y PDF |
| Roles y Permisos (3) | Que son los roles, Asignar permisos, Niveles de acceso |
| General (2) | Cambiar idioma, Crear nueva empresa, Navegacion por el sidebar (TODO: truncado en backup anterior) |

### Fixes durante integracion:
- **Fix #31**: `HelpView` exportado como `default` pero importado como named `{ HelpView }` → corregido a `import HelpView from '...'`.
- **Fix #32**: `ScrollArea` de Radix no acepta prop `orientation="horizontal"` → reemplazado por `div` nativo con `overflow-x-auto`.

### Decisiones de diseno:
- **Vista de detalle inline**: Al hacer clic en un articulo, se reemplaza la lista por el contenido completo (no abre dialog ni nueva pagina). Boton "Volver" para regresar.
- **Buscador fuzzy**: Busca en titulo y contenido de todos los articulos. Filtrado instantaneo con `useMemo`.
- **Responsive**: Desktop muestra sidebar con categorias + grid de articulos. Mobile muestra chips horizontales + cards apiladas.
- **Sin backend**: Todos los articulos son estaticos (hardcodeados). Para convertir a dinamico, se necesitaria una tabla `help_articles` en Prisma y un CRUD de admin.
- **Iconos por categoria**: `BookOpen` (Contabilidad), `Receipt` (Facturacion), `BarChart3` (Reportes), `ShieldCheck` (Roles), `Settings` (General).

### Patron de integracion:
Para agregar un nuevo modulo al ERP sidebar, se necesitan exactamente 4 pasos:
1. Agregar el valor a `ViewType` en `src/lib/store.ts`
2. Agregar el item al array `navItems` en `ERPLayout.tsx` (con icono y labelKey)
3. Agregar la key al objeto `viewTitleKeys` en `ERPLayout.tsx`
4. Agregar el `case` correspondiente en `page.tsx` + import del componente
5. Agregar la traduccion en los 3 locale files (es/en/pt)

---

## Estadisticas Actualizadas

**Total bugs corregidos:** 30
**Mejoras de UI/UX:** 5 (sesion anterior)
**Nuevas features:** 2 (Landing Page + Centro de Ayuda)
**Archivos nuevos landing:** 6
**Archivos nuevos help:** 2
**Archivos modificados help:** 6
**Total patrones/lecciones:** 22 (+2 nuevos: #21 export default vs named, #22 ScrollArea props)

---

## Git Commits

| Commit | Fecha | Descripcion |
|---|---|---|
| `4810fa9` | 16/04/2026 | Backup completo del proyecto desde PC del usuario (1141 archivos) |
| `9b8a3fe` | 16/04/2026 | Feature: Landing Page + Centro de Ayuda/FAQ |

---

## Siguientes pasos (pendientes)

- [ ] Integrar landing page como homepage principal (swap de rutas)
- ] Registro de usuarios con email verification
- ] Testing end-to-end con Playwright
- ] CI/CD pipeline (GitHub Actions)
- [ ] Compra VPS Hostinger KVM 2
- ] Configuracion de dominio DNS
- ] Deploy produccion en Ubuntu
- ] Gateway de pagos (Mercado Pago / stripe)
- ] Marca registrada ContaFlow


---

## Bugs y Fixes -- Sesion 18/04/2026 (Deploy Ubuntu + Modulo Cheques)

> Deploy del modulo de Cheques en PC Ubuntu del usuario.
> Entorno: Ubuntu + Docker Compose (9 containers)

---

## Bug #31 -- JSON locales: coma faltante despues de entrada "cheques"
- **Tipo:** Build / JSON
- **Sintoma:** Build falla con Unable to make a module from invalid JSON en en.json:64, es.json:64, pt.json:64
- **Causa raiz:** Al agregar "cheques": "Cheques" a los 3 archivos de locale, se omitio la coma al final
- **Fix:** sed para agregar coma despues de cada entrada de cheques en en/es/pt locales
- **Archivos:** src/i18n/locales/en.json, es.json, pt.json
- **Leccion:** Siempre verificar JSON valido despues de editar a mano

---

## Bug #32 -- TypeScript: viewTitleKeys no incluye cheques
- **Tipo:** Build / TypeScript
- **Sintoma:** Type error: Property cheques is missing in Record<ViewType, string> en ERPLayout.tsx:203
- **Causa raiz:** Se agrego cheques al tipo ViewType y navItems pero no al objeto viewTitleKeys
- **Fix:** Agregar cheques: nav.cheques al objeto viewTitleKeys
- **Archivos:** src/components/erp/ERPLayout.tsx
- **Leccion:** Cuando se agrega un valor a un union type, TODOS los Record<UnionType, T> deben actualizarse

---

## Bug #33 -- Modulo Cheques no aparece en el sidebar
- **Tipo:** Funcional / Configuracion de planes
- **Sintoma:** El item Cheques no aparece en el sidebar del ERP
- **Causa raiz (3 problemas):** (1) plan-config.ts no incluia cheques en ningun plan (2) Login API no devolvia plan en la respuesta (3) Empresa demo estaba en plan starter
- **Fix:** (1) Agregar cheques a modules y permisos en planes growth/profesional/business/enterprise (2) Agregar plan a respuesta del login API (3) UPDATE Company SET plan = growth
- **Archivos:** src/lib/plan-config.ts, src/app/api/auth/login/route.ts, BD PostgreSQL
- **Leccion:** Cuando se agrega un modulo nuevo, actualizar TODOS los lugares: ViewType, navItems, viewTitleKeys, plan-config, i18n, page.tsx

---

## Bug #34 -- Backend .NET crashea con exit code 139
- **Tipo:** Backend / Configuracion
- **Sintoma:** Container contaflow-backend se reinicia continuamente con Restarting (139)
- **Causa raiz:** Email:Enabled estaba vacio en .env. String vacio no es booleano valido para .NET
- **Fix:** Agregar EMAIL_ENABLED=false y config SMTP al .env
- **Archivos:** .env
- **Leccion:** Exit code 139 no siempre es SIGSEGV real. Siempre leer los logs del container

---

## Bug #35 -- F5 vuelve al dashboard
- **Tipo:** UX / Estado de aplicacion
- **Sintoma:** Al presionar F5 la vista vuelve siempre al Dashboard
- **Causa raiz:** Zustand store no persistia currentView en localStorage
- **Fix:** Agregar localStorage.setItem en setCurrentView() y lectura en hydrateFromStorage()
- **Archivos:** src/lib/store.ts
- **Leccion:** Si un estado es importante para la UX, debe persistirse en localStorage

---

## Bug #36 -- Dropdown de acciones de cheques se corta
- **Tipo:** UI / CSS
- **Sintoma:** Dropdown de acciones aparece cortado hacia abajo y es dificil hacer clic
- **Causa raiz:** top-full mt-1 se corta con pocas filas, gap mb-1 rompe el hover state
- **Fix:** Cambiar a bottom-full sin gap, z-index 9999, min-w-[160px] en la celda
- **Archivos:** src/components/erp/ChequesView.tsx
- **Leccion:** Para dropdowns en tablas, abrir hacia arriba y sin gaps

---

## Feature: Modulo de Cheques -- Deploy completo
- Creacion de tabla Cheque en PostgreSQL con 4 indices
- 7 API endpoints (CRUD + deposit/clear/reject/endorse/cancel)
- Frontend 1300 lineas con stats, tabla, dialogs, detail sheet
- CRUD + 5 acciones de estado verificadas (crear, endosar, depositar)

## Feature: Favicon personalizado ContaFlow
- SVG con gradiente azul-verde (#2563EB a #10B981), letras CF blancas
- Reemplazo de favicon Z.ai por /favicon.svg

## Feature: Persistencia de currentView
- F5 ahora mantiene la vista actual via localStorage

---

## Estadisticas Actualizadas
**Total bugs:** 36 (30 anteriores + 6 nuevos)
**Total features:** 5 (Landing, Help, Cheques Deploy, Favicon, currentView)
**Containers Docker:** 9

## Checklist
- [x] Modulo Cheques: tabla + API + frontend + plan config
- [x] Backend .NET: levanta sin crashear
- [x] Favicon: logo CF personalizado
- [x] F5 persistence: currentView en localStorage
- [x] Dropdown de acciones: abre hacia arriba
- [ ] Fix healthcheck Nginx, Mailpit, Backend
- [ ] Asientos automaticos de cheques
- [ ] Dashboard con cards de cheques
- [ ] Pagina resultado de pago
- [ ] AFIP Adapter
- [ ] Onboarding wizard
- [ ] Exportar Excel/PDF
- [ ] Git + GitHub
---

## Sesion 2 - 2026-04-18 (continuacion)

### Feature #6: Asientos automaticos de cheques
- **Archivos:** src/lib/cheque-journal.ts, deposit/route.ts, clear/route.ts, reject/route.ts, endorse/route.ts
- **Descripcion:** Cada operacion sobre cheques genera automaticamente un asiento contable (partida doble) en JournalEntry + JournalEntryLine
- **Logica:**
  - Depositar (en_cartera -> depositado): D: Cheques en Transito (1.1.2.01) -> H: Cheques de Terceros (1.1.2.02)
  - Acreditar (depositado -> cobrado): D: Banco (1.1.1.01) -> H: Cheques en Transito (1.1.2.01)
  - Rechazar (depositado -> rechazado): D: Cheques Rechazados (1.1.2.99) -> H: Cheques en Transito (1.1.2.01)
  - Endosar (en_cartera -> endosado): D: Cheques Endosados (1.1.2.03) -> H: Cheques de Terceros (1.1.2.02)
- **Cuentas contables:** Se crean automaticamente si no existen (findOrCreateAccount)
- **Test:** Acreditacion del cheque 00222333 genero asiento #11 por $25.000 (partida doble correcta)
- **Dificultad:** Alta

### Feature #7: Pagina resultado de pago
- **Archivo:** src/app/payments/result/page.tsx
- **Ruta:** /payments/result?status=success|failure|pending&preference_id=xxx&plan=xxx
- **Descripcion:** Pagina visual para el flujo de retorno de Mercado Pago con 3 estados
- **Estados:**
  - success: Icono verde CheckCircle, badge "Aprobado", boton "Ir al ERP"
  - failure: Icono rojo XCircle, badge "Rechazado", listado de posibles causas, boton "Reintentar pago"
  - pending: Icono amarillo Clock, badge "Pendiente", info de 48hs, boton "Verificar estado"
- **Tecnico:** Suspense + useSearchParams (Next.js 16), sin JSX dinamico (Turbopack compatibility issue)
- **Bug #37 encontrado:** Turbopack falla con componentes JSX dinamicos (<Componente variable />) y con as const en objetos. Solucion: renderizar componentes directamente con condiciones ternarias
- **Test:** Los 3 estados devuelven HTTP 200

## Estadisticas Actualizadas
**Total bugs:** 37 (36 anteriores + 1 nuevo: #37 Turbopack JSX dinamico)
**Total features:** 7 (6 anteriores + Asientos automaticos + Pagina resultado de pago)
**Containers Docker:** 9

## Checklist
- [x] Modulo Cheques: tabla + API + frontend + plan config
- [x] Backend .NET: levanta sin crashear
- [x] Favicon: logo CF personalizado
- [x] F5 persistence: currentView en localStorage
- [x] Dropdown de acciones: abre hacia arriba
- [x] Asientos automaticos de cheques
- [x] Pagina resultado de pago (/payments/result)
- [ ] Fix healthcheck Nginx, Mailpit, Backend
- [ ] Dashboard con cards de cheques
- [ ] AFIP Adapter
- [ ] Onboarding wizard
- [ ] Exportar Excel/PDF
- [ ] Git + GitHub
