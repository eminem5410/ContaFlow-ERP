using ContaFlow.Application.DTOs.Auth;
using ContaFlow.Application.DTOs.Common;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de autenticación y registro.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Inicia sesión y devuelve token JWT con datos del usuario.
    /// </summary>
    Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra un nuevo usuario y empresa. Crea la compañía automáticamente.
    /// </summary>
    Task<ApiResponse<LoginResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refresca el token JWT actual.
    /// </summary>
    Task<ApiResponse<LoginResponse>> RefreshTokenAsync(string token, CancellationToken cancellationToken = default);
}
