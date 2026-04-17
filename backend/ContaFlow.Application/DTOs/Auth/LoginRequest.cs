using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Auth;

/// <summary>
/// DTO para solicitud de inicio de sesión.
/// </summary>
public class LoginRequest
{
    [Required(ErrorMessage = "El email es obligatorio")]
    [EmailAddress(ErrorMessage = "Formato de email inválido")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria")]
    public string Password { get; set; } = string.Empty;
}
