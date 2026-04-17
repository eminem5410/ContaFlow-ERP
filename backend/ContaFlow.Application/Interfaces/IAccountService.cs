using ContaFlow.Application.DTOs.Accounts;
using ContaFlow.Application.DTOs.Common;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de plan de cuentas contables.
/// </summary>
public interface IAccountService
{
    /// <summary>
    /// Obtiene todas las cuentas de la empresa, opcionalmente filtradas y paginadas.
    /// </summary>
    Task<ApiResponse<PagedResult<AccountDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene una cuenta por su ID.
    /// </summary>
    Task<ApiResponse<AccountDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea una nueva cuenta en el plan contable.
    /// </summary>
    Task<ApiResponse<AccountDto>> CreateAsync(string companyId, CreateAccountRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza una cuenta existente.
    /// </summary>
    Task<ApiResponse<AccountDto>> UpdateAsync(string companyId, string id, CreateAccountRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina una cuenta del plan contable (solo si no tiene hijos ni movimientos).
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene el árbol de cuentas jerárquico.
    /// </summary>
    Task<ApiResponse<List<AccountDto>>> GetAccountTreeAsync(string companyId, CancellationToken cancellationToken = default);
}
