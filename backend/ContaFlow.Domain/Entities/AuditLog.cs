namespace ContaFlow.Domain.Entities;

/// <summary>
/// Registro de auditoría para rastrear acciones de usuarios sobre entidades.
/// Cumple con requisitos de trazabilidad contable.
/// </summary>
public class AuditLog : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // create, update, delete, login, confirm
    public string Entity { get; set; } = string.Empty; // journal_entry, invoice, payment, account, client, provider
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public User User { get; set; } = null!;
}
