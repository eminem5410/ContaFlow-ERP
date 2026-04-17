using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Permissions;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de gestión de permisos del sistema.
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// Obtiene todos los permisos disponibles en el sistema.
    /// </summary>
    Task<ApiResponse<List<PermissionDto>>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene los permisos agrupados por módulo.
    /// Retorna un diccionario donde la clave es el módulo y el valor es la lista de permisos.
    /// </summary>
    Task<ApiResponse<Dictionary<string, List<PermissionDto>>>> GetGroupedByModuleAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Carga los permisos predeterminados del sistema (54 permisos en 12 módulos).
    /// </summary>
    Task<ApiResponse<bool>> SeedPermissionsAsync(CancellationToken cancellationToken = default);
}
