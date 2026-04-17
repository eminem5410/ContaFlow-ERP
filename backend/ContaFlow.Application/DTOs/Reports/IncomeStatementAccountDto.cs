namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO de cuenta para el estado de resultados.
/// </summary>
public class IncomeStatementAccountDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Balance { get; set; }
}
