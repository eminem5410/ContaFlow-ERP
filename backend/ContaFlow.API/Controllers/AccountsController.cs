using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Accounts;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión del plan de cuentas contables.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;
    private readonly ILogger<AccountsController> _logger;

    public AccountsController(IAccountService accountService, ILogger<AccountsController> logger)
    {
        _accountService = accountService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todas las cuentas, paginadas y opcionalmente filtradas.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<AccountDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<AccountDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.GetAllAsync(companyId, pageNumber, pageSize, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el árbol jerárquico completo de cuentas.
    /// </summary>
    [HttpGet("tree")]
    [ProducesResponseType(typeof(ApiResponse<List<AccountDto>>), 200)]
    public async Task<ActionResult<ApiResponse<List<AccountDto>>>> GetTree(
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.GetAccountTreeAsync(companyId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene una cuenta por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 404)]
    public async Task<ActionResult<ApiResponse<AccountDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea una nueva cuenta en el plan contable.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 400)]
    public async Task<ActionResult<ApiResponse<AccountDto>>> Create(
        [FromBody] CreateAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Actualiza una cuenta existente.
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<AccountDto>), 404)]
    public async Task<ActionResult<ApiResponse<AccountDto>>> Update(
        string id,
        [FromBody] CreateAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.UpdateAsync(companyId, id, request, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrada") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina una cuenta del plan contable.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _accountService.DeleteAsync(companyId, id, cancellationToken);
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
