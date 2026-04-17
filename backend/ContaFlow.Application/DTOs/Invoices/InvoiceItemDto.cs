namespace ContaFlow.Application.DTOs.Invoices;

/// <summary>
/// DTO de ítem de factura.
/// </summary>
public class InvoiceItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Quantity { get; set; }
    public double UnitPrice { get; set; }
    public double Subtotal { get; set; }
    public double TaxRate { get; set; }
    public double TaxAmount { get; set; }
}
