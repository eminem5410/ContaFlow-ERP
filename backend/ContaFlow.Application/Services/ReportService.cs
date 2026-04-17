using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Reports;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de generación de reportes contables.
/// </summary>
public class ReportService : IReportService
{
    private readonly IUnitOfWork _unitOfWork;

    public ReportService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<BalanceSheetDto>> GetBalanceSheetAsync(
        string companyId,
        DateTime? asOfDate = null,
        CancellationToken cancellationToken = default)
    {
        var accounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToList();

        // Filtrar solo cuentas hoja (sin hijos) que tienen saldo
        var leafAccounts = accounts
            .Where(a => a.Children.Count == 0 || a.Balance != 0)
            .ToList();

        var balanceAccounts = leafAccounts
            .Select(a => new BalanceSheetAccountDto
            {
                Code = a.Code,
                Name = a.Name,
                Type = a.Type,
                Balance = a.Balance
            })
            .OrderBy(a => a.Code)
            .ToList();

        var assetsTotal = balanceAccounts
            .Where(a => a.Type == "activo")
            .Sum(a => a.Balance);

        var liabilitiesTotal = balanceAccounts
            .Where(a => a.Type == "pasivo")
            .Sum(a => a.Balance);

        var equityTotal = balanceAccounts
            .Where(a => a.Type == "patrimonio")
            .Sum(a => a.Balance);

        var balance = assetsTotal - liabilitiesTotal - equityTotal;

        var period = asOfDate.HasValue
            ? $"Al {asOfDate.Value:dd/MM/yyyy}"
            : $"Al {DateTime.UtcNow:dd/MM/yyyy}";

        var result = new BalanceSheetDto
        {
            AssetsTotal = assetsTotal,
            LiabilitiesTotal = liabilitiesTotal,
            EquityTotal = equityTotal,
            Balance = balance,
            Accounts = balanceAccounts,
            Period = period,
            GeneratedAt = DateTime.UtcNow
        };

        return ApiResponse<BalanceSheetDto>.Ok(result);
    }

    public async Task<ApiResponse<IncomeStatementDto>> GetIncomeStatementAsync(
        string companyId,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var accounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId && (a.Type == "ingreso" || a.Type == "gasto"))
            .ToList();

        var incomeAccounts = accounts
            .Select(a => new IncomeStatementAccountDto
            {
                Code = a.Code,
                Name = a.Name,
                Type = a.Type,
                Balance = a.Balance
            })
            .OrderBy(a => a.Code)
            .ToList();

        var grossIncome = incomeAccounts
            .Where(a => a.Type == "ingreso")
            .Sum(a => a.Balance);

        var totalExpenses = incomeAccounts
            .Where(a => a.Type == "gasto")
            .Sum(a => a.Balance);

        var netIncome = grossIncome - totalExpenses;

        var period = fromDate.HasValue && toDate.HasValue
            ? $"{fromDate.Value:dd/MM/yyyy} - {toDate.Value:dd/MM/yyyy}"
            : fromDate.HasValue
                ? $"Desde {fromDate.Value:dd/MM/yyyy}"
                : toDate.HasValue
                    ? $"Hasta {toDate.Value:dd/MM/yyyy}"
                    : $"Al {DateTime.UtcNow:dd/MM/yyyy}";

        var result = new IncomeStatementDto
        {
            GrossIncome = grossIncome,
            TotalExpenses = totalExpenses,
            NetIncome = netIncome,
            Accounts = incomeAccounts,
            Period = period,
            GeneratedAt = DateTime.UtcNow
        };

        return ApiResponse<IncomeStatementDto>.Ok(result);
    }

    public async Task<ApiResponse<IvaReportDto>> GetIvaSalesAsync(
        string companyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var invoices = (await _unitOfWork.Invoices.GetAllAsync(cancellationToken))
            .Where(i => i.CompanyId == companyId &&
                        i.Date >= fromDate &&
                        i.Date < toDate.Date.AddDays(1))
            .ToList();

        // Facturas de venta son aquellas con ClientId asignado (excluyendo notas de crédito/débito si se desea)
        var salesInvoices = invoices
            .Where(i => i.ClientId != null)
            .ToList();

        var operations = new List<IvaOperationDto>();

        foreach (var invoice in salesInvoices)
        {
            operations.Add(new IvaOperationDto
            {
                InvoiceNumber = invoice.Number,
                Date = invoice.Date,
                Cuit = invoice.Client?.Cuit,
                Name = invoice.Client?.Name ?? string.Empty,
                NetAmount = invoice.NetTotal,
                TaxRate = invoice.NetTotal > 0 ? invoice.Tax / invoice.NetTotal * 100 : 0,
                TaxAmount = invoice.Tax,
                Type = invoice.Type
            });
        }

        var report = new IvaReportDto
        {
            Period = $"{fromDate:dd/MM/yyyy} - {toDate:dd/MM/yyyy}",
            NetTaxable = operations.Sum(o => o.NetAmount),
            Iva21 = operations.Where(o => Math.Abs(o.TaxRate - 21) < 0.5).Sum(o => o.TaxAmount),
            Iva105 = operations.Where(o => Math.Abs(o.TaxRate - 10.5) < 0.5).Sum(o => o.TaxAmount),
            Iva27 = operations.Where(o => Math.Abs(o.TaxRate - 27) < 0.5).Sum(o => o.TaxAmount),
            TotalIva = operations.Sum(o => o.TaxAmount),
            Operations = operations
        };

        return ApiResponse<IvaReportDto>.Ok(report);
    }

    public async Task<ApiResponse<IvaReportDto>> GetIvaPurchasesAsync(
        string companyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        var invoices = (await _unitOfWork.Invoices.GetAllAsync(cancellationToken))
            .Where(i => i.CompanyId == companyId &&
                        i.Date >= fromDate &&
                        i.Date < toDate.Date.AddDays(1))
            .ToList();

        // Facturas de compra son aquellas sin ClientId asignado
        var purchaseInvoices = invoices
            .Where(i => i.ClientId == null)
            .ToList();

        var operations = new List<IvaOperationDto>();

        foreach (var invoice in purchaseInvoices)
        {
            operations.Add(new IvaOperationDto
            {
                InvoiceNumber = invoice.Number,
                Date = invoice.Date,
                Cuit = null,
                Name = string.Empty,
                NetAmount = invoice.NetTotal,
                TaxRate = invoice.NetTotal > 0 ? invoice.Tax / invoice.NetTotal * 100 : 0,
                TaxAmount = invoice.Tax,
                Type = invoice.Type
            });
        }

        var report = new IvaReportDto
        {
            Period = $"{fromDate:dd/MM/yyyy} - {toDate:dd/MM/yyyy}",
            NetTaxable = operations.Sum(o => o.NetAmount),
            Iva21 = operations.Where(o => Math.Abs(o.TaxRate - 21) < 0.5).Sum(o => o.TaxAmount),
            Iva105 = operations.Where(o => Math.Abs(o.TaxRate - 10.5) < 0.5).Sum(o => o.TaxAmount),
            Iva27 = operations.Where(o => Math.Abs(o.TaxRate - 27) < 0.5).Sum(o => o.TaxAmount),
            TotalIva = operations.Sum(o => o.TaxAmount),
            Operations = operations
        };

        return ApiResponse<IvaReportDto>.Ok(report);
    }
}
