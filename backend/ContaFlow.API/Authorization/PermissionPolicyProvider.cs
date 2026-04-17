using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace ContaFlow.API.Authorization;

/// <summary>
/// Proveedor de políticas de autorización dinámicas basado en permisos.
/// Genera políticas en tiempo de ejecución para cada permiso solicitado.
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private const string PolicyPrefix = "Permission:";
    private readonly DefaultAuthorizationPolicyProvider _fallbackPolicyProvider;

    /// <summary>
    /// Inicializa una nueva instancia del proveedor de políticas de permisos.
    /// </summary>
    /// <param name="options">Opciones de autorización configuradas.</param>
    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    /// <summary>
    /// Obtiene la política de autorización predeterminada.
    /// </summary>
    public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
        => _fallbackPolicyProvider.GetDefaultPolicyAsync();

    /// <summary>
    /// Obtiene la política de respaldo (fallback).
    /// </summary>
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync()
        => _fallbackPolicyProvider.GetFallbackPolicyAsync();

    /// <summary>
    /// Obtiene o crea dinámicamente una política de autorización para el nombre indicado.
    /// Si el nombre comienza con "Permission:", crea una política que requiere
    /// un <see cref="PermissionRequirement"/> con el permiso extraído.
    /// </summary>
    /// <param name="policyName">Nombre de la política solicitada.</param>
    /// <returns>Política de autorización correspondiente, o null si no aplica.</returns>
    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(PolicyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var permission = policyName.Substring(PolicyPrefix.Length);
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(permission))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }

        return _fallbackPolicyProvider.GetPolicyAsync(policyName);
    }
}
