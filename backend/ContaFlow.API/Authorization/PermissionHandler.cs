using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ContaFlow.API.Authorization;

/// <summary>
/// Handler de autorización que evalúa si el usuario tiene el permiso requerido.
/// El rol "admin" tiene acceso total a todos los permisos.
/// Para los demás roles, se verifican los claims "Permission" del token JWT.
/// </summary>
public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    /// <summary>
    /// Evalúa si el contexto de autorización cumple con el requerimiento de permiso.
    /// </summary>
    /// <param name="context">Contexto de autorización con los claims del usuario.</param>
    /// <param name="requirement">Permiso requerido.</param>
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // El rol admin tiene todos los permisos
        if (context.User.IsInRole("admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Verificar claims de permisos específicos en el token
        var permissions = context.User.FindAll("Permission").Select(c => c.Value).ToList();
        if (permissions.Contains(requirement.Permission))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
