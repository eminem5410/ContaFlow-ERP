using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.BankAccounts;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de cuentas bancarias.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class BankAccountsController : ControllerBase
{
    private readonly IBankAccountService _bankAccountService;
    private readonly ILogger<BankAccountsController> _logger;

    public BankAccountsController(IBankAccountService bankAccountService, ILogger<BankAccountsController> logger)
    {
        _bankAccountService = bankAccountService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todas las cuentas bancarias de la empresa, paginadas y opcionalmente filtradas por búsqueda.
    /// </summary>
    [HttpGet]
    [RequirePermission("bank-accounts.read")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<BankAccountDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<BankAccountDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _bankAccountService.GetAllAsync(companyId, pageNumber, pageSize, searchTerm, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene una cuenta bancaria por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission("bank-accounts.read")]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 404)]
    public async Task<ActionResult<ApiResponse<BankAccountDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _bankAccountService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea una nueva cuenta bancaria.
    /// </summary>
    [HttpPost]
    [RequirePermission("bank-accounts.create")]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 400)]
    public async Task<ActionResult<ApiResponse<BankAccountDto>>> Create(
        [FromBody] CreateBankAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _bankAccountService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Actualiza una cuenta bancaria existente.
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission("bank-accounts.update")]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<BankAccountDto>), 404)]
    public async Task<ActionResult<ApiResponse<BankAccountDto>>> Update(
        string id,
        [FromBody] UpdateBankAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _bankAccountService.UpdateAsync(companyId, id, request, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrad") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina una cuenta bancaria.
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission("bank-accounts.delete")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _bankAccountService.DeleteAsync(companyId, id, cancellationToken);
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
