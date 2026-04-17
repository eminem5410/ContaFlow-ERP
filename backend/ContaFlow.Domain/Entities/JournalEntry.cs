namespace ContaFlow.Domain.Entities;

/// <summary>
/// Asiento contable con líneas de partida doble (debe = haber).
/// </summary>
public class JournalEntry : BaseEntity
{
    public int Number { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public string? Concept { get; set; }
    public string Status { get; set; } = "borrador"; // borrador, confirmado, anulado
    public string CompanyId { get; set; } = string.Empty;
    public double TotalDebit { get; set; }
    public double TotalCredit { get; set; }

    // Propiedades de navegación
    public Company Company { get; set; } = null!;
    public ICollection<JournalEntryLine> Lines { get; set; } = new List<JournalEntryLine>();
}
