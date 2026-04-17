using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using ContaFlow.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de usuarios: registra en auditoría, siembra permisos por defecto
/// e invalida caché de permisos del usuario.
/// </summary>
public class UserCreatedEventHandler : IDomainEventHandler<UserCreatedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly IEmailService _emailService;
    private readonly ILogger<UserCreatedEventHandler> _logger;

    public UserCreatedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        IEmailService emailService,
        ILogger<UserCreatedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task HandleAsync(UserCreatedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Nuevo usuario registrado: {Name} ({Email}) con rol '{Role}'",
            domainEvent.Name, domainEvent.Email, domainEvent.Role);

        // Enviar email de bienvenida
        await _emailService.SendWelcomeEmailAsync(
            domainEvent.Email, domainEvent.Name, domainEvent.CompanyName, cancellationToken);

        // Sembrar permisos por defecto según el rol del usuario
        await SeedDefaultPermissionsAsync(domainEvent.UserId, domainEvent.Role, domainEvent.CompanyId, cancellationToken);

        // Invalidar caché de permisos y usuarios
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:users", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:permissions", cancellationToken);
    }

    /// <summary>
    /// Asigna permisos por defecto al rol del nuevo usuario.
    /// Para roles conocidos (admin, contador, operador, viewer), se asignan permisos predefinidos.
    /// </summary>
    private async Task SeedDefaultPermissionsAsync(
        string userId, string role, string companyId, CancellationToken cancellationToken)
    {
        try
        {
            // Buscar el rol por nombre dentro de la empresa
            var allRoles = (await _unitOfWork.Roles.GetAllAsync(cancellationToken))
                .Where(r => r.CompanyId == companyId)
                .ToList();

            var userRole = allRoles.FirstOrDefault(r =>
                r.Name.Equals(role, StringComparison.OrdinalIgnoreCase));

            if (userRole == null)
            {
                _logger.LogWarning(
                    "Rol '{Role}' no encontrado para la empresa {CompanyId}. No se asignarán permisos.",
                    role, companyId);
                return;
            }

            // Obtener permisos disponibles del sistema
            var allPermissions = await _unitOfWork.Permissions.GetAllAsync(cancellationToken);
            var existingRolePermissions = (await _unitOfWork.RolePermissions.GetAllAsync(cancellationToken))
                .Where(rp => rp.RoleId == userRole.Id)
                .Select(rp => rp.PermissionId)
                .ToHashSet();

            // Definir permisos por defecto según el rol
            var defaultPermissions = GetDefaultPermissionsForRole(role);

            var assignedCount = 0;
            foreach (var permissionName in defaultPermissions)
            {
                var permission = allPermissions.FirstOrDefault(p => p.Name == permissionName);
                if (permission != null && !existingRolePermissions.Contains(permission.Id))
                {
                    var rolePermission = new Domain.Entities.RolePermission
                    {
                        RoleId = userRole.Id,
                        PermissionId = permission.Id
                    };
                    await _unitOfWork.RolePermissions.AddAsync(rolePermission, cancellationToken);
                    existingRolePermissions.Add(permission.Id);
                    assignedCount++;
                }
            }

            if (assignedCount > 0)
            {
                await _unitOfWork.SaveChangesAsync(cancellationToken);
                _logger.LogInformation(
                    "Se asignaron {Count} permisos por defecto al rol '{Role}' para usuario {UserId}",
                    assignedCount, role, userId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error sembrando permisos por defecto para usuario {UserId} con rol '{Role}'",
                userId, role);
            // No relanzar: el usuario ya fue creado, los permisos son un paso secundario
        }
    }

    /// <summary>
    /// Retorna la lista de permisos por defecto según el rol.
    /// </summary>
    private static IEnumerable<string> GetDefaultPermissionsForRole(string role) => role.ToLowerInvariant() switch
    {
        "admin" => new[]
        {
            "accounts.read", "accounts.create", "accounts.update", "accounts.delete",
            "journal_entries.read", "journal_entries.create", "journal_entries.confirm", "journal_entries.delete",
            "invoices.read", "invoices.create", "invoices.update", "invoices.delete",
            "payments.read", "payments.create", "payments.delete",
            "clients.read", "clients.create", "clients.update", "clients.delete",
            "providers.read", "providers.create", "providers.update", "providers.delete",
            "reports.read", "reports.export",
            "users.read", "users.create", "users.update", "users.delete",
            "roles.read", "roles.manage",
            "settings.read", "settings.update",
            "audit_logs.read",
        },
        "contador" => new[]
        {
            "accounts.read", "accounts.create", "accounts.update",
            "journal_entries.read", "journal_entries.create", "journal_entries.confirm",
            "invoices.read", "invoices.create", "invoices.update",
            "payments.read", "payments.create",
            "clients.read", "clients.create", "clients.update",
            "providers.read", "providers.create", "providers.update",
            "reports.read", "reports.export",
            "audit_logs.read",
        },
        "operador" => new[]
        {
            "accounts.read",
            "invoices.read", "invoices.create",
            "payments.read", "payments.create",
            "clients.read", "clients.create", "clients.update",
            "providers.read",
            "reports.read",
        },
        "viewer" => new[]
        {
            "accounts.read",
            "journal_entries.read",
            "invoices.read",
            "payments.read",
            "clients.read",
            "providers.read",
            "reports.read",
        },
        _ => Array.Empty<string>()
    };
}

/// <summary>
/// Maneja eventos de cambio de rol: invalida caché de permisos del usuario afectado.
/// </summary>
public class RoleChangedEventHandler : IDomainEventHandler<RoleChangedEvent>
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<RoleChangedEventHandler> _logger;

    public RoleChangedEventHandler(
        ICacheService cacheService,
        ILogger<RoleChangedEventHandler> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task HandleAsync(RoleChangedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning(
            "Rol cambiado para usuario {UserId}: '{Previous}' → '{New}' (por {ChangedBy})",
            domainEvent.UserId, domainEvent.PreviousRole, domainEvent.NewRole, domainEvent.ChangedBy);

        // Invalidar toda la caché de permisos para el usuario afectado
        // Se usa un patrón amplio porque no conocemos el CompanyId desde el evento de dominio actual
        await _cacheService.RemoveByPrefixAsync($"user:{domainEvent.UserId}:permissions", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"user:{domainEvent.UserId}:roles", cancellationToken);

        // Invalidar caché de usuarios (listas y detalles)
        await _cacheService.RemoveByPrefixAsync("users:list", cancellationToken);

        _logger.LogInformation(
            "Caché de permisos invalidada para usuario {UserId} tras cambio de rol '{Previous}' → '{New}'",
            domainEvent.UserId, domainEvent.PreviousRole, domainEvent.NewRole);

        await Task.CompletedTask;
    }
}
