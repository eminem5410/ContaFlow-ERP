namespace ContaFlow.Domain.Entities;

/// <summary>
/// Ítem de factura con descripción, cantidad, precio unitario e IVA.
/// </summary>
public class InvoiceItem : BaseEntity
{
    public string Description { get; set; } = string.Empty;
    public double Quantity { get; set; } = 1;
    public double UnitPrice { get; set; }
    public double Subtotal { get; set; }
    public double TaxRate { get; set; } = 21;
    public double TaxAmount { get; set; }
    public string InvoiceId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Invoice Invoice { get; set; } = null!;
}
