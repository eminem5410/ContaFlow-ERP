using ContaFlow.Application.DTOs.AuditLogs;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de consulta de registros de auditoría.
/// Los registros de auditoría son de solo lectura (se generan automáticamente por el sistema).
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly IUnitOfWork _unitOfWork;

    public AuditLogService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<AuditLogDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        string? entity = null,
        string? action = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var allLogs = (await _unitOfWork.AuditLogs.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToList();

        // Filtrar por entidad
        if (!string.IsNullOrWhiteSpace(entity))
        {
            allLogs = allLogs.Where(a => a.Entity == entity).ToList();
        }

        // Filtrar por acción
        if (!string.IsNullOrWhiteSpace(action))
        {
            allLogs = allLogs.Where(a => a.Action == action).ToList();
        }

        // Filtrar por rango de fechas
        if (fromDate.HasValue)
        {
            allLogs = allLogs.Where(a => a.CreatedAt >= fromDate.Value).ToList();
        }

        if (toDate.HasValue)
        {
            var toDateEnd = toDate.Value.Date.AddDays(1);
            allLogs = allLogs.Where(a => a.CreatedAt < toDateEnd).ToList();
        }

        // Filtrar por término de búsqueda
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = searchTerm.ToLower();
            allLogs = allLogs
                .Where(a => a.UserName.ToLower().Contains(searchTerm) ||
                            a.Entity.ToLower().Contains(searchTerm) ||
                            a.Action.ToLower().Contains(searchTerm) ||
                            (a.Details != null && a.Details.ToLower().Contains(searchTerm)) ||
                            (a.EntityId != null && a.EntityId.ToLower().Contains(searchTerm)))
                .ToList();
        }

        // Ordenar por fecha descendente (más recientes primero)
        allLogs = allLogs
            .OrderByDescending(a => a.CreatedAt)
            .ToList();

        var totalCount = allLogs.Count;
        var pagedLogs = allLogs
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedLogs.Select(MapToDto).ToList();

        var result = new PagedResult<AuditLogDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<AuditLogDto>>.Ok(result);
    }

    private static AuditLogDto MapToDto(Domain.Entities.AuditLog auditLog)
    {
        return new AuditLogDto
        {
            Id = auditLog.Id,
            UserId = auditLog.UserId,
            UserName = auditLog.UserName,
            Action = auditLog.Action,
            Entity = auditLog.Entity,
            EntityId = auditLog.EntityId,
            Details = auditLog.Details,
            CompanyId = auditLog.CompanyId,
            CreatedAt = auditLog.CreatedAt
        };
    }
}
