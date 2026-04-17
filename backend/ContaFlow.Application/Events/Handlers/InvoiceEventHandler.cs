using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using ContaFlow.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de facturación: actualiza resúmenes de cliente,
/// invalida caché de reportes y prepara notificaciones.
/// </summary>
public class InvoiceCreatedEventHandler : IDomainEventHandler<InvoiceCreatedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;
    private readonly ILogger<InvoiceCreatedEventHandler> _logger;

    public InvoiceCreatedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        IEmailService emailService,
        ILogger<InvoiceCreatedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task HandleAsync(InvoiceCreatedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Factura {Number} creada — Tipo: {Type}, Total: ${Total:N2}, IVA: ${Tax:N2}",
            domainEvent.InvoiceNumber, domainEvent.Type, domainEvent.Total, domainEvent.Tax);

        // Actualizar resumen de balance del cliente si la factura tiene cliente asociado
        var invoice = await _unitOfWork.Invoices.GetByIdAsync(domainEvent.InvoiceId, cancellationToken);
        if (invoice != null && !string.IsNullOrEmpty(invoice.ClientId))
        {
            var client = await _unitOfWork.Clients.GetByIdAsync(invoice.ClientId, cancellationToken);
            if (client != null)
            {
                // Incrementar el balance pendiente del cliente
                client.Balance += domainEvent.Total;
                await _unitOfWork.Clients.UpdateAsync(client, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Balance del cliente {ClientId} actualizado: ${Balance:N2} (+${Amount:N2})",
                    client.Id, client.Balance, domainEvent.Total);

                // Enviar notificación por email al cliente
                if (!string.IsNullOrEmpty(client.Email))
                {
                    await _emailService.SendInvoiceCreatedAsync(
                        client.Email, client.Name, domainEvent.InvoiceNumber,
                        domainEvent.Total, domainEvent.Type, cancellationToken);
                }

                // Invalidar caché del cliente y dashboard
                await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:clients:{client.Id}", cancellationToken);
                await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:clients:list", cancellationToken);
            }
        }

        // Invalidar caché de facturación y reportes
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:invoices", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);
    }
}

/// <summary>
/// Maneja cambios de estado de factura: notifica pagos completados
/// e invalida caché de reportes financieros.
/// </summary>
public class InvoiceStatusChangedEventHandler : IDomainEventHandler<InvoiceStatusChangedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;
    private readonly ILogger<InvoiceStatusChangedEventHandler> _logger;

    public InvoiceStatusChangedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        IEmailService emailService,
        ILogger<InvoiceStatusChangedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task HandleAsync(InvoiceStatusChangedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Factura {Number}: estado cambiado de '{Previous}' a '{New}'",
            domainEvent.InvoiceNumber, domainEvent.PreviousStatus, domainEvent.NewStatus);

        // Cuando la factura se marca como pagada, enviar notificación por email al cliente
        if (domainEvent.NewStatus == "pagada")
        {
            _logger.LogInformation(
                "Factura {Number} completamente pagada — enviando notificación por email",
                domainEvent.InvoiceNumber);

            // Buscar la factura y el cliente para enviar el email
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(domainEvent.InvoiceId, cancellationToken);
            if (invoice != null && !string.IsNullOrEmpty(invoice.ClientId))
            {
                var client = await _unitOfWork.Clients.GetByIdAsync(invoice.ClientId, cancellationToken);
                if (client != null && !string.IsNullOrEmpty(client.Email))
                {
                    await _emailService.SendInvoicePaidAsync(
                        client.Email, client.Name, domainEvent.InvoiceNumber,
                        invoice.Total, cancellationToken);

                    _logger.LogInformation(
                        "Email de factura pagada enviado a {Email} para factura {Number}",
                        client.Email, domainEvent.InvoiceNumber);
                }
            }

            // Invalidar caché del cliente (balance cambió)
            await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:clients", cancellationToken);
            await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports:income-statement", cancellationToken);
            await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports:iva", cancellationToken);
        }
        else
        {
            // Para otros cambios de estado, enviar notificación genérica de cambio de estado
            var statusInvoice = await _unitOfWork.Invoices.GetByIdAsync(domainEvent.InvoiceId, cancellationToken);
            if (statusInvoice != null && !string.IsNullOrEmpty(statusInvoice.ClientId))
            {
                var statusClient = await _unitOfWork.Clients.GetByIdAsync(statusInvoice.ClientId, cancellationToken);
                if (statusClient != null && !string.IsNullOrEmpty(statusClient.Email))
                {
                    await _emailService.SendInvoiceStatusChangedAsync(
                        statusClient.Email, statusClient.Name, domainEvent.InvoiceNumber,
                        statusInvoice.Total, domainEvent.PreviousStatus, domainEvent.NewStatus, cancellationToken);
                }
            }
        }

        // Invalidar caché de facturas y dashboard para cualquier cambio de estado
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:invoices", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);

        await Task.CompletedTask;
    }
}
