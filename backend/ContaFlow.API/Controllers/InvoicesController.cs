using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Invoices;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de facturas electrónicas.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;
    private readonly ILogger<InvoicesController> _logger;

    public InvoicesController(IInvoiceService invoiceService, ILogger<InvoicesController> logger)
    {
        _invoiceService = invoiceService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todas las facturas, paginadas y filtradas.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<InvoiceDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<InvoiceDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _invoiceService.GetAllAsync(companyId, pageNumber, pageSize, status, type, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene una factura por su ID con todos sus ítems.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), 404)]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _invoiceService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Crea una nueva factura con sus ítems (totales calculados automáticamente).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), 400)]
    public async Task<ActionResult<ApiResponse<InvoiceDto>>> Create(
        [FromBody] CreateInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        _logger.LogInformation("Creando factura {Number} tipo {Type} para empresa {CompanyId}", request.Number, request.Type, companyId);

        var result = await _invoiceService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Anula una factura existente.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 400)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _invoiceService.DeleteAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return result.Message?.Contains("no encontrada") == true
                ? NotFound(result) : BadRequest(result);
        return Ok(result);
    }

    private string GetUserCompanyId() =>
        User.FindFirst("CompanyId")?.Value ?? throw new UnauthorizedAccessException("CompanyId no encontrado");
}
