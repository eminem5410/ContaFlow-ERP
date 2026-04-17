namespace ContaFlow.Application.DTOs.Permissions;

/// <summary>
/// DTO de permiso para respuestas de la API.
/// </summary>
public class PermissionDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Module { get; set; } = string.Empty;
}
