using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Payments;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de pagos y cobros.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(IPaymentService paymentService, ILogger<PaymentsController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene todos los pagos/cobros, paginados.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<PaymentDto>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResult<PaymentDto>>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _paymentService.GetAllAsync(companyId, pageNumber, pageSize, type, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene un pago por su ID.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiResponse<PaymentDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<PaymentDto>), 404)]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> GetById(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _paymentService.GetByIdAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Registra un nuevo pago o cobro.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<PaymentDto>), 201)]
    [ProducesResponseType(typeof(ApiResponse<PaymentDto>), 400)]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> Create(
        [FromBody] CreatePaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        _logger.LogInformation("Registrando {Type} de {Amount} por {Method}", request.Type, request.Amount, request.Method);

        var result = await _paymentService.CreateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Data?.Id }, result);
    }

    /// <summary>
    /// Elimina un pago/cobro (reversa los saldos afectados).
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    [ProducesResponseType(typeof(ApiResponse<bool>), 404)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(
        string id,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _paymentService.DeleteAsync(companyId, id, cancellationToken);
        if (!result.Success)
            return NotFound(result);
        return Ok(result);
    }

    private string GetUserCompanyId() =>
        User.FindFirst("CompanyId")?.Value ?? throw new UnauthorizedAccessException("CompanyId no encontrado");
}
