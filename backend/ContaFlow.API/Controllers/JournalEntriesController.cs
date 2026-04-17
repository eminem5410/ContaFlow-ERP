using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.JournalEntries;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de asientos contables (partida doble).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class JournalEntriesController : ControllerBase
{
    private readonly IJournalEntryService _journalEntryService;
    private readonly ILogger<JournalEntriesController> _logger;

    public JournalEntriesController(
        IJournalEntryService journalEntryService,
        ILogger<JournalEntriesController> logger)
    {
        _journalEntryService = journalEntryService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los asientos contables, paginados.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<JournalEntryDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<JournalEntryDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _journalEntryService.GetAllAsync(companyId, pageNumber, pageSize, status, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene un asiento por su ID con todas sus líneas.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 404)]
    public async Task<ActionResult<ApiResponse<JournalEntryDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _journalEntryService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea un nuevo asiento contable con validación de partida doble.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 400)]
    public async Task<ActionResult<ApiResponse<JournalEntryDto>>> Create(
        [FromBody] CreateJournalEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        var (companyId, userId) = GetUserIds();
        _logger.LogInformation("Creando asiento contable para empresa {CompanyId}", companyId);

        var result = await _journalEntryService.CreateAsync(companyId, userId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Confirma un asiento contable (afecta saldos de cuentas).
    /// </summary>
    [HttpPost("{id}/confirm")]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 400)]
    [ProducesResponseType(typeof(ApiResponse<JournalEntryDto>), 404)]
    public async Task<ActionResult<ApiResponse<JournalEntryDto>>> Confirm(
        string id,
        CancellationToken cancellationToken = default)
    {
        var (companyId, userId) = GetUserIds();
        _logger.LogInformation("Confirmando asiento {EntryId} por usuario {UserId}", id, userId);

        var result = await _journalEntryService.ConfirmAsync(companyId, id, userId, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrado") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    /// <summary>
    /// Elimina un asiento contable (solo si está en estado borrador).
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 400)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var (companyId, userId) = GetUserIds();
        var result = await _journalEntryService.DeleteAsync(companyId, id, userId, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrado") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    private string GetUserCompanyId() =>
        User.FindFirst("CompanyId")?.Value ?? throw new UnauthorizedAccessException("CompanyId no encontrado");

    private (string CompanyId, string UserId) GetUserIds() =>
        (User.FindFirst("CompanyId")?.Value ?? throw new UnauthorizedAccessException("CompanyId no encontrado"),
         User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException("UserId no encontrado"));
}
