using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.JournalEntries;

/// <summary>
/// DTO para crear un nuevo asiento contable con sus líneas.
/// </summary>
public class CreateJournalEntryRequest
{
    public DateTime Date { get; set; } = DateTime.UtcNow;

    [Required(ErrorMessage = "La descripción es obligatoria")]
    [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
    public string Description { get; set; } = string.Empty;

    public string? Concept { get; set; }

    [Required(ErrorMessage = "Debe incluir al menos una línea de asiento")]
    [MinLength(2, ErrorMessage = "Un asiento debe tener al menos 2 líneas (partida doble)")]
    public List<CreateJournalLineRequest> Lines { get; set; } = new();
}

/// <summary>
/// DTO para línea individual dentro de la creación de un asiento.
/// </summary>
public class CreateJournalLineRequest
{
    [Required(ErrorMessage = "La cuenta es obligatoria")]
    public string AccountId { get; set; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "El débito no puede ser negativo")]
    public double Debit { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "El crédito no puede ser negativo")]
    public double Credit { get; set; }

    public string? Description { get; set; }
}
