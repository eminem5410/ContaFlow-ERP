using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Settings;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.API.Authorization;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para gestión de configuración de la empresa.
/// Requiere autenticación JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(ISettingsService settingsService, ILogger<SettingsController> logger)
    {
        _settingsService = settingsService;
        _logger = logger;
    }

    /// <summary>
    /// Obtiene la configuración actual de la empresa.
    /// </summary>
    [HttpGet]
    [RequirePermission("settings.read")]
    [ProducesResponseType(typeof(ApiResponse<CompanySettingsDto>), 200)]
    public async Task<ActionResult<ApiResponse<CompanySettingsDto>>> Get(
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _settingsService.GetAsync(companyId, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Actualiza la configuración de la empresa.
    /// </summary>
    [HttpPut]
    [RequirePermission("settings.update")]
    [ProducesResponseType(typeof(ApiResponse<CompanySettingsDto>), 200)]
    [ProducesResponseType(typeof(ApiResponse<CompanySettingsDto>), 400)]
    public async Task<ActionResult<ApiResponse<CompanySettingsDto>>> Update(
        [FromBody] UpdateSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var companyId = GetUserCompanyId();
        var result = await _settingsService.UpdateAsync(companyId, request, cancellationToken);
        if (!result.Success)
            return BadRequest(result);
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
