using ContaFlow.Application.DTOs.Clients;
using ContaFlow.Application.DTOs.Common;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de gestión de clientes.
/// </summary>
public interface IClientService
{
    /// <summary>
    /// Obtiene todos los clientes de la empresa, opcionalmente filtrados y paginados.
    /// </summary>
    Task<ApiResponse<PagedResult<ClientDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene un cliente por su ID.
    /// </summary>
    Task<ApiResponse<ClientDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea un nuevo cliente. Si no se proporciona código, se genera automáticamente (CLI-001).
    /// </summary>
    Task<ApiResponse<ClientDto>> CreateAsync(string companyId, CreateClientRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza los datos de un cliente existente.
    /// </summary>
    Task<ApiResponse<ClientDto>> UpdateAsync(string companyId, string id, UpdateClientRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina un cliente. Solo se puede eliminar si no tiene facturas asociadas.
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default);
}
