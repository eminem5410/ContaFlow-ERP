namespace ContaFlow.Application.DTOs.JournalEntries;

/// <summary>
/// DTO de línea de asiento contable.
/// </summary>
public class JournalLineDto
{
    public string Id { get; set; } = string.Empty;
    public string AccountId { get; set; } = string.Empty;
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public double Debit { get; set; }
    public double Credit { get; set; }
    public string? Description { get; set; }
}
