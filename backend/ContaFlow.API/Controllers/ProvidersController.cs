using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Providers;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de proveedores.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class ProvidersController : ControllerBase
{
    private readonly IProviderService _providerService;
    private readonly ILogger<ProvidersController> _logger;

    public ProvidersController(IProviderService providerService, ILogger<ProvidersController> logger)
    {
        _providerService = providerService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los proveedores de la empresa, paginados y opcionalmente filtrados por búsqueda.
    /// </summary>
    [HttpGet]
    [RequirePermission("providers.read")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProviderDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<ProviderDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _providerService.GetAllAsync(companyId, pageNumber, pageSize, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene un proveedor por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("providers.read")]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 404)]
    public async Task<ActionResult<ApiResponse<ProviderDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _providerService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea un nuevo proveedor.
    /// </summary>
    [HttpPost]
    [RequirePermission("providers.create")]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 400)]
    public async Task<ActionResult<ApiResponse<ProviderDto>>> Create(
        [FromBody] CreateProviderRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _providerService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Actualiza un proveedor existente.
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("providers.update")]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<ProviderDto>), 404)]
    public async Task<ActionResult<ApiResponse<ProviderDto>>> Update(
        string id,
        [FromBody] UpdateProviderRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _providerService.UpdateAsync(companyId, id, request, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrad") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina un proveedor.
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("providers.delete")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _providerService.DeleteAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
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
