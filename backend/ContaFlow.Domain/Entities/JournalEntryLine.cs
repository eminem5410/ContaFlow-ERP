namespace ContaFlow.Domain.Entities;

/// <summary>
/// Línea de asiento contable (partida doble). Cada línea afecta una cuenta.
/// </summary>
public class JournalEntryLine : BaseEntity
{
    public string JournalEntryId { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public double Debit { get; set; }
    public double Credit { get; set; }
    public string? Description { get; set; }

    // Propiedades de navegación
    public JournalEntry JournalEntry { get; set; } = null!;
    public Account Account { get; set; } = null!;
}
