namespace ContaFlow.Application.DTOs.Payments;

/// <summary>
/// DTO de pago/cobro para respuestas.
/// </summary>
public class PaymentDto
{
    public string Id { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceId { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? ClientId { get; set; }
    public string? ClientName { get; set; }
    public string? ProviderId { get; set; }
    public string? ProviderName { get; set; }
    public string? BankAccountId { get; set; }
    public string? BankAccountName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
