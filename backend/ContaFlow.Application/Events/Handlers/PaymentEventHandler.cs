using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de pagos/cobros: actualiza estado de factura asociada,
/// recalcula monto pagado, y invalida caché de reportes.
/// </summary>
public class PaymentCreatedEventHandler : IDomainEventHandler<PaymentCreatedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;
    private readonly ILogger<PaymentCreatedEventHandler> _logger;

    public PaymentCreatedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        IEmailService emailService,
        ILogger<PaymentCreatedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentCreatedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "{Type} #{Number} registrado — Monto: ${Amount:N2}, Método: {Method}",
            domainEvent.Type == "cobro" ? "Cobro" : "Pago",
            domainEvent.PaymentNumber,
            domainEvent.Amount,
            domainEvent.Method);

        // Actualizar estado de la factura asociada al pago
        if (!string.IsNullOrEmpty(domainEvent.InvoiceId))
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(domainEvent.InvoiceId, cancellationToken);
            if (invoice != null)
            {
                invoice.AmountPaid += domainEvent.Amount;

                // Determinar nuevo estado según monto pagado
                if (invoice.AmountPaid >= invoice.Total - 0.01)
                {
                    invoice.Status = "pagada";
                    invoice.AmountPaid = invoice.Total; // Redondeo final
                }
                else
                {
                    invoice.Status = "parcial";
                }

                await _unitOfWork.Invoices.UpdateAsync(invoice, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Factura {InvoiceId} actualizada: AmountPaid=${AmountPaid:N2}, Status={Status}",
                    invoice.Id, invoice.AmountPaid, invoice.Status);

                // Enviar notificación por email de pago recibido al cliente
                if (!string.IsNullOrEmpty(invoice.ClientId))
                {
                    var client = await _unitOfWork.Clients.GetByIdAsync(invoice.ClientId, cancellationToken);
                    if (client != null && !string.IsNullOrEmpty(client.Email))
                    {
                        await _emailService.SendPaymentReceivedAsync(
                            client.Email, client.Name, domainEvent.InvoiceId,
                            domainEvent.Amount, cancellationToken);

                        _logger.LogInformation(
                            "Email de pago recibido enviado a {Email} por ${Amount:N2}",
                            client.Email, domainEvent.Amount);
                    }
                }

                // Invalidar caché de factura y cliente
                await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:invoices:{invoice.Id}", cancellationToken);
                if (!string.IsNullOrEmpty(invoice.ClientId))
                {
                    await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:clients:{invoice.ClientId}", cancellationToken);
                }
            }
        }

        // Invalidar caché de pagos y dashboard
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:payments", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports", cancellationToken);
    }
}

/// <summary>
/// Maneja eventos de eliminación de pagos: revierte el estado de la factura asociada.
/// </summary>
public class PaymentDeletedEventHandler : IDomainEventHandler<PaymentDeletedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly ILogger<PaymentDeletedEventHandler> _logger;

    public PaymentDeletedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        ILogger<PaymentDeletedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task HandleAsync(PaymentDeletedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning(
            "Pago {PaymentId} eliminado — Monto: ${Amount:N2}. Factura asociada: {InvoiceId}",
            domainEvent.PaymentId, domainEvent.Amount, domainEvent.InvoiceId ?? "N/A");

        // Revertir el estado de la factura asociada
        if (!string.IsNullOrEmpty(domainEvent.InvoiceId))
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(domainEvent.InvoiceId, cancellationToken);
            if (invoice != null)
            {
                var previousStatus = invoice.Status;

                // Reversar el monto pagado
                invoice.AmountPaid -= domainEvent.Amount;

                if (invoice.AmountPaid <= 0.01)
                {
                    invoice.AmountPaid = 0;
                    invoice.Status = "pendiente";
                }
                else
                {
                    invoice.Status = "parcial";
                }

                await _unitOfWork.Invoices.UpdateAsync(invoice, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Factura {InvoiceId} revertida: {PrevStatus} → {NewStatus}, AmountPaid=${AmountPaid:N2}",
                    invoice.Id, previousStatus, invoice.Status, invoice.AmountPaid);

                // Invalidar caché de factura y cliente
                await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:invoices:{invoice.Id}", cancellationToken);
                if (!string.IsNullOrEmpty(invoice.ClientId))
                {
                    await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:clients:{invoice.ClientId}", cancellationToken);
                }
            }
        }

        // Invalidar caché de pagos y dashboard
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:payments", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);
    }
}
