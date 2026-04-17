namespace ContaFlow.Application.DTOs.BankAccounts;

/// <summary>
/// DTO de cuenta bancaria para respuestas de la API.
/// </summary>
public class BankAccountDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Bank { get; set; }
    public string? Number { get; set; }
    public string? Cbu { get; set; }
    public string? Alias { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public double Balance { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public int PaymentsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
