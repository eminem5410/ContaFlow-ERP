using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Roles;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de roles y permisos RBAC.
/// </summary>
public class RoleService : IRoleService
{
    private readonly IUnitOfWork _unitOfWork;

    public RoleService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<RoleDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
            .Where(r => r.CompanyId == companyId)
            .ToList();

        var totalCount = allRoles.Count;
        var pagedRoles = allRoles
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedRoles.Select(r => MapToDto(r, allRoles)).ToList();

        var result = new PagedResult<RoleDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<RoleDto>>.Ok(result);
    }

    public async Task<ApiResponse<RoleDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var role = await _unitOfWork.Roles.GetByIdAsync(id, cancellationToken);
        if (role == null || role.CompanyId != companyId)
            return ApiResponse<RoleDto>.Fail("Rol no encontrado", "NOT_FOUND");

        var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
            .Where(r => r.CompanyId == companyId)
            .ToList();

        return ApiResponse<RoleDto>.Ok(MapToDto(role, allRoles));
    }

    public async Task<ApiResponse<RoleDto>> CreateAsync(string companyId, CreateRoleRequest request, CancellationToken cancellationToken = default)
    {
        var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
            .Where(r => r.CompanyId == companyId)
            .ToList();

        // Verificar nombre único por empresa
        if (allRoles.Any(r => r.Name.ToLower() == request.Name.ToLower()))
            return ApiResponse<RoleDto>.Fail($"Ya existe un rol con nombre '{request.Name}'", "DUPLICATE_NAME");

        // Validar permisos
        var allPermissions = (await _unitOfWork.Permissions.GetAllAsync(cancellationToken)).ToList();
        var validPermissionIds = allPermissions.Select(p => p.Id).ToHashSet();

        var invalidPermissions = request.PermissionIds.Where(pid => !validPermissionIds.Contains(pid)).ToList();
        if (invalidPermissions.Count > 0)
            return ApiResponse<RoleDto>.Fail($"Se encontraron {invalidPermissions.Count} permisos inválidos", "INVALID_PERMISSIONS");

        var role = new Domain.Entities.Role
        {
            Name = request.Name,
            Description = request.Description,
            CompanyId = companyId
        };

        await _unitOfWork.Roles.AddAsync(role, cancellationToken);

        // Crear entradas de RolePermission
        foreach (var permissionId in request.PermissionIds.Distinct())
        {
            var rolePermission = new Domain.Entities.RolePermission
            {
                RoleId = role.Id,
                PermissionId = permissionId
            };
            await _unitOfWork.RolePermissions.AddAsync(rolePermission, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<RoleDto>.Ok(MapToDto(role, allRoles), "Rol creado exitosamente");
    }

    public async Task<ApiResponse<RoleDto>> UpdateAsync(string companyId, string id, UpdateRoleRequest request, CancellationToken cancellationToken = default)
    {
        var role = await _unitOfWork.Roles.GetByIdAsync(id, cancellationToken);
        if (role == null || role.CompanyId != companyId)
            return ApiResponse<RoleDto>.Fail("Rol no encontrado", "NOT_FOUND");

        var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
            .Where(r => r.CompanyId == companyId)
            .ToList();

        // Verificar nombre único por empresa (excluyendo el rol actual)
        if (allRoles.Any(r => r.Id != id && r.Name.ToLower() == request.Name.ToLower()))
            return ApiResponse<RoleDto>.Fail($"Ya existe un rol con nombre '{request.Name}'", "DUPLICATE_NAME");

        // Validar permisos
        var allPermissions = (await _unitOfWork.Permissions.GetAllAsync(cancellationToken)).ToList();
        var validPermissionIds = allPermissions.Select(p => p.Id).ToHashSet();

        var invalidPermissions = request.PermissionIds.Where(pid => !validPermissionIds.Contains(pid)).ToList();
        if (invalidPermissions.Count > 0)
            return ApiResponse<RoleDto>.Fail($"Se encontraron {invalidPermissions.Count} permisos inválidos", "INVALID_PERMISSIONS");

        // Actualizar datos del rol
        role.Name = request.Name;
        role.Description = request.Description;
        role.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Roles.UpdateAsync(role, cancellationToken);

        // Eliminar permisos existentes y crear los nuevos (reemplazo atómico)
        var existingPermissions = (await _unitOfWork.RolePermissions.GetAllAsync(cancellationToken))
            .Where(rp => rp.RoleId == id)
            .ToList();

        foreach (var existing in existingPermissions)
        {
            await _unitOfWork.RolePermissions.DeleteAsync(existing, cancellationToken);
        }

        foreach (var permissionId in request.PermissionIds.Distinct())
        {
            var rolePermission = new Domain.Entities.RolePermission
            {
                RoleId = role.Id,
                PermissionId = permissionId
            };
            await _unitOfWork.RolePermissions.AddAsync(rolePermission, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<RoleDto>.Ok(MapToDto(role, allRoles), "Rol actualizado exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var role = await _unitOfWork.Roles.GetByIdAsync(id, cancellationToken);
        if (role == null || role.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Rol no encontrado", "NOT_FOUND");

        // Verificar que no tenga usuarios asignados
        if (role.Users.Count > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar el rol porque tiene usuarios asignados", "HAS_USERS");

        // Eliminar permisos del rol
        var existingPermissions = (await _unitOfWork.RolePermissions.GetAllAsync(cancellationToken))
            .Where(rp => rp.RoleId == id)
            .ToList();

        foreach (var existing in existingPermissions)
        {
            await _unitOfWork.RolePermissions.DeleteAsync(existing, cancellationToken);
        }

        await _unitOfWork.Roles.DeleteAsync(role, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Rol eliminado exitosamente");
    }

    public async Task<ApiResponse<bool>> SeedDefaultRolesAsync(string companyId, CancellationToken cancellationToken = default)
    {
        var allPermissions = (await _unitOfWork.Permissions.GetAllAsync(cancellationToken)).ToList();
        var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
            .Where(r => r.CompanyId == companyId)
            .ToList();

        if (allPermissions.Count == 0)
            return ApiResponse<bool>.Fail("No hay permisos disponibles. Ejecute SeedPermissions primero.", "NO_PERMISSIONS");

        var created = 0;

        // Rol: Administrador (todos los permisos)
        if (!allRoles.Any(r => r.Name == "Administrador"))
        {
            var adminRole = new Domain.Entities.Role
            {
                Name = "Administrador",
                Description = "Acceso total al sistema. Puede gestionar todos los módulos.",
                CompanyId = companyId
            };
            await _unitOfWork.Roles.AddAsync(adminRole, cancellationToken);

            foreach (var permission in allPermissions)
            {
                await _unitOfWork.RolePermissions.AddAsync(new Domain.Entities.RolePermission
                {
                    RoleId = adminRole.Id,
                    PermissionId = permission.Id
                }, cancellationToken);
            }
            created++;
        }

        // Rol: Contador (permisos de contabilidad, facturación, reportes)
        if (!allRoles.Any(r => r.Name == "Contador"))
        {
            var contadorRole = new Domain.Entities.Role
            {
                Name = "Contador",
                Description = "Acceso a módulos contables: plan de cuentas, asientos, facturas, pagos, reportes y auditoría.",
                CompanyId = companyId
            };
            await _unitOfWork.Roles.AddAsync(contadorRole, cancellationToken);

            var allowedModules = new[] { "accounts", "journal-entries", "invoices", "payments", "reports", "audit-log" };
            foreach (var permission in allPermissions.Where(p => allowedModules.Any(m => p.Name.StartsWith(m))))
            {
                await _unitOfWork.RolePermissions.AddAsync(new Domain.Entities.RolePermission
                {
                    RoleId = contadorRole.Id,
                    PermissionId = permission.Id
                }, cancellationToken);
            }
            created++;
        }

        // Rol: Visualizador (solo lectura)
        if (!allRoles.Any(r => r.Name == "Visualizador"))
        {
            var viewerRole = new Domain.Entities.Role
            {
                Name = "Visualizador",
                Description = "Acceso de solo lectura a todos los módulos del sistema.",
                CompanyId = companyId
            };
            await _unitOfWork.Roles.AddAsync(viewerRole, cancellationToken);

            foreach (var permission in allPermissions.Where(p => p.Name.EndsWith(".view") || p.Name.EndsWith(".export")))
            {
                await _unitOfWork.RolePermissions.AddAsync(new Domain.Entities.RolePermission
                {
                    RoleId = viewerRole.Id,
                    PermissionId = permission.Id
                }, cancellationToken);
            }
            created++;
        }

        if (created > 0)
            await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, $"Se crearon {created} roles predeterminados");
    }

    private static RoleDto MapToDto(Domain.Entities.Role role, List<Domain.Entities.Role> allRoles)
    {
        return new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            Description = role.Description,
            CompanyId = role.CompanyId,
            PermissionsCount = role.RolePermissions.Count,
            UsersCount = role.Users.Count,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        };
    }
}
