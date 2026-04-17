using Microsoft.AspNetCore.Mvc;
using ContaFlow.Application.DTOs.Auth;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;

namespace ContaFlow.API.Controllers;

/// <summary>
/// Controlador para autenticación y registro de usuarios.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Inicia sesión y devuelve token JWT.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 401)]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Intento de login para email: {Email}", request.Email);
        var result = await _authService.LoginAsync(request, cancellationToken);

        if (!result.Success)
            return Unauthorized(result);

        return Ok(result);
    }

    /// <summary>
    /// Registra un nuevo usuario y empresa.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 201)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 400)]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registro de nueva empresa: {CompanyName}", request.CompanyName);
        var result = await _authService.RegisterAsync(request, cancellationToken);

        if (!result.Success)
            return BadRequest(result);

        return CreatedAtAction(nameof(Login), result);
    }
}
