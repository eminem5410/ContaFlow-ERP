namespace ContaFlow.Domain.Entities;

/// <summary>
/// Tabla intermedia entre roles y permisos (RBAC granular).
/// </summary>
public class RolePermission : BaseEntity
{
    public string RoleId { get; set; } = string.Empty;
    public string PermissionId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
