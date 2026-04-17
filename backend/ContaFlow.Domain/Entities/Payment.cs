namespace ContaFlow.Domain.Entities;

/// <summary>
/// Pago o cobro. Puede estar asociado a factura, cliente, proveedor y cuenta bancaria.
/// </summary>
public class Payment : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public double Amount { get; set; }
    public string Method { get; set; } = "transferencia"; // efectivo, transferencia, cheque, tarjeta
    public string? Reference { get; set; }
    public string Type { get; set; } = "cobro"; // cobro, pago
    public string? Notes { get; set; }
    public string? InvoiceId { get; set; }
    public string? ClientId { get; set; }
    public string? ProviderId { get; set; }
    public string? BankAccountId { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public Invoice? Invoice { get; set; }
    public Client? Client { get; set; }
    public Provider? Provider { get; set; }
    public BankAccount? BankAccount { get; set; }
}
