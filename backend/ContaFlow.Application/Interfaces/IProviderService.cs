using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Providers;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de gestión de proveedores.
/// </summary>
public interface IProviderService
{
    /// <summary>
    /// Obtiene todos los proveedores de la empresa, opcionalmente filtrados y paginados.
    /// </summary>
    Task<ApiResponse<PagedResult<ProviderDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene un proveedor por su ID.
    /// </summary>
    Task<ApiResponse<ProviderDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea un nuevo proveedor. Si no se proporciona código, se genera automáticamente (PRO-001).
    /// </summary>
    Task<ApiResponse<ProviderDto>> CreateAsync(string companyId, CreateProviderRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza los datos de un proveedor existente.
    /// </summary>
    Task<ApiResponse<ProviderDto>> UpdateAsync(string companyId, string id, UpdateProviderRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina un proveedor.
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default);
}
