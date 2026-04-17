using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Auth;

/// <summary>
/// DTO para solicitud de registro de nuevo usuario.
/// </summary>
public class RegisterRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El email es obligatorio")]
    [EmailAddress(ErrorMessage = "Formato de email inválido")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria")]
    [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre de la empresa es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>
    /// CUIT de la empresa (opcional para empresas no inscriptas).
    /// </summary>
    public string? Cuit { get; set; }
}
