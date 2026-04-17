using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Payments;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de pagos y cobros.
/// Actualiza saldos de factura, cliente/proveedor y cuenta bancaria.
/// </summary>
public class PaymentService : IPaymentService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventDispatcher _eventDispatcher;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(IUnitOfWork unitOfWork, IEventDispatcher eventDispatcher, ILogger<PaymentService> logger)
    {
        _unitOfWork = unitOfWork;
        _eventDispatcher = eventDispatcher;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<PaymentDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        var payments = (await _unitOfWork.Payments.GetAllAsync(cancellationToken))
            .Where(p => p.CompanyId == companyId)
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(type))
            payments = payments.Where(p => p.Type == type);

        payments = payments.OrderByDescending(p => p.Date);

        var totalCount = payments.Count();
        var paged = payments
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = paged.Select(MapToDto).ToList();

        var result = new PagedResult<PaymentDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<PaymentDto>>.Ok(result);
    }

    public async Task<ApiResponse<PaymentDto>> GetByIdAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default)
    {
        var payment = await _unitOfWork.Payments.GetByIdAsync(id, cancellationToken);
        if (payment == null || payment.CompanyId != companyId)
            return ApiResponse<PaymentDto>.Fail("Pago no encontrado", "NOT_FOUND");

        return ApiResponse<PaymentDto>.Ok(MapToDto(payment));
    }

    public async Task<ApiResponse<PaymentDto>> CreateAsync(
        string companyId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        // Validar factura si se especifica
        if (!string.IsNullOrEmpty(request.InvoiceId))
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId, cancellationToken);
            if (invoice == null || invoice.CompanyId != companyId)
                return ApiResponse<PaymentDto>.Fail("Factura no encontrada", "INVOICE_NOT_FOUND");

            var balanceDue = invoice.Total - invoice.AmountPaid;
            if (request.Amount > balanceDue)
                return ApiResponse<PaymentDto>.Fail(
                    $"El monto ({request.Amount:F2}) excede el saldo pendiente ({balanceDue:F2})",
                    "AMOUNT_EXCEEDS_BALANCE");
        }

        var payment = new Payment
        {
            Number = request.Number,
            Date = request.Date,
            Amount = request.Amount,
            Method = request.Method,
            Type = request.Type,
            Reference = request.Reference,
            Notes = request.Notes,
            InvoiceId = request.InvoiceId,
            ClientId = request.ClientId,
            ProviderId = request.ProviderId,
            BankAccountId = request.BankAccountId,
            CompanyId = companyId
        };

        await _unitOfWork.Payments.AddAsync(payment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Actualizar saldo de factura
        if (!string.IsNullOrEmpty(request.InvoiceId))
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId, cancellationToken);
            if (invoice != null)
            {
                var previousInvoiceStatus = invoice.Status;
                invoice.AmountPaid += request.Amount;
                if (invoice.AmountPaid >= invoice.Total)
                    invoice.Status = "pagada";
                else if (invoice.AmountPaid > 0)
                    invoice.Status = "parcial";
                await _unitOfWork.Invoices.UpdateAsync(invoice, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                // Publicar evento de cambio de estado de factura
                if (invoice.Status != previousInvoiceStatus)
                {
                    try
                    {
                        var invoiceStatusEvent = new InvoiceStatusChangedEvent
                        {
                            EventType = nameof(InvoiceStatusChangedEvent),
                            CompanyId = companyId,
                            InvoiceId = invoice.Id,
                            InvoiceNumber = invoice.Number,
                            PreviousStatus = previousInvoiceStatus,
                            NewStatus = invoice.Status,
                            Reason = $"Pago {payment.Number} registrado"
                        };
                        await _eventDispatcher.DispatchAsync(invoiceStatusEvent, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to dispatch InvoiceStatusChangedEvent for invoice {InvoiceId}", invoice.Id);
                    }
                }
            }
        }

        // Publicar evento de pago creado
        try
        {
            var createdEvent = new PaymentCreatedEvent
            {
                EventType = nameof(PaymentCreatedEvent),
                CompanyId = companyId,
                PaymentId = payment.Id,
                PaymentNumber = payment.Number,
                Type = payment.Type,
                Amount = payment.Amount,
                Method = payment.Method,
                InvoiceId = payment.InvoiceId
            };
            await _eventDispatcher.DispatchAsync(createdEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch PaymentCreatedEvent for payment {PaymentId}", payment.Id);
        }

        return ApiResponse<PaymentDto>.Ok(MapToDto(payment), "Pago registrado exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default)
    {
        var payment = await _unitOfWork.Payments.GetByIdAsync(id, cancellationToken);
        if (payment == null || payment.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Pago no encontrado", "NOT_FOUND");

        // Reversar saldo de factura
        if (!string.IsNullOrEmpty(payment.InvoiceId))
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(payment.InvoiceId, cancellationToken);
            if (invoice != null)
            {
                var previousInvoiceStatus = invoice.Status;
                invoice.AmountPaid -= payment.Amount;
                if (invoice.AmountPaid <= 0)
                {
                    invoice.AmountPaid = 0;
                    invoice.Status = "pendiente";
                }
                else
                {
                    invoice.Status = "parcial";
                }
                await _unitOfWork.Invoices.UpdateAsync(invoice, cancellationToken);

                // Publicar evento de cambio de estado de factura
                if (invoice.Status != previousInvoiceStatus)
                {
                    try
                    {
                        var invoiceStatusEvent = new InvoiceStatusChangedEvent
                        {
                            EventType = nameof(InvoiceStatusChangedEvent),
                            CompanyId = companyId,
                            InvoiceId = invoice.Id,
                            InvoiceNumber = invoice.Number,
                            PreviousStatus = previousInvoiceStatus,
                            NewStatus = invoice.Status,
                            Reason = $"Pago {payment.Number} eliminado"
                        };
                        await _eventDispatcher.DispatchAsync(invoiceStatusEvent, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to dispatch InvoiceStatusChangedEvent for invoice {InvoiceId}", invoice.Id);
                    }
                }
            }
        }

        await _unitOfWork.Payments.DeleteAsync(payment, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de pago eliminado
        try
        {
            var deletedEvent = new PaymentDeletedEvent
            {
                EventType = nameof(PaymentDeletedEvent),
                CompanyId = companyId,
                PaymentId = payment.Id,
                Amount = payment.Amount,
                InvoiceId = payment.InvoiceId
            };
            await _eventDispatcher.DispatchAsync(deletedEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch PaymentDeletedEvent for payment {PaymentId}", payment.Id);
        }

        return ApiResponse<bool>.Ok(true, "Pago eliminado exitosamente");
    }

    private static PaymentDto MapToDto(Payment payment)
    {
        return new PaymentDto
        {
            Id = payment.Id,
            Number = payment.Number,
            Date = payment.Date,
            Amount = payment.Amount,
            Method = payment.Method,
            Type = payment.Type,
            Reference = payment.Reference,
            Notes = payment.Notes,
            InvoiceId = payment.InvoiceId,
            InvoiceNumber = payment.Invoice?.Number,
            ClientId = payment.ClientId,
            ClientName = payment.Client?.Name,
            ProviderId = payment.ProviderId,
            ProviderName = payment.Provider?.Name,
            BankAccountId = payment.BankAccountId,
            BankAccountName = payment.BankAccount?.Name,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}
