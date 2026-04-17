namespace ContaFlow.Application.DTOs.Providers;

/// <summary>
/// DTO de proveedor para respuestas de la API.
/// </summary>
public class ProviderDto
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Cuit { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Notes { get; set; }
    public double Balance { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public int InvoicesCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
