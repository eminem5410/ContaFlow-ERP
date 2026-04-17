namespace ContaFlow.Application.DTOs.Invoices;

/// <summary>
/// DTO de factura para respuestas.
/// </summary>
public class InvoiceDto
{
    public string Id { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? DueDate { get; set; }
    public double Total { get; set; }
    public double Tax { get; set; }
    public double NetTotal { get; set; }
    public double AmountPaid { get; set; }
    /// <summary>
    /// Saldo pendiente de la factura.
    /// </summary>
    public double BalanceDue => Total - AmountPaid;
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ClientId { get; set; }
    public string? ClientName { get; set; }
    public List<InvoiceItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
