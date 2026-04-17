using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Providers;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de proveedores.
/// </summary>
public class ProviderService : IProviderService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProviderService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<ProviderDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var allProviders = (await _unitOfWork.Providers.GetAllAsync(cancellationToken))
            .Where(p => p.CompanyId == companyId)
            .ToList();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = searchTerm.ToLower();
            allProviders = allProviders
                .Where(p => p.Name.ToLower().Contains(searchTerm) ||
                            (p.Cuit != null && p.Cuit.ToLower().Contains(searchTerm)) ||
                            (p.Code != null && p.Code.ToLower().Contains(searchTerm)))
                .ToList();
        }

        var totalCount = allProviders.Count;
        var pagedProviders = allProviders
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedProviders.Select(MapToDto).ToList();

        var result = new PagedResult<ProviderDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<ProviderDto>>.Ok(result);
    }

    public async Task<ApiResponse<ProviderDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var provider = await _unitOfWork.Providers.GetByIdAsync(id, cancellationToken);
        if (provider == null || provider.CompanyId != companyId)
            return ApiResponse<ProviderDto>.Fail("Proveedor no encontrado", "NOT_FOUND");

        return ApiResponse<ProviderDto>.Ok(MapToDto(provider));
    }

    public async Task<ApiResponse<ProviderDto>> CreateAsync(string companyId, CreateProviderRequest request, CancellationToken cancellationToken = default)
    {
        var allProviders = (await _unitOfWork.Providers.GetAllAsync(cancellationToken))
            .Where(p => p.CompanyId == companyId)
            .ToList();

        // Generar código automático si no se proporciona (PRO-001, PRO-002, ...)
        var code = request.Code;
        if (string.IsNullOrWhiteSpace(code))
        {
            var maxNumber = allProviders
                .Where(p => p.Code != null && p.Code.StartsWith("PRO-"))
                .Select(p =>
                {
                    var numPart = p.Code!.Replace("PRO-", "");
                    return int.TryParse(numPart, out var n) ? n : 0;
                })
                .DefaultIfEmpty(0)
                .Max();

            code = $"PRO-{maxNumber + 1:D3}";
        }
        else
        {
            if (allProviders.Any(p => p.Code == code))
                return ApiResponse<ProviderDto>.Fail($"Ya existe un proveedor con código '{code}'", "DUPLICATE_CODE");
        }

        // Verificar CUIT único si se proporciona
        if (!string.IsNullOrWhiteSpace(request.Cuit) &&
            allProviders.Any(p => p.Cuit == request.Cuit))
        {
            return ApiResponse<ProviderDto>.Fail($"Ya existe un proveedor con CUIT '{request.Cuit}'", "DUPLICATE_CUIT");
        }

        var provider = new Domain.Entities.Provider
        {
            Code = code,
            Name = request.Name,
            Cuit = request.Cuit,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            City = request.City,
            Province = request.Province,
            Notes = request.Notes,
            Balance = 0,
            CompanyId = companyId
        };

        await _unitOfWork.Providers.AddAsync(provider, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<ProviderDto>.Ok(MapToDto(provider), "Proveedor creado exitosamente");
    }

    public async Task<ApiResponse<ProviderDto>> UpdateAsync(string companyId, string id, UpdateProviderRequest request, CancellationToken cancellationToken = default)
    {
        var provider = await _unitOfWork.Providers.GetByIdAsync(id, cancellationToken);
        if (provider == null || provider.CompanyId != companyId)
            return ApiResponse<ProviderDto>.Fail("Proveedor no encontrado", "NOT_FOUND");

        // Verificar CUIT único si se modificó
        if (!string.IsNullOrWhiteSpace(request.Cuit) && provider.Cuit != request.Cuit)
        {
            var allProviders = (await _unitOfWork.Providers.GetAllAsync(cancellationToken))
                .Where(p => p.CompanyId == companyId && p.Id != id)
                .ToList();

            if (allProviders.Any(p => p.Cuit == request.Cuit))
                return ApiResponse<ProviderDto>.Fail($"Ya existe un proveedor con CUIT '{request.Cuit}'", "DUPLICATE_CUIT");
        }

        provider.Code = request.Code ?? provider.Code;
        provider.Name = request.Name;
        provider.Cuit = request.Cuit;
        provider.Email = request.Email;
        provider.Phone = request.Phone;
        provider.Address = request.Address;
        provider.City = request.City;
        provider.Province = request.Province;
        provider.Notes = request.Notes;
        provider.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Providers.UpdateAsync(provider, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<ProviderDto>.Ok(MapToDto(provider), "Proveedor actualizado exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var provider = await _unitOfWork.Providers.GetByIdAsync(id, cancellationToken);
        if (provider == null || provider.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Proveedor no encontrado", "NOT_FOUND");

        // Verificar que no tenga pagos asociados
        if (provider.Payments.Count > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar el proveedor porque tiene pagos asociados", "HAS_PAYMENTS");

        provider.Notes = $"[ELIMINADO] {provider.Notes}";
        provider.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Providers.UpdateAsync(provider, cancellationToken);
        await _unitOfWork.Providers.DeleteAsync(provider, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Proveedor eliminado exitosamente");
    }

    private static ProviderDto MapToDto(Domain.Entities.Provider provider)
    {
        return new ProviderDto
        {
            Id = provider.Id,
            Code = provider.Code,
            Name = provider.Name,
            Cuit = provider.Cuit,
            Email = provider.Email,
            Phone = provider.Phone,
            Address = provider.Address,
            City = provider.City,
            Province = provider.Province,
            Notes = provider.Notes,
            Balance = provider.Balance,
            CompanyId = provider.CompanyId,
            InvoicesCount = 0, // Proveedor no tiene colección de facturas directa en el dominio actual
            CreatedAt = provider.CreatedAt,
            UpdatedAt = provider.UpdatedAt
        };
    }
}
