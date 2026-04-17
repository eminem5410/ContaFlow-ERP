namespace ContaFlow.Domain.Entities;

/// <summary>
/// Factura electrónica (tipo A, B, C, NC, ND) con ítems y pagos asociados.
/// </summary>
public class Invoice : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // A, B, C, NC, ND
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public double Total { get; set; }
    public double Tax { get; set; }
    public double NetTotal { get; set; }
    public double AmountPaid { get; set; }
    public string Status { get; set; } = "pendiente"; // pendiente, pagada_parcial, pagada, vencida, anulada
    public string? Notes { get; set; }
    public string? ClientId { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public Client? Client { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
