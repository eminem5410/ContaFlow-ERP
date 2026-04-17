using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Permissions;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de permisos del sistema.
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly IUnitOfWork _unitOfWork;

    // Módulos y acciones predeterminados del sistema
    private static readonly string[] Modules =
    {
        "accounts", "journal-entries", "clients", "providers",
        "invoices", "payments", "bank-accounts", "reports",
        "users", "roles", "settings", "audit-log"
    };

    private static readonly string[] Actions =
    {
        "view", "create", "edit", "delete", "confirm", "export"
    };

    // Descripciones de módulos en español
    private static readonly Dictionary<string, string> ModuleDescriptions = new()
    {
        ["accounts"] = "Plan de cuentas",
        ["journal-entries"] = "Asientos contables",
        ["clients"] = "Clientes",
        ["providers"] = "Proveedores",
        ["invoices"] = "Facturación",
        ["payments"] = "Pagos y cobros",
        ["bank-accounts"] = "Cuentas bancarias",
        ["reports"] = "Reportes",
        ["users"] = "Usuarios",
        ["roles"] = "Roles y permisos",
        ["settings"] = "Configuración",
        ["audit-log"] = "Auditoría"
    };

    // Descripciones de acciones en español
    private static readonly Dictionary<string, string> ActionDescriptions = new()
    {
        ["view"] = "Ver",
        ["create"] = "Crear",
        ["edit"] = "Editar",
        ["delete"] = "Eliminar",
        ["confirm"] = "Confirmar",
        ["export"] = "Exportar"
    };

    public PermissionService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<List<PermissionDto>>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await _unitOfWork.Permissions.GetAllAsync(cancellationToken);
        var items = permissions.Select(MapToDto).ToList();

        return ApiResponse<List<PermissionDto>>.Ok(items);
    }

    public async Task<ApiResponse<Dictionary<string, List<PermissionDto>>>> GetGroupedByModuleAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await _unitOfWork.Permissions.GetAllAsync(cancellationToken);
        var dtos = permissions.Select(MapToDto).ToList();

        var grouped = dtos
            .GroupBy(p => p.Module)
            .OrderBy(g => g.Key)
            .ToDictionary(g => g.Key, g => g.OrderBy(p => p.Name).ToList());

        return ApiResponse<Dictionary<string, List<PermissionDto>>>.Ok(grouped);
    }

    public async Task<ApiResponse<bool>> SeedPermissionsAsync(CancellationToken cancellationToken = default)
    {
        var existingPermissions = (await _unitOfWork.Permissions.GetAllAsync(cancellationToken)).ToList();
        var existingNames = existingPermissions.Select(p => p.Name).ToHashSet();

        var created = 0;

        foreach (var module in Modules)
        {
            foreach (var action in Actions)
            {
                var name = $"{module}.{action}";
                if (existingNames.Contains(name))
                    continue;

                var moduleDesc = ModuleDescriptions.GetValueOrDefault(module, module);
                var actionDesc = ActionDescriptions.GetValueOrDefault(action, action);

                var permission = new Domain.Entities.Permission
                {
                    Name = name,
                    Description = $"{moduleDesc} - {actionDesc}"
                };

                await _unitOfWork.Permissions.AddAsync(permission, cancellationToken);
                created++;
            }
        }

        if (created > 0)
            await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, $"Se crearon {created} permisos. Total: {Modules.Length * Actions.Length} permisos en {Modules.Length} módulos.");
    }

    private static PermissionDto MapToDto(Domain.Entities.Permission permission)
    {
        var parts = permission.Name.Split('.');
        var module = parts.Length > 1 ? parts[0] : "general";

        return new PermissionDto
        {
            Id = permission.Id,
            Name = permission.Name,
            Description = permission.Description,
            Module = module
        };
    }
}
