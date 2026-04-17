using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Invoices;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de facturación.
/// Calcula totales automáticamente y gestiona estados de factura.
/// </summary>
public class InvoiceService : IInvoiceService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventDispatcher _eventDispatcher;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(IUnitOfWork unitOfWork, IEventDispatcher eventDispatcher, ILogger<InvoiceService> logger)
    {
        _unitOfWork = unitOfWork;
        _eventDispatcher = eventDispatcher;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<InvoiceDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default)
    {
        var invoices = (await _unitOfWork.Invoices.GetAllAsync(cancellationToken))
            .Where(i => i.CompanyId == companyId)
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(status))
            invoices = invoices.Where(i => i.Status == status);

        if (!string.IsNullOrWhiteSpace(type))
            invoices = invoices.Where(i => i.Type == type);

        invoices = invoices.OrderByDescending(i => i.Date);

        var totalCount = invoices.Count();
        var paged = invoices
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = paged.Select(MapToDto).ToList();

        var result = new PagedResult<InvoiceDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<InvoiceDto>>.Ok(result);
    }

    public async Task<ApiResponse<InvoiceDto>> GetByIdAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default)
    {
        var invoice = await _unitOfWork.Invoices.GetByIdAsync(id, cancellationToken);
        if (invoice == null || invoice.CompanyId != companyId)
            return ApiResponse<InvoiceDto>.Fail("Factura no encontrada", "NOT_FOUND");

        return ApiResponse<InvoiceDto>.Ok(MapToDto(invoice));
    }

    public async Task<ApiResponse<InvoiceDto>> CreateAsync(
        string companyId,
        CreateInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        // Verificar cliente si se especifica
        if (!string.IsNullOrEmpty(request.ClientId))
        {
            var client = await _unitOfWork.Clients.GetByIdAsync(request.ClientId, cancellationToken);
            if (client == null || client.CompanyId != companyId)
                return ApiResponse<InvoiceDto>.Fail("Cliente no encontrado", "CLIENT_NOT_FOUND");
        }

        // Calcular totales de cada ítem
        var items = request.Items.Select(item =>
        {
            var subtotal = item.Quantity * item.UnitPrice;
            var taxAmount = subtotal * (item.TaxRate / 100);

            return new InvoiceItem
            {
                Description = item.Description,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Subtotal = subtotal,
                TaxRate = item.TaxRate,
                TaxAmount = taxAmount
            };
        }).ToList();

        var netTotal = items.Sum(i => i.Subtotal);
        var tax = items.Sum(i => i.TaxAmount);
        var total = netTotal + tax;

        var invoice = new Invoice
        {
            Number = request.Number,
            Type = request.Type,
            Date = request.Date,
            DueDate = request.DueDate,
            NetTotal = netTotal,
            Tax = tax,
            Total = total,
            AmountPaid = 0,
            Status = "pendiente",
            Notes = request.Notes,
            ClientId = request.ClientId,
            CompanyId = companyId,
            Items = items
        };

        await _unitOfWork.Invoices.AddAsync(invoice, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de factura creada
        try
        {
            var createdEvent = new InvoiceCreatedEvent
            {
                EventType = nameof(InvoiceCreatedEvent),
                CompanyId = companyId,
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.Number,
                Type = invoice.Type,
                Total = invoice.Total,
                Tax = invoice.Tax,
                NetTotal = invoice.NetTotal
            };
            await _eventDispatcher.DispatchAsync(createdEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch InvoiceCreatedEvent for invoice {InvoiceId}", invoice.Id);
        }

        return ApiResponse<InvoiceDto>.Ok(MapToDto(invoice), "Factura creada exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default)
    {
        var invoice = await _unitOfWork.Invoices.GetByIdAsync(id, cancellationToken);
        if (invoice == null || invoice.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Factura no encontrada", "NOT_FOUND");

        if (invoice.AmountPaid > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar una factura con pagos asociados", "HAS_PAYMENTS");

        var previousStatus = invoice.Status;
        invoice.Status = "anulada";
        invoice.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Invoices.UpdateAsync(invoice, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de cambio de estado de factura
        try
        {
            var statusChangedEvent = new InvoiceStatusChangedEvent
            {
                EventType = nameof(InvoiceStatusChangedEvent),
                CompanyId = companyId,
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.Number,
                PreviousStatus = previousStatus,
                NewStatus = invoice.Status,
                Reason = "Factura anulada"
            };
            await _eventDispatcher.DispatchAsync(statusChangedEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch InvoiceStatusChangedEvent for invoice {InvoiceId}", invoice.Id);
        }

        return ApiResponse<bool>.Ok(true, "Factura anulada exitosamente");
    }

    private static InvoiceDto MapToDto(Invoice invoice)
    {
        return new InvoiceDto
        {
            Id = invoice.Id,
            Number = invoice.Number,
            Type = invoice.Type,
            Date = invoice.Date,
            DueDate = invoice.DueDate,
            Total = invoice.Total,
            Tax = invoice.Tax,
            NetTotal = invoice.NetTotal,
            AmountPaid = invoice.AmountPaid,
            Status = invoice.Status,
            Notes = invoice.Notes,
            ClientId = invoice.ClientId,
            ClientName = invoice.Client?.Name,
            Items = invoice.Items.Select(i => new InvoiceItemDto
            {
                Id = i.Id,
                Description = i.Description,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Subtotal = i.Subtotal,
                TaxRate = i.TaxRate,
                TaxAmount = i.TaxAmount
            }).ToList(),
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt
        };
    }
}
