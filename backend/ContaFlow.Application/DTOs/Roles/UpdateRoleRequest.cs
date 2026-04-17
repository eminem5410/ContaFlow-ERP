using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Roles;

/// <summary>
/// DTO para actualizar un rol existente.
/// </summary>
public class UpdateRoleRequest
{
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string? Name { get; set; }

    [StringLength(500, ErrorMessage = "La descripcion no puede superar los 500 caracteres")]
    public string? Description { get; set; }

    /// <summary>
    /// Lista de IDs de permisos asignados al rol.
    /// </summary>
    public List<string>? PermissionIds { get; set; }
}
