using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Roles;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de roles del sistema.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;
    private readonly ILogger<RolesController> _logger;

    public RolesController(IRoleService roleService, ILogger<RolesController> logger)
    {
        _roleService = roleService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los roles de la empresa.
    /// </summary>
    [HttpGet]
    [RequirePermission("roles.read")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<RoleDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<RoleDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.GetAllAsync(companyId, pageNumber, pageSize, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene un rol por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("roles.read")]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 404)]
    public async Task<ActionResult<ApiResponse<RoleDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea un nuevo rol.
    /// </summary>
    [HttpPost]
    [RequirePermission("roles.create")]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 400)]
    public async Task<ActionResult<ApiResponse<RoleDto>>> Create(
        [FromBody] CreateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Actualiza un rol existente.
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("roles.update")]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<RoleDto>), 404)]
    public async Task<ActionResult<ApiResponse<RoleDto>>> Update(
        string id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.UpdateAsync(companyId, id, request, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrad") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina un rol.
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("roles.delete")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.DeleteAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea los roles predeterminados del sistema si no existen.
    /// </summary>
    [HttpPost("seed")]
    [RequirePermission("roles.create")]
    [ProducesResponseType(typeof(ApiResponse<List<RoleDto>>), 201)]
    public async Task<ActionResult<ApiResponse<List<RoleDto>>>> SeedDefaultRoles(
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _roleService.SeedDefaultRolesAsync(companyId, cancellationToken);
        return Created("", result);
    }

    /// <summary>
    /// Extrae el CompanyId del token JWT del usuario autenticado.
    /// </summary>
    private string GetUserCompanyId()
    {
        return User.FindFirst("CompanyId")?.Value
            ?? throw new UnauthorizedAccessException("CompanyId no encontrado en el token");
    }
}
