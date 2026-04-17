using ContaFlow.Application.DTOs.Clients;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de gestión de clientes.
/// </summary>
public class ClientService : IClientService
{
    private readonly IUnitOfWork _unitOfWork;

    public ClientService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<PagedResult<ClientDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 50,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var allClients = (await _unitOfWork.Clients.GetAllAsync(cancellationToken))
            .Where(c => c.CompanyId == companyId)
            .ToList();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            searchTerm = searchTerm.ToLower();
            allClients = allClients
                .Where(c => c.Name.ToLower().Contains(searchTerm) ||
                            (c.Cuit != null && c.Cuit.ToLower().Contains(searchTerm)) ||
                            (c.Code != null && c.Code.ToLower().Contains(searchTerm)))
                .ToList();
        }

        var totalCount = allClients.Count;
        var pagedClients = allClients
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = pagedClients.Select(MapToDto).ToList();

        var result = new PagedResult<ClientDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<ClientDto>>.Ok(result);
    }

    public async Task<ApiResponse<ClientDto>> GetByIdAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var client = await _unitOfWork.Clients.GetByIdAsync(id, cancellationToken);
        if (client == null || client.CompanyId != companyId)
            return ApiResponse<ClientDto>.Fail("Cliente no encontrado", "NOT_FOUND");

        return ApiResponse<ClientDto>.Ok(MapToDto(client));
    }

    public async Task<ApiResponse<ClientDto>> CreateAsync(string companyId, CreateClientRequest request, CancellationToken cancellationToken = default)
    {
        var allClients = (await _unitOfWork.Clients.GetAllAsync(cancellationToken))
            .Where(c => c.CompanyId == companyId)
            .ToList();

        // Generar código automático si no se proporciona (CLI-001, CLI-002, ...)
        var code = request.Code;
        if (string.IsNullOrWhiteSpace(code))
        {
            var maxNumber = allClients
                .Where(c => c.Code != null && c.Code.StartsWith("CLI-"))
                .Select(c =>
                {
                    var numPart = c.Code!.Replace("CLI-", "");
                    return int.TryParse(numPart, out var n) ? n : 0;
                })
                .DefaultIfEmpty(0)
                .Max();

            code = $"CLI-{maxNumber + 1:D3}";
        }
        else
        {
            // Verificar código único por empresa
            if (allClients.Any(c => c.Code == code))
                return ApiResponse<ClientDto>.Fail($"Ya existe un cliente con código '{code}'", "DUPLICATE_CODE");
        }

        // Verificar CUIT único si se proporciona
        if (!string.IsNullOrWhiteSpace(request.Cuit) &&
            allClients.Any(c => c.Cuit == request.Cuit))
        {
            return ApiResponse<ClientDto>.Fail($"Ya existe un cliente con CUIT '{request.Cuit}'", "DUPLICATE_CUIT");
        }

        var client = new Domain.Entities.Client
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

        await _unitOfWork.Clients.AddAsync(client, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<ClientDto>.Ok(MapToDto(client), "Cliente creado exitosamente");
    }

    public async Task<ApiResponse<ClientDto>> UpdateAsync(string companyId, string id, UpdateClientRequest request, CancellationToken cancellationToken = default)
    {
        var client = await _unitOfWork.Clients.GetByIdAsync(id, cancellationToken);
        if (client == null || client.CompanyId != companyId)
            return ApiResponse<ClientDto>.Fail("Cliente no encontrado", "NOT_FOUND");

        // Verificar CUIT único si se modificó
        if (!string.IsNullOrWhiteSpace(request.Cuit) && client.Cuit != request.Cuit)
        {
            var allClients = (await _unitOfWork.Clients.GetAllAsync(cancellationToken))
                .Where(c => c.CompanyId == companyId && c.Id != id)
                .ToList();

            if (allClients.Any(c => c.Cuit == request.Cuit))
                return ApiResponse<ClientDto>.Fail($"Ya existe un cliente con CUIT '{request.Cuit}'", "DUPLICATE_CUIT");
        }

        client.Code = request.Code ?? client.Code;
        client.Name = request.Name;
        client.Cuit = request.Cuit;
        client.Email = request.Email;
        client.Phone = request.Phone;
        client.Address = request.Address;
        client.City = request.City;
        client.Province = request.Province;
        client.Notes = request.Notes;
        client.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Clients.UpdateAsync(client, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<ClientDto>.Ok(MapToDto(client), "Cliente actualizado exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(string companyId, string id, CancellationToken cancellationToken = default)
    {
        var client = await _unitOfWork.Clients.GetByIdAsync(id, cancellationToken);
        if (client == null || client.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Cliente no encontrado", "NOT_FOUND");

        // Verificar que no tenga facturas asociadas
        if (client.Invoices.Count > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar el cliente porque tiene facturas asociadas", "HAS_INVOICES");

        // Verificar que no tenga pagos asociados
        if (client.Payments.Count > 0)
            return ApiResponse<bool>.Fail("No se puede eliminar el cliente porque tiene pagos asociados", "HAS_PAYMENTS");

        client.Notes = $"[ELIMINADO] {client.Notes}";
        client.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Clients.UpdateAsync(client, cancellationToken);
        await _unitOfWork.Clients.DeleteAsync(client, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Cliente eliminado exitosamente");
    }

    private static ClientDto MapToDto(Domain.Entities.Client client)
    {
        return new ClientDto
        {
            Id = client.Id,
            Code = client.Code,
            Name = client.Name,
            Cuit = client.Cuit,
            Email = client.Email,
            Phone = client.Phone,
            Address = client.Address,
            City = client.City,
            Province = client.Province,
            Notes = client.Notes,
            Balance = client.Balance,
            CompanyId = client.CompanyId,
            InvoicesCount = client.Invoices.Count,
            CreatedAt = client.CreatedAt,
            UpdatedAt = client.UpdatedAt
        };
    }
}
