using ContaFlow.Application.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Infrastructure.Services;

/// <summary>
/// Servicio de fondo (HostedService) que consume la cola de emails
/// y los envía de forma asincrónica sin bloquear las solicitudes HTTP.
/// Se registra como Singleton para que haya un único consumidor.
/// </summary>
public class EmailQueueBackgroundService : BackgroundService
{
    private readonly IEmailQueueService _queue;
    private readonly ILogger<EmailQueueBackgroundService> _logger;

    public EmailQueueBackgroundService(IEmailQueueService queue, ILogger<EmailQueueBackgroundService> logger)
    {
        _queue = queue;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Esperar un poco al inicio para que la aplicación esté lista
        await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

        _logger.LogInformation("EmailQueueBackgroundService: Iniciado — procesando cola de emails en background");

        try
        {
            // Procesar la cola hasta que se cancele el servicio
            if (_queue is EmailQueueService emailQueueService)
            {
                await emailQueueService.ProcessQueueAsync(stoppingToken);
            }
            else
            {
                _logger.LogWarning("EmailQueueBackgroundService: IEmailQueueService no es EmailQueueService — no se puede procesar la cola");
                // Esperar indefinidamente hasta cancelación
                await Task.Delay(Timeout.Infinite, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("EmailQueueBackgroundService: Detenido por cancelación");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "EmailQueueBackgroundService: Error inesperado en el procesamiento de la cola");
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("EmailQueueBackgroundService: Deteniendo — completando trabajos pendientes ({Pending})...",
            _queue.PendingCount);

        await base.StopAsync(cancellationToken);
    }
}
