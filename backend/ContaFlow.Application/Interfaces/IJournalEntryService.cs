using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.JournalEntries;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de asientos contables (partida doble).
/// </summary>
public interface IJournalEntryService
{
    /// <summary>
    /// Obtiene todos los asientos de la empresa, paginados.
    /// </summary>
    Task<ApiResponse<PagedResult<JournalEntryDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? status = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene un asiento por su ID con todas sus líneas.
    /// </summary>
    Task<ApiResponse<JournalEntryDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea un nuevo asiento contable con validación de partida doble.
    /// </summary>
    Task<ApiResponse<JournalEntryDto>> CreateAsync(
        string companyId,
        string userId,
        CreateJournalEntryRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Confirma un asiento contable (afecta saldos de cuentas).
    /// </summary>
    Task<ApiResponse<JournalEntryDto>> ConfirmAsync(
        string companyId,
        string id,
        string userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina un asiento (solo si está en estado borrador).
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        string userId,
        CancellationToken cancellationToken = default);
}
