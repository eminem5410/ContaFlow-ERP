using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Reports;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de generación de reportes contables.
/// </summary>
public interface IReportService
{
    /// <summary>
    /// Genera el balance general (estado de situación patrimonial).
    /// Calcula activos, pasivos y patrimonio a partir de los saldos de cuentas.
    /// </summary>
    Task<ApiResponse<BalanceSheetDto>> GetBalanceSheetAsync(
        string companyId,
        DateTime? asOfDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera el estado de resultados (ingresos vs. gastos).
    /// </summary>
    Task<ApiResponse<IncomeStatementDto>> GetIncomeStatementAsync(
        string companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera el reporte de IVA de ventas para un período determinado.
    /// </summary>
    Task<ApiResponse<IvaReportDto>> GetIvaSalesAsync(
        string companyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera el reporte de IVA de compras para un período determinado.
    /// </summary>
    Task<ApiResponse<IvaReportDto>> GetIvaPurchasesAsync(
        string companyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default);
}
