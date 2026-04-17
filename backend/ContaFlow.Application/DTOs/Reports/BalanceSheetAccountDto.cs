namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO de cuenta para el balance general (estado de situación patrimonial).
/// </summary>
public class BalanceSheetAccountDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Balance { get; set; }
}
