using System.Diagnostics;
using System.Security.Claims;

namespace ContaFlow.API.Middleware;

/// <summary>
/// Middleware de auditoría que registra las solicitudes HTTP mutativas (POST, PUT, DELETE, PATCH).
/// Captura información del usuario, método, ruta, código de estado y duración de la solicitud.
/// </summary>
public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;

    /// <summary>
    /// Inicializa una nueva instancia del middleware de auditoría.
    /// </summary>
    /// <param name="next">Delegate que representa el siguiente middleware en el pipeline.</param>
    /// <param name="logger">Logger estructurado para registrar eventos de auditoría.</param>
    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invoca el middleware, procesa la solicitud y registra la auditoría para operaciones mutativas.
    /// </summary>
    /// <param name="context">Contexto HTTP de la solicitud actual.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var method = context.Request.Method;
            var path = context.Request.Path;
            var statusCode = context.Response.StatusCode;
            var duration = stopwatch.ElapsedMilliseconds;

            // Solo auditar solicitudes mutativas (no GET, HEAD, OPTIONS)
            if (method != "GET" && method != "HEAD" && method != "OPTIONS")
            {
                _logger.LogInformation(
                    "[AUDIT] User={UserId} Method={Method} Path={Path} Status={StatusCode} Duration={Duration}ms",
                    userId, method, path, statusCode, duration);
            }
        }
    }
}
