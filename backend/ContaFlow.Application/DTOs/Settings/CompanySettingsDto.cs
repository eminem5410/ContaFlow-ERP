namespace ContaFlow.Application.DTOs.Settings;

/// <summary>
/// DTO de configuración de empresa para respuestas de la API.
/// </summary>
public class CompanySettingsDto
{
    public string Id { get; set; } = string.Empty;
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
