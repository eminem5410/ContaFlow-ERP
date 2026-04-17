using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Invoices;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de facturación electrónica.
/// </summary>
public interface IInvoiceService
{
    /// <summary>
    /// Obtiene todas las facturas de la empresa, paginadas.
    /// </summary>
    Task<ApiResponse<PagedResult<InvoiceDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? status = null,
        string? type = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene una factura por su ID con todos sus ítems.
    /// </summary>
    Task<ApiResponse<InvoiceDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea una nueva factura con sus ítems (calcula totales automáticamente).
    /// </summary>
    Task<ApiResponse<InvoiceDto>> CreateAsync(
        string companyId,
        CreateInvoiceRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Anula una factura existente.
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default);
}
