namespace ContaFlow.Application.DTOs.Settings;

/// <summary>
/// DTO para actualizar la configuración de la empresa (parcial).
/// Todos los campos son opcionales; solo se actualizan los valores provistos.
/// </summary>
public class UpdateSettingsRequest
{
    public string? Name { get; set; }
    public string? Cuit { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Logo { get; set; }
    public string? Plan { get; set; }
    public string? Province { get; set; }
    public string? City { get; set; }
}
