using ContaFlow.Application.DTOs.BankAccounts;
using ContaFlow.Application.DTOs.Common;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de gestión de cuentas bancarias.
/// </summary>
public interface IBankAccountService
{
    /// <summary>
    /// Obtiene todas las cuentas bancarias de la empresa, opcionalmente filtradas y paginadas.
    /// </summary>
    Task<ApiResponse<PagedResult<BankAccountDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene una cuenta bancaria por su ID.
    /// </summary>
    Task<ApiResponse<BankAccountDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea una nueva cuenta bancaria con saldo inicial en cero.
    /// </summary>
    Task<ApiResponse<BankAccountDto>> CreateAsync(string companyId, CreateBankAccountRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza los datos de una cuenta bancaria existente.
    /// </summary>
    Task<ApiResponse<BankAccountDto>> UpdateAsync(string companyId, string id, UpdateBankAccountRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina una cuenta bancaria.
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default);
}
