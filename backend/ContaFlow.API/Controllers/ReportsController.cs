using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Reports;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para generación de reportes contables.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReportService reportService, ILogger<ReportsController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    /// <summary>
    /// Genera el balance general (balance sheet) para el período indicado.
    /// </summary>
    [HttpGet("balance-sheet")]
    [RequirePermission("reports.balance-sheet")]
    [ProducesResponseType(typeof(ApiResponse<BalanceSheetDto>), 200)]
    public async Task<ActionResult<ApiResponse<BalanceSheetDto>>> GetBalanceSheet(
        [FromQuery] DateTime? asOfDate = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _reportService.GetBalanceSheetAsync(companyId, asOfDate, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Genera el estado de resultados (income statement) para el período indicado.
    /// </summary>
    [HttpGet("income-statement")]
    [RequirePermission("reports.income-statement")]
    [ProducesResponseType(typeof(ApiResponse<IncomeStatementDto>), 200)]
    public async Task<ActionResult<ApiResponse<IncomeStatementDto>>> GetIncomeStatement(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _reportService.GetIncomeStatementAsync(companyId, fromDate, toDate, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Genera el reporte de IVA ventas (libro IVA digital - ventas) para el período indicado.
    /// </summary>
    [HttpGet("iva-sales")]
    [RequirePermission("reports.iva-sales")]
    [ProducesResponseType(typeof(ApiResponse<IvaReportDto>), 200)]
    public async Task<ActionResult<ApiResponse<IvaReportDto>>> GetIvaSales(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _reportService.GetIvaSalesAsync(companyId, fromDate.GetValueOrDefault(), toDate.GetValueOrDefault(), cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Genera el reporte de IVA compras (libro IVA digital - compras) para el período indicado.
    /// </summary>
    [HttpGet("iva-purchases")]
    [RequirePermission("reports.iva-purchases")]
    [ProducesResponseType(typeof(ApiResponse<IvaReportDto>), 200)]
    public async Task<ActionResult<ApiResponse<IvaReportDto>>> GetIvaPurchases(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _reportService.GetIvaPurchasesAsync(companyId, fromDate.GetValueOrDefault(), toDate.GetValueOrDefault(), cancellationToken);
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
