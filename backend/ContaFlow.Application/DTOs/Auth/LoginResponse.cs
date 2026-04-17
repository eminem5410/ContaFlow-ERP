namespace ContaFlow.Application.DTOs.Auth;

/// <summary>
/// DTO para respuesta de login con token JWT y datos del usuario.
/// </summary>
public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresIn { get; set; } // segundos
    public string RefreshToken { get; set; } = string.Empty;
    public UserInfo User { get; set; } = new();
}

/// <summary>
/// Información básica del usuario autenticado.
/// </summary>
public class UserInfo
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
}
