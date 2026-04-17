namespace ContaFlow.Domain.Entities;

/// <summary>
/// Proveedor de la empresa. Relacionado con facturas de compra y pagos.
/// </summary>
public class Provider : BaseEntity
{
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

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
