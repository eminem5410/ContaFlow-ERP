namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO del reporte de IVA (Liquidación de IVA).
/// </summary>
public class IvaReportDto
{
    public string? Period { get; set; }
    public double NetTaxable { get; set; }
    public double Iva21 { get; set; }
    public double Iva105 { get; set; }
    public double Iva27 { get; set; }
    public double TotalIva { get; set; }
    public List<IvaOperationDto> Operations { get; set; } = new();
}
