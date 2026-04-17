using Microsoft.AspNetCore.Authorization;

namespace ContaFlow.API.Authorization;

/// <summary>
/// Requerimiento de autorización que representa un permiso específico.
/// Utilizado por el handler de permisos para evaluar si el usuario tiene acceso.
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    /// <summary>
    /// Nombre del permiso requerido (formato: modulo.accion).
    /// </summary>
    public string Permission { get; }

    /// <summary>
    /// Crea una nueva instancia del requerimiento con el permiso especificado.
    /// </summary>
    /// <param name="permission">Permiso requerido (ej: "clients.create").</param>
    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}
