namespace ContaFlow.Domain.Entities;

/// <summary>
/// Cuenta del plan contable. Soporta jerarquía padre-hijo (imputable vs. título).
/// </summary>
public class Account : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // activo, pasivo, patrimonio, ingreso, gasto
    public string? Subtype { get; set; }
    public string? ParentId { get; set; }
    public int Level { get; set; } = 1;
    public double Balance { get; set; }
    public string CompanyId { get; set; } = string.Empty;

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public Account? Parent { get; set; }
    public ICollection<Account> Children { get; set; } = new List<Account>();
    public ICollection<JournalEntryLine> JournalLines { get; set; } = new List<JournalEntryLine>();
}
