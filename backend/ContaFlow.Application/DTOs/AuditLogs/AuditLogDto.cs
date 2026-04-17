namespace ContaFlow.Application.DTOs.AuditLogs;

/// <summary>
/// DTO de registro de auditoría para respuestas de la API.
/// </summary>
public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
