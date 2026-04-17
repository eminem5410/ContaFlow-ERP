namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO del estado de resultados (ingresos vs. gastos).
/// </summary>
public class IncomeStatementDto
{
    public double GrossIncome { get; set; }
    public double TotalExpenses { get; set; }
    public double NetIncome { get; set; }
    public List<IncomeStatementAccountDto> Accounts { get; set; } = new();
    public string? Period { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
