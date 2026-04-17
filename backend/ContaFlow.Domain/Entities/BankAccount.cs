namespace ContaFlow.Domain.Entities;

/// <summary>
/// Cuenta bancaria de la empresa (caja, cuenta corriente, etc.).
/// </summary>
public class BankAccount : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Bank { get; set; }
    public string? Number { get; set; }
    public string Type { get; set; } = "cta_corriente"; // caja, cta_corriente, caja_ahorro
    public double Balance { get; set; }
    public string Currency { get; set; } = "ARS";
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
