using ContaFlow.Application.DTOs.Accounts;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de plan de cuentas.
/// </summary>
public class AccountService : IAccountService
{
    private readonly IUnitOfWork _unitOfWork;

    public AccountService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<AccountDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var allAccounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToList();

        // Filtrar por término de búsqueda
        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = searchTerm.ToLower();
            allAccounts = allAccounts
                .Where(a => a.Code.ToLower().Contains(searchTerm) ||
                            a.Name.ToLower().Contains(searchTerm))
                .ToList();
        }

        var totalCount = allAccounts.Count;
        var pagedAccounts = allAccounts
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedAccounts.Select(MapToDto).ToList();

        var result = new PagedResult<AccountDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<AccountDto>>.Ok(result);
    }

    public async Task<ApiResponse<AccountDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(id, cancellationToken);
        if (account == null || account.CompanyId != companyId)
            return ApiResponse<AccountDto>.Fail("Cuenta no encontrada", "NOT_FOUND");

        return ApiResponse<AccountDto>.Ok(MapToDto(account));
    }

    public async Task<ApiResponse<AccountDto>> CreateAsync(string companyId, CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var allAccounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToList();

        // Verificar código único por empresa
        if (allAccounts.Any(a => a.Code == request.Code))
            return ApiResponse<AccountDto>.Fail($"Ya existe una cuenta con código '{request.Code}'", "DUPLICATE_CODE");

        // Verificar cuenta padre
        if (!string.IsNullOrEmpty(request.ParentId))
        {
            var parent = allAccounts.FirstOrDefault(a => a.Id == request.ParentId);
            if (parent == null)
                return ApiResponse<AccountDto>.Fail("Cuenta padre no encontrada", "PARENT_NOT_FOUND");
        }

        var account = new Domain.Entities.Account
        {
            Code = request.Code,
            Name = request.Name,
            Type = request.Type,
            Subtype = request.Subtype,
            ParentId = request.ParentId,
            Level = request.Level,
            Balance = 0,
            CompanyId = companyId
        };

        await _unitOfWork.Accounts.AddAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<AccountDto>.Ok(MapToDto(account), "Cuenta creada exitosamente");
    }

    public async Task<ApiResponse<AccountDto>> UpdateAsync(string companyId, string id, CreateAccountRequest request, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(id, cancellationToken);
        if (account == null || account.CompanyId != companyId)
            return ApiResponse<AccountDto>.Fail("Cuenta no encontrada", "NOT_FOUND");

        account.Code = request.Code;
        account.Name = request.Name;
        account.Type = request.Type;
        account.Subtype = request.Subtype;
        account.ParentId = request.ParentId;
        account.Level = request.Level;
        account.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<AccountDto>.Ok(MapToDto(account), "Cuenta actualizada exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var account = await _unitOfWork.Accounts.GetByIdAsync(id, cancellationToken);
        if (account == null || account.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Cuenta no encontrada", "NOT_FOUND");

        // Verificar que no tenga cuentas hijas
        if (account.Children.Count > 0)
        {
            throw new InvalidOperationException(
                $"No se puede eliminar la cuenta '{account.Code} - {account.Name}' porque tiene {account.Children.Count} cuenta(s) hija(s). Elimine primero las cuentas hijas.");
        }

        // Verificar que no tenga líneas de asiento contable asociadas
        if (account.JournalLines.Count > 0)
        {
            throw new InvalidOperationException(
                $"No se puede eliminar la cuenta '{account.Code} - {account.Name}' porque tiene {account.JournalLines.Count} línea(s) de asiento contable asociada(s). Elimine primero los asientos que afectan esta cuenta.");
        }

        await _unitOfWork.Accounts.DeleteAsync(account, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Cuenta eliminada exitosamente");
    }

    public async Task<ApiResponse<List<AccountDto>>> GetAccountTreeAsync(string companyId, CancellationToken cancellationToken = default)
    {
        var allAccounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToList();

        var tree = allAccounts.Select(MapToDto).ToList();
        return ApiResponse<List<AccountDto>>.Ok(tree);
    }

    private static AccountDto MapToDto(Domain.Entities.Account account)
    {
        return new AccountDto
        {
            Id = account.Id,
            Code = account.Code,
            Name = account.Name,
            Type = account.Type,
            Subtype = account.Subtype,
            ParentId = account.ParentId,
            ParentName = account.Parent?.Name,
            Level = account.Level,
            Balance = account.Balance,
            CreatedAt = account.CreatedAt,
            UpdatedAt = account.UpdatedAt,
            IsLeaf = account.Children.Count == 0,
            ChildrenCount = account.Children.Count
        };
    }
}
