namespace ContaFlow.Domain.Entities;

/// <summary>
/// Permiso granular del sistema (ej: journal_entries.create, invoices.read, etc.)
/// </summary>
public class Permission : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Propiedades de navegación
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
