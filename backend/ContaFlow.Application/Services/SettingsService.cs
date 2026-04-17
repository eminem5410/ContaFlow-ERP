using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Settings;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de configuración de la empresa.
/// </summary>
public class SettingsService : ISettingsService
{
    private readonly IUnitOfWork _unitOfWork;

    public SettingsService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<CompanySettingsDto>> GetAsync(string companyId, CancellationToken cancellationToken = default)
    {
        var company = await _unitOfWork.Companies.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
            return ApiResponse<CompanySettingsDto>.Fail("Empresa no encontrada", "NOT_FOUND");

        return ApiResponse<CompanySettingsDto>.Ok(MapToDto(company));
    }

    public async Task<ApiResponse<CompanySettingsDto>> UpdateAsync(string companyId, UpdateSettingsRequest request, CancellationToken cancellationToken = default)
    {
        var company = await _unitOfWork.Companies.GetByIdAsync(companyId, cancellationToken);
        if (company == null)
            return ApiResponse<CompanySettingsDto>.Fail("Empresa no encontrada", "NOT_FOUND");

        // Actualización parcial: solo se actualizan los campos que tengan un valor no nulo
        if (request.Name != null)
            company.Name = request.Name;
        if (request.Cuit != null)
            company.Cuit = request.Cuit;
        if (request.Email != null)
            company.Email = request.Email;
        if (request.Phone != null)
            company.Phone = request.Phone;
        if (request.Address != null)
            company.Address = request.Address;
        if (request.Logo != null)
            company.Logo = request.Logo;
        if (request.Plan != null)
            company.Plan = request.Plan;
        // Province y City no están en la entidad Company actual
        // Se ignoran hasta que se agreguen al dominio

        company.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Companies.UpdateAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<CompanySettingsDto>.Ok(MapToDto(company), "Configuración actualizada exitosamente");
    }

    private static CompanySettingsDto MapToDto(Domain.Entities.Company company)
    {
        return new CompanySettingsDto
        {
            Id = company.Id,
            Name = company.Name,
            Cuit = company.Cuit,
            Email = company.Email,
            Phone = company.Phone,
            Address = company.Address,
            Logo = company.Logo,
            Plan = company.Plan,
            Province = null, // Campo no presente en la entidad actual
            City = null      // Campo no presente en la entidad actual
        };
    }
}
