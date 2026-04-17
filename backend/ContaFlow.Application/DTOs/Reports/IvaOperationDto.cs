namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO de operación individual para el reporte de IVA.
/// </summary>
public class IvaOperationDto
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Cuit { get; set; }
    public string Name { get; set; } = string.Empty;
    public double NetAmount { get; set; }
    public double TaxRate { get; set; }
    public double TaxAmount { get; set; }
    public string Type { get; set; } = string.Empty;
}
