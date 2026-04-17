using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Clients;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de clientes.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly IClientService _clientService;
    private readonly ILogger<ClientsController> _logger;

    public ClientsController(IClientService clientService, ILogger<ClientsController> logger)
    {
        _clientService = clientService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los clientes de la empresa, paginados y opcionalmente filtrados por búsqueda.
    /// </summary>
    [HttpGet]
    [RequirePermission("clients.read")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ClientDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<ClientDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _clientService.GetAllAsync(companyId, pageNumber, pageSize, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene un cliente por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("clients.read")]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 404)]
    public async Task<ActionResult<ApiResponse<ClientDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _clientService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea un nuevo cliente.
    /// </summary>
    [HttpPost]
    [RequirePermission("clients.create")]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 400)]
    public async Task<ActionResult<ApiResponse<ClientDto>>> Create(
        [FromBody] CreateClientRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _clientService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Actualiza un cliente existente.
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("clients.update")]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<ClientDto>), 404)]
    public async Task<ActionResult<ApiResponse<ClientDto>>> Update(
        string id,
        [FromBody] UpdateClientRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _clientService.UpdateAsync(companyId, id, request, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrad") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina un cliente.
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("clients.delete")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _clientService.DeleteAsync(companyId, id, cancellationToken);
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
