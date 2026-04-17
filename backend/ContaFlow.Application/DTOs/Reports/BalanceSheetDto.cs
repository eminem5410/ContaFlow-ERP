namespace ContaFlow.Application.DTOs.Reports;

/// <summary>
/// DTO del balance general (estado de situación patrimonial).
/// </summary>
public class BalanceSheetDto
{
    public double AssetsTotal { get; set; }
    public double LiabilitiesTotal { get; set; }
    public double EquityTotal { get; set; }
    public double Balance { get; set; }
    public List<BalanceSheetAccountDto> Accounts { get; set; } = new();
    public string? Period { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
