using ContaFlow.Application.DTOs.AuditLogs;
using ContaFlow.Application.DTOs.Common;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de consulta de registros de auditoría.
/// Los registros de auditoría son de solo lectura (se generan automáticamente por el sistema).
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Obtiene todos los registros de auditoría de la empresa, filtrables y paginados.
    /// </summary>
    Task<ApiResponse<PagedResult<AuditLogDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        string? entity = null,
        string? action = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);
}
