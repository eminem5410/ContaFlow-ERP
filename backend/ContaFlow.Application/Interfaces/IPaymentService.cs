using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Payments;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de pagos y cobros.
/// </summary>
public interface IPaymentService
{
    /// <summary>
    /// Obtiene todos los pagos/cobros de la empresa, paginados.
    /// </summary>
    Task<ApiResponse<PagedResult<PaymentDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? type = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene un pago por su ID.
    /// </summary>
    Task<ApiResponse<PaymentDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra un nuevo pago o cobro, actualizando saldos de factura y cliente/proveedor.
    /// </summary>
    Task<ApiResponse<PaymentDto>> CreateAsync(
        string companyId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina un pago/cobro (reversa los saldos).
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default);
}
