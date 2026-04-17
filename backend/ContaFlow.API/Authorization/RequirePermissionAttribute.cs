using Microsoft.AspNetCore.Authorization;

namespace ContaFlow.API.Authorization;

/// <summary>
/// Atributo de autorización personalizado para requerir un permiso específico.
/// Se aplica a controladores o métodos de acción individuales.
/// </summary>
/// <example>
/// [RequirePermission("clients.create")]
/// public async Task<ActionResult> Create(...) { ... }
/// </example>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : AuthorizeAttribute
{
    /// <summary>
    /// Nombre del permiso requerido (formato: modulo.accion).
    /// </summary>
    public string Permission { get; }

    /// <summary>
    /// Crea una nueva instancia del atributo con el permiso especificado.
    /// </summary>
    /// <param name="permission">Permiso requerido (ej: "clients.create", "reports.balance-sheet").</param>
    public RequirePermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = $"Permission:{permission}";
    }
}
