namespace ContaFlow.Application.DTOs.JournalEntries;

/// <summary>
/// DTO de asiento contable para respuestas.
/// </summary>
public class JournalEntryDto
{
    public string Id { get; set; } = string.Empty;
    public int Number { get; set; }
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? Concept { get; set; }
    public string Status { get; set; } = string.Empty;
    public double TotalDebit { get; set; }
    public double TotalCredit { get; set; }
    /// <summary>
    /// Indica si el asiento está balanceado (debe = haber).
    /// </summary>
    public bool IsBalanced => Math.Abs(TotalDebit - TotalCredit) < 0.01;
    public List<JournalLineDto> Lines { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
