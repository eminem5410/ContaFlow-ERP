namespace ContaFlow.Application.DTOs.Roles;

/// <summary>
/// DTO de rol para respuestas de la API.
/// </summary>
public class RoleDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public int PermissionsCount { get; set; }
    public int UsersCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
