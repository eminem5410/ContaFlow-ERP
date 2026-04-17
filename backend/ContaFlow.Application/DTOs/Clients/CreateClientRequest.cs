using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Clients;

/// <summary>
/// DTO para crear un nuevo cliente.
/// </summary>
public class CreateClientRequest
{
    public string? Code { get; set; }

    [Required(ErrorMessage = "El nombre es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string Name { get; set; } = string.Empty;

    [StringLength(20, ErrorMessage = "El CUIT no puede superar los 20 caracteres")]
    public string? Cuit { get; set; }

    [EmailAddress(ErrorMessage = "El email no tiene un formato válido")]
    [StringLength(255, ErrorMessage = "El email no puede superar los 255 caracteres")]
    public string? Email { get; set; }

    [StringLength(50, ErrorMessage = "El teléfono no puede superar los 50 caracteres")]
    public string? Phone { get; set; }

    [StringLength(500, ErrorMessage = "La dirección no puede superar los 500 caracteres")]
    public string? Address { get; set; }

    [StringLength(100, ErrorMessage = "La ciudad no puede superar los 100 caracteres")]
    public string? City { get; set; }

    [StringLength(100, ErrorMessage = "La provincia no puede superar los 100 caracteres")]
    public string? Province { get; set; }

    [StringLength(1000, ErrorMessage = "Las notas no pueden superar los 1000 caracteres")]
    public string? Notes { get; set; }
}
