using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Hellang.Middleware.ProblemDetails;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using ContaFlow.Domain;
using ContaFlow.Domain.Interfaces;
using ContaFlow.Application.Interfaces;
using ContaFlow.Application.Models;
using ContaFlow.Infrastructure.Data;
using ContaFlow.Infrastructure.Repositories;
using ContaFlow.Infrastructure.Messaging;
using ContaFlow.Infrastructure.Caching;
using ContaFlow.Infrastructure.Services;
using ContaFlow.API.Authorization;
using ContaFlow.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// ══════════════════════════════════════════════════════════════════
// SERILOG - Logging estructurado
// ══════════════════════════════════════════════════════════════════
Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/contaflow-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj} {Properties:j}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// ══════════════════════════════════════════════════════════════════
// SERVICES - Configuración de servicios
// ══════════════════════════════════════════════════════════════════
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configuración JSON para compatibilidad con el frontend
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// ══════════════════════════════════════════════════════════════════
// CORS - Permitir solicitudes desde el frontend Next.js
// ══════════════════════════════════════════════════════════════════
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration["Cors:AllowedOrigins"] ?? "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// ══════════════════════════════════════════════════════════════════
// DATABASE - PostgreSQL via Entity Framework Core
// ══════════════════════════════════════════════════════════════════
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=contaflow_erp;Username=contaflow;Password=contaflow_secret_2024";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
        npgsql.MigrationsHistoryTable("__ef_migrations_history", "public");
    }));

// ══════════════════════════════════════════════════════════════════
// DEPENDENCY INJECTION - Registro de servicios de la aplicación
// ══════════════════════════════════════════════════════════════════
// Repositorios y Unit of Work
builder.Services.AddScoped(typeof(IRepository<>),
    typeof(ContaFlow.Infrastructure.Repositories.Repository<>));
builder.Services.AddScoped<IUnitOfWork, ContaFlow.Infrastructure.Repositories.UnitOfWork>();

// Servicios de aplicación
builder.Services.AddScoped<IAuthService, ContaFlow.Application.Services.AuthService>();
builder.Services.AddScoped<IAccountService, ContaFlow.Application.Services.AccountService>();
builder.Services.AddScoped<IJournalEntryService, ContaFlow.Application.Services.JournalEntryService>();
builder.Services.AddScoped<IInvoiceService, ContaFlow.Application.Services.InvoiceService>();
builder.Services.AddScoped<IPaymentService, ContaFlow.Application.Services.PaymentService>();

// Servicios de aplicación - Módulos completos
builder.Services.AddScoped<IClientService, ContaFlow.Application.Services.ClientService>();
builder.Services.AddScoped<IProviderService, ContaFlow.Application.Services.ProviderService>();
builder.Services.AddScoped<IBankAccountService, ContaFlow.Application.Services.BankAccountService>();
builder.Services.AddScoped<IAuditLogService, ContaFlow.Application.Services.AuditLogService>();
builder.Services.AddScoped<IRoleService, ContaFlow.Application.Services.RoleService>();
builder.Services.AddScoped<IPermissionService, ContaFlow.Application.Services.PermissionService>();
builder.Services.AddScoped<ISettingsService, ContaFlow.Application.Services.SettingsService>();
builder.Services.AddScoped<IReportService, ContaFlow.Application.Services.ReportService>();

// ══════════════════════════════════════════════════════════════════
// EMAIL - Servicio de notificaciones por email (SMTP)
// ══════════════════════════════════════════════════════════════════
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailService, SmtpEmailService>();

// Email Queue — cola asincrónica para envío en background (fire-and-forget desde handlers)
builder.Services.AddSingleton<IEmailQueueService, EmailQueueService>();
builder.Services.AddHostedService<EmailQueueBackgroundService>();

// ══════════════════════════════════════════════════════════════════
// KAFKA - Event-driven messaging (Producer + Consumer)
// ══════════════════════════════════════════════════════════════════
builder.Services.AddKafkaMessaging(builder.Configuration);

// ══════════════════════════════════════════════════════════════════
// EVENT DISPATCHER AND HANDLERS - Procesamiento de eventos de dominio
// ══════════════════════════════════════════════════════════════════
builder.Services.AddSingleton<ContaFlow.Application.Events.IEventDispatcher, ContaFlow.Application.Events.EventDispatcher>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.JournalEntryConfirmedEvent>, ContaFlow.Application.Events.Handlers.JournalEntryConfirmedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.InvoiceCreatedEvent>, ContaFlow.Application.Events.Handlers.InvoiceCreatedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.InvoiceStatusChangedEvent>, ContaFlow.Application.Events.Handlers.InvoiceStatusChangedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.PaymentCreatedEvent>, ContaFlow.Application.Events.Handlers.PaymentCreatedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.PaymentDeletedEvent>, ContaFlow.Application.Events.Handlers.PaymentDeletedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.UserCreatedEvent>, ContaFlow.Application.Events.Handlers.UserCreatedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.RoleChangedEvent>, ContaFlow.Application.Events.Handlers.RoleChangedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.JournalEntryCreatedEvent>, ContaFlow.Application.Events.Handlers.JournalEntryCreatedEventHandler>();
builder.Services.AddTransient<ContaFlow.Application.Events.IDomainEventHandler<ContaFlow.Domain.Events.AccountBalanceChangedEvent>, ContaFlow.Application.Events.Handlers.AccountBalanceChangedEventHandler>();

// ══════════════════════════════════════════════════════════════════
// REDIS - Cache distribuido y locks
// ══════════════════════════════════════════════════════════════════
builder.Services.AddRedisCaching(builder.Configuration);

// ══════════════════════════════════════════════════════════════════
// AUTHENTICATION - JWT Bearer
// ══════════════════════════════════════════════════════════════════
var jwtKey = builder.Configuration["Jwt:Key"] ?? "contaflow_secret_key_minimum_32_characters!!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ContaFlow.API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ContaFlow.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(5) // Tolerancia de 5 minutos para expiración
    };

    // Eventos para logging de auth
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Log.Warning("Autenticación fallida: {Error}", context.Exception.Message);
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var claims = context.Principal?.Claims.ToList();
            Log.Debug("Token validado para usuario: {UserId}", claims?.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
    options.AddPolicy("ContadorOrAdmin", policy => policy.RequireRole("admin", "contador"));
});

// RBAC - Proveedor de políticas dinámicas y handler de permisos granulares
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();

// ══════════════════════════════════════════════════════════════════
// HEALTH CHECKS - Monitoreo de servicios dependientes
// ══════════════════════════════════════════════════════════════════
builder.Services.AddHealthChecks()
    .AddNpgSql(
        connectionString,
        name: "postgresql",
        tags: new[] { "db", "postgresql", "ready" })
    .AddRedis(
        builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379",
        name: "redis",
        tags: new[] { "cache", "redis", "ready" })
    .AddUrlGroup(
        new Uri(builder.Configuration["HealthChecks:Kafka"] ?? "http://localhost:8083/health"),
        name: "kafka-connect",
        tags: new[] { "messaging", "kafka" });

// ══════════════════════════════════════════════════════════════════
// PROBLEM DETAILS - Manejo estandarizado de errores HTTP
// ══════════════════════════════════════════════════════════════════
builder.Services.AddProblemDetails(options =>
{
    options.IncludeExceptionDetails = (_, _) => builder.Environment.IsDevelopment();

    // Mapear excepciones custom a códigos de estado HTTP
    options.MapToStatusCode<ArgumentException>(StatusCodes.Status400BadRequest);
    options.MapToStatusCode<ArgumentNullException>(StatusCodes.Status400BadRequest);
    options.MapToStatusCode<InvalidOperationException>(StatusCodes.Status409Conflict);
    options.MapToStatusCode<KeyNotFoundException>(StatusCodes.Status404NotFound);
});

// ══════════════════════════════════════════════════════════════════
// SWAGGER / OPENAPI - Documentación de la API
// ══════════════════════════════════════════════════════════════════
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ContaFlow ERP API",
        Version = "v1",
        Description = "API RESTful para el sistema ERP Contable ContaFlow. " +
                      "Gestión de plan de cuentas, asientos contables, facturación, " +
                      "pagos/cobros y auditoría para empresas argentinas.",
        Contact = new OpenApiContact
        {
            Name = "ContaFlow",
            Email = "api@contaflow.com",
            Url = new Uri("https://contaflow.com")
        },
        License = new OpenApiLicense
        {
            Name = "Propietario",
            Url = new Uri("https://contaflow.com/license")
        }
    });

    // Configuración JWT para Swagger
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header usando Bearer scheme. Ejemplo: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Incluir comentarios XML de documentación
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

// ══════════════════════════════════════════════════════════════════
// RATE LIMITING - Proteccion contra abuso de API
// ══════════════════════════════════════════════════════════════════
builder.Services.AddRateLimiter(options =>
{
    // Rate limit global: 100 requests/min por IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 20,
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = retryAfter.TotalSeconds.ToString();
        }
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc6585#section-4.4",
            title = "Too Many Requests",
            status = 429,
            detail = "Demasiadas solicitudes. Intenta nuevamente en unos momentos.",
        }, cancellationToken);
    };
});

// ══════════════════════════════════════════════════════════════════
// MIDDLEWARE - Pipeline de la aplicacion
// ══════════════════════════════════════════════════════════════════
var app = builder.Build();

// ══════════════════════════════════════════════════════════════════
// CONFIGURAR MIDDLEWARE PIPELINE
// ══════════════════════════════════════════════════════════════════

// Exception handling (debe ser el primero)
app.UseProblemDetails();

// Logging de solicitudes HTTP
app.UseSerilogRequestLogging();

// Auditoria de solicitudes HTTP mutativas (POST, PUT, DELETE, PATCH)
app.UseMiddleware<AuditMiddleware>();

// Rate limiting (antes de routing y CORS)
app.UseRateLimiter();

// CORS (antes de routing)
app.UseCors("Frontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "ContaFlow ERP API v1");
        options.RoutePrefix = "swagger"; // Accesible en /swagger
        options.DocumentTitle = "ContaFlow ERP - Documentación de API";
    });
}

// Seguridad
app.UseAuthentication();
app.UseAuthorization();

// ══════════════════════════════════════════════════════════════════
// ENDPOINTS - Configuración de rutas
// ══════════════════════════════════════════════════════════════════
app.MapControllers();

// Health checks con respuestas detalladas
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var result = System.Text.Json.JsonSerializer.Serialize(new
        {
            status = report.Status.ToString(),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            }),
            totalDurationMs = report.TotalDuration.TotalMilliseconds
        });
        await context.Response.WriteAsync(result);
    }
});

// Health check simple para load balancers (solo 200/503)
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false // Siempre responde 200 si el servicio está vivo
});

// ══════════════════════════════════════════════════════════════════
// AUTO-MIGRATIONS - Aplicar migraciones automáticamente en desarrollo o cuando AutoMigrate=true
// ══════════════════════════════════════════════════════════════════
// Auto-migrate in Development or when ASPNETCORE_AUTO_MIGRATE is set
var autoMigrate = app.Environment.IsDevelopment() || 
    builder.Configuration.GetValue<bool>("AutoMigrate");
if (autoMigrate)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Log.Information("Aplicando migraciones pendientes a la base de datos...");
    try
    {
        await dbContext.Database.MigrateAsync();
        Log.Information("Migraciones aplicadas exitosamente");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Error al aplicar migraciones. Asegúrese de que PostgreSQL esté disponible.");
    }
}

// ══════════════════════════════════════════════════════════════════
// INICIO DE LA APLICACIÓN
// ══════════════════════════════════════════════════════════════════
Log.Information("═══════════════════════════════════════════════════");
Log.Information("  ContaFlow ERP API - Iniciando...");
Log.Information("  Ambiente: {Environment}", app.Environment.EnvironmentName);
Log.Information("  URLs: {Urls}", string.Join(", ", app.Urls));
Log.Information("  Kafka: {KafkaEnabled}", builder.Configuration.GetValue<bool>("Kafka:Enabled") ? "Habilitado" : "Deshabilitado");
Log.Information("  Redis: {RedisEnabled}", builder.Configuration.GetValue<bool>("Redis:Enabled") ? "Habilitado" : "Deshabilitado");
Log.Information("  Email: {EmailEnabled}", builder.Configuration.GetValue<bool>("Email:Enabled") ? "Habilitado" : "Deshabilitado (solo log)");
Log.Information("═══════════════════════════════════════════════════");

app.Run();
