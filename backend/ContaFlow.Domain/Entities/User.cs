namespace ContaFlow.Domain.Entities;

/// <summary>
/// Usuario del sistema con rol y empresa asociada.
/// Soporta autenticación JWT con refresh tokens.
/// </summary>
public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty; // Hash BCrypt almacenado
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = "user";
    public string? RoleId { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Refresh Token para rotación de tokens
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public Role? UserRole { get; set; }
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
