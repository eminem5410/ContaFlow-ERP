using ContaFlow.Application.DTOs.BankAccounts;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de cuentas bancarias.
/// </summary>
public class BankAccountService : IBankAccountService
{
    private readonly IUnitOfWork _unitOfWork;

    public BankAccountService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<BankAccountDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var allAccounts = (await _unitOfWork.BankAccounts.GetAllAsync(cancellationToken))
            .Where(b => b.CompanyId == companyId)
            .ToList();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = searchTerm.ToLower();
            allAccounts = allAccounts
                .Where(b => b.Name.ToLower().Contains(searchTerm) ||
                            (b.Bank != null && b.Bank.ToLower().Contains(searchTerm)) ||
                            (b.Number != null && b.Number.ToLower().Contains(searchTerm)))
                .ToList();
        }

        var totalCount = allAccounts.Count;
        var pagedAccounts = allAccounts
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedAccounts.Select(MapToDto).ToList();

        var result = new PagedResult<BankAccountDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<BankAccountDto>>.Ok(result);
    }

    public async Task<ApiResponse<BankAccountDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.BankAccounts.GetByIdAsync(id, cancellationToken);
        if (account == null || account.CompanyId != companyId)
            return ApiResponse<BankAccountDto>.Fail("Cuenta bancaria no encontrada", "NOT_FOUND");

        return ApiResponse<BankAccountDto>.Ok(MapToDto(account));
    }

    public async Task<ApiResponse<BankAccountDto>> CreateAsync(string companyId, CreateBankAccountRequest request, CancellationToken cancellationToken = default)
    {
        var bankAccount = new Domain.Entities.BankAccount
        {
            Name = request.Name,
            Bank = request.Bank,
            Number = request.Number,
            Type = request.Type ?? "cta_corriente",
            Balance = 0,
            Currency = request.Currency ?? "ARS",
            CompanyId = companyId
        };

        await _unitOfWork.BankAccounts.AddAsync(bankAccount, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<BankAccountDto>.Ok(MapToDto(bankAccount), "Cuenta bancaria creada exitosamente");
    }

    public async Task<ApiResponse<BankAccountDto>> UpdateAsync(string companyId, string id, UpdateBankAccountRequest request, CancellationToken cancellationToken = default)
    {
        var bankAccount = await _unitOfWork.BankAccounts.GetByIdAsync(id, cancellationToken);
        if (bankAccount == null || bankAccount.CompanyId != companyId)
            return ApiResponse<BankAccountDto>.Fail("Cuenta bancaria no encontrada", "NOT_FOUND");

        bankAccount.Name = request.Name;
        bankAccount.Bank = request.Bank;
        bankAccount.Number = request.Number;
        bankAccount.Type = request.Type ?? bankAccount.Type;
        bankAccount.Currency = request.Currency ?? bankAccount.Currency;
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.BankAccounts.UpdateAsync(bankAccount, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<BankAccountDto>.Ok(MapToDto(bankAccount), "Cuenta bancaria actualizada exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var bankAccount = await _unitOfWork.BankAccounts.GetByIdAsync(id, cancellationToken);
        if (bankAccount == null || bankAccount.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Cuenta bancaria no encontrada", "NOT_FOUND");

        // Verificar que no tenga pagos asociados
        if (bankAccount.Payments.Count > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar la cuenta bancaria porque tiene pagos asociados", "HAS_PAYMENTS");

        await _unitOfWork.BankAccounts.DeleteAsync(bankAccount, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Cuenta bancaria eliminada exitosamente");
    }

    private static BankAccountDto MapToDto(Domain.Entities.BankAccount bankAccount)
    {
        return new BankAccountDto
        {
            Id = bankAccount.Id,
            Name = bankAccount.Name,
            Bank = bankAccount.Bank,
            Number = bankAccount.Number,
            Cbu = null, // Campo no presente en la entidad actual
            Alias = null, // Campo no presente en la entidad actual
            Type = bankAccount.Type,
            Currency = bankAccount.Currency,
            Balance = bankAccount.Balance,
            CompanyId = bankAccount.CompanyId,
            PaymentsCount = bankAccount.Payments.Count,
            CreatedAt = bankAccount.CreatedAt,
            UpdatedAt = bankAccount.UpdatedAt
        };
    }
}
