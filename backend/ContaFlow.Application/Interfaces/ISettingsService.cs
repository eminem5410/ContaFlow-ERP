using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.Settings;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz del servicio de configuración de la empresa.
/// </summary>
public interface ISettingsService
{
    /// <summary>
    /// Obtiene la configuración actual de la empresa.
    /// </summary>
    Task<ApiResponse<CompanySettingsDto>> GetAsync(string companyId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Actualiza la configuración de la empresa (actualización parcial).
    /// Solo se actualizan los campos que tengan un valor no nulo.
    /// </summary>
    Task<ApiResponse<CompanySettingsDto>> UpdateAsync(string companyId, UpdateSettingsRequest request, CancellationToken cancellationToken = default);
}
