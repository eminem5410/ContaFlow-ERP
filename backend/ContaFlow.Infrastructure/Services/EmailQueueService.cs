using System.Threading.Channels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.Infrastructure.Services;

/// <summary>
/// Cola de fondo para envío asincrónico de emails usando System.Threading.Channels.
/// Los productores (handlers de dominio) encolan trabajos sin bloquear.
/// Un BackgroundService consumidor los procesa secuencialmente.
/// </summary>
public class EmailQueueService : IEmailQueueService, IDisposable
{
    private readonly Channel<EmailJob> _channel;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailQueueService> _logger;
    private int _pendingCount;

    public EmailQueueService(IServiceScopeFactory scopeFactory, ILogger<EmailQueueService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;

        // Canal con capacidad limitada para evitar memory leaks
        var options = new BoundedChannelOptions(capacity: 1000)
        {
            SingleWriter = false,
            SingleReader = true,
            FullMode = BoundedChannelFullMode.DropOldest // Descartar emails más antiguos si se satura
        };

        _channel = Channel.CreateBounded<EmailJob>(options);
    }

    /// <inheritdoc />
    public int PendingCount => _pendingCount;

    /// <inheritdoc />
    public ValueTask QueueAsync(string to, string subject, string body, bool isHtml = true)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = subject,
            Body = body,
            IsHtml = isHtml,
            JobType = "generic"
        });
    }

    /// <inheritdoc />
    public ValueTask QueueInvoiceCreatedAsync(string to, string clientName, string invoiceNumber, double total, string type)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = $"ContaFlow — Nueva factura {invoiceNumber}",
            JobType = "invoice_created"
        });
    }

    /// <inheritdoc />
    public ValueTask QueueInvoicePaidAsync(string to, string clientName, string invoiceNumber, double amount)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = $"ContaFlow — Factura {invoiceNumber} pagada",
            JobType = "invoice_paid"
        });
    }

    /// <inheritdoc />
    public ValueTask QueueInvoiceStatusChangedAsync(string to, string clientName, string invoiceNumber, double total, string previousStatus, string newStatus)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = $"ContaFlow — Factura {invoiceNumber}: {previousStatus.ToUpper()} -> {newStatus.ToUpper()}",
            JobType = "invoice_status_changed"
        });
    }

    /// <inheritdoc />
    public ValueTask QueuePaymentReceivedAsync(string to, string clientName, string invoiceNumber, double amount)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = $"ContaFlow — Pago recibido de {clientName}",
            JobType = "payment_received"
        });
    }

    /// <inheritdoc />
    public ValueTask QueueWelcomeEmailAsync(string to, string userName, string companyName)
    {
        return EnqueueAsync(new EmailJob
        {
            To = to,
            Subject = $"Bienvenido a ContaFlow, {userName}",
            JobType = "welcome"
        });
    }

    /// <summary>
    /// Lee jobs del canal y los envía mediante IEmailService (resuelto via IServiceScopeFactory).
    /// Cada email se procesa en su propio scope para evitar capturar el servicio Scoped en un Singleton.
    /// </summary>
    public async Task ProcessQueueAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("EmailQueueService: Iniciando procesamiento de cola de emails");

        try
        {
            await foreach (var job in _channel.Reader.ReadAllAsync(cancellationToken))
            {
                Interlocked.Decrement(ref _pendingCount);

                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    var success = await emailService.SendAsync(job.To, job.Subject, job.Body, job.IsHtml, cancellationToken);

                    if (success)
                    {
                        _logger.LogDebug(
                            "Email [{JobType}] enviado a {To} con asunto: {Subject}",
                            job.JobType, job.To, job.Subject);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Email [{JobType}] NO enviado a {To} — Subject: {Subject}",
                            job.JobType, job.To, job.Subject);
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("EmailQueueService: Procesamiento cancelado");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Error procesando email [{JobType}] para {To}",
                        job.JobType, job.To);
                    // Continuar con el siguiente email — no propagar errores
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("EmailQueueService: Canal cerrado — deteniendo procesamiento");
        }
    }

    private ValueTask EnqueueAsync(EmailJob job)
    {
        Interlocked.Increment(ref _pendingCount);

        if (!_channel.Writer.TryWrite(job))
        {
            Interlocked.Decrement(ref _pendingCount);
            _logger.LogWarning(
                "Cola de emails llena — descartando email [{JobType}] para {To}",
                job.JobType, job.To);
        }
        else
        {
            _logger.LogDebug(
                "Email [{JobType}] encolado para {To} — Pendientes: {Pending}",
                job.JobType, job.To, _pendingCount);
        }

        return ValueTask.CompletedTask;
    }

    /// <summary>
    /// Completa el canal para que el consumidor termine de procesar los jobs restantes.
    /// </summary>
    public void Complete() => _channel.Writer.TryComplete();

    public void Dispose()
    {
        Complete();
    }
}
