using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Invoices;

/// <summary>
/// DTO para crear una nueva factura con sus ítems.
/// </summary>
public class CreateInvoiceRequest
{
    [Required(ErrorMessage = "El número de factura es obligatorio")]
    [StringLength(50, ErrorMessage = "El número no puede superar los 50 caracteres")]
    public string Number { get; set; } = string.Empty;

    [Required(ErrorMessage = "El tipo de factura es obligatorio")]
    [RegularExpression("^[ABC]$", ErrorMessage = "Tipo inválido. Valores: A, B, C")]
    public string Type { get; set; } = string.Empty;

    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string? ClientId { get; set; }
    public string? Notes { get; set; }

    [Required(ErrorMessage = "Debe incluir al menos un ítem")]
    [MinLength(1, ErrorMessage = "La factura debe tener al menos un ítem")]
    public List<CreateInvoiceItemRequest> Items { get; set; } = new();
}

/// <summary>
/// DTO para ítem individual dentro de la creación de una factura.
/// </summary>
public class CreateInvoiceItemRequest
{
    [Required(ErrorMessage = "La descripción es obligatoria")]
    [StringLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "La cantidad debe ser mayor a 0")]
    public double Quantity { get; set; } = 1;

    [Range(0, double.MaxValue, ErrorMessage = "El precio unitario no puede ser negativo")]
    public double UnitPrice { get; set; }

    [Range(0, 100, ErrorMessage = "La tasa de IVA debe estar entre 0 y 100")]
    public double TaxRate { get; set; } = 21;
}
