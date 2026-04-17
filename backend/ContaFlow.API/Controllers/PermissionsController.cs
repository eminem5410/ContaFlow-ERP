using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Permissions;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para consulta y gestión de permisos del sistema.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;
    private readonly ILogger<PermissionsController> _logger;

    public PermissionsController(IPermissionService permissionService, ILogger<PermissionsController> logger)
    {
        _permissionService = permissionService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los permisos disponibles del sistema.
    /// </summary>
    [HttpGet]
    [RequirePermission("permissions.read")]
    [ProducesResponseType(typeof(ApiResponse<List<PermissionDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<PermissionDto>>>> GetAll(
        CancellationToken cancellationToken = default)
    {
        var result = await _permissionService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene todos los permisos agrupados por módulo.
    /// </summary>
    [HttpGet("grouped")]
    [RequirePermission("permissions.read")]
    [ProducesResponseType(typeof(ApiResponse<Dictionary<string, List<PermissionDto>>>), 200)]
    public async Task<ActionResult<ApiResponse<Dictionary<string, List<PermissionDto>>>>> GetGroupedByModule(
        CancellationToken cancellationToken = default)
    {
        var result = await _permissionService.GetGroupedByModuleAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Carga los permisos predeterminados del sistema si no existen.
    /// </summary>
    [HttpPost("seed")]
    [RequirePermission("permissions.create")]
    [ProducesResponseType(typeof(ApiResponse<List<PermissionDto>>), 201)]
    public async Task<ActionResult<ApiResponse<List<PermissionDto>>>> SeedPermissions(
        CancellationToken cancellationToken = default)
    {
        var result = await _permissionService.SeedPermissionsAsync(cancellationToken);
        return Created("", result);
    }
}
