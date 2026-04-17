using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Roles;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de gestión de roles y permisos RBAC.
/// </summary>
public interface IRoleService
{
    /// <summary>
    /// Obtiene todos los roles de la empresa, incluyendo conteo de permisos y usuarios.
    /// </summary>
    Task<ApiResponse<PagedResult<RoleDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene un rol por su ID.
    /// </summary>
    Task<ApiResponse<RoleDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea un nuevo rol con los permisos asignados.
    /// </summary>
    Task<ApiResponse<RoleDto>> CreateAsync(string companyId, CreateRoleRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza un rol existente y reemplaza sus permisos de forma atómica.
    /// </summary>
    Task<ApiResponse<RoleDto>> UpdateAsync(string companyId, string id, UpdateRoleRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina un rol. Solo se puede eliminar si no tiene usuarios asignados.
    /// </summary>
    Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Crea los roles predeterminados del sistema (Administrador, Contador, Visualizador).
    /// </summary>
    Task<ApiResponse<bool>> SeedDefaultRolesAsync(string companyId, CancellationToken cancellationToken = default);
}
