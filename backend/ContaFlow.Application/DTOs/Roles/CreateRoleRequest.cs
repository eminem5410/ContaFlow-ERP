using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Roles;

/// <summary>
/// DTO para crear o actualizar un rol.
/// </summary>
public class CreateRoleRequest
{
    [Required(ErrorMessage = "El nombre del rol es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
    public string? Description { get; set; }

    /// <summary>
    /// Lista de IDs de permisos asignados al rol.
    /// </summary>
    public List<string> PermissionIds { get; set; } = new();
}
