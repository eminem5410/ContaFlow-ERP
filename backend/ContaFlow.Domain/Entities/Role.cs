namespace ContaFlow.Domain.Entities;

/// <summary>
/// Rol del sistema (admin, contador, operador, viewer).
/// </summary>
public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<User> Users { get; set; } = new List<User>();
}
