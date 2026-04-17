namespace ContaFlow.Application.DTOs.Accounts;

/// <summary>
/// DTO de cuenta contable para respuestas.
/// </summary>
public class AccountDto
{
    public string Id { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Subtype { get; set; }
    public string? ParentId { get; set; }
    public string? ParentName { get; set; }
    public int Level { get; set; }
    public double Balance { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    /// <summary>
    /// Indica si la cuenta es imputable (hoja) o título (tiene hijos).
    /// </summary>
    public bool IsLeaf { get; set; }
    public int ChildrenCount { get; set; }
}
