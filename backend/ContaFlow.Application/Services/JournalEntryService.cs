using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.JournalEntries;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de asientos contables (partida doble).
/// </summary>
public class JournalEntryService : IJournalEntryService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEventDispatcher _eventDispatcher;
    private readonly ILogger<JournalEntryService> _logger;

    public JournalEntryService(IUnitOfWork unitOfWork, IEventDispatcher eventDispatcher, ILogger<JournalEntryService> logger)
    {
        _unitOfWork = unitOfWork;
        _eventDispatcher = eventDispatcher;
        _logger = logger;
    }

    public async Task<ApiResponse<PagedResult<JournalEntryDto>>> GetAllAsync(
        string companyId,
        int pageNumber = 1,
        int pageSize = 20,
        string? status = null,
        CancellationToken cancellationToken = default)
    {
        var entries = (await _unitOfWork.JournalEntries.GetAllAsync(cancellationToken))
            .Where(e => e.CompanyId == companyId)
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(status))
            entries = entries.Where(e => e.Status == status);

        entries = entries.OrderByDescending(e => e.Number);

        var totalCount = entries.Count();
        var paged = entries
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var items = paged.Select(MapToDto).ToList();

        var result = new PagedResult<JournalEntryDto>
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        };

        return ApiResponse<PagedResult<JournalEntryDto>>.Ok(result);
    }

    public async Task<ApiResponse<JournalEntryDto>> GetByIdAsync(
        string companyId,
        string id,
        CancellationToken cancellationToken = default)
    {
        var entry = await _unitOfWork.JournalEntries.GetByIdAsync(id, cancellationToken);
        if (entry == null || entry.CompanyId != companyId)
            return ApiResponse<JournalEntryDto>.Fail("Asiento no encontrado", "NOT_FOUND");

        return ApiResponse<JournalEntryDto>.Ok(MapToDto(entry));
    }

    public async Task<ApiResponse<JournalEntryDto>> CreateAsync(
        string companyId,
        string userId,
        CreateJournalEntryRequest request,
        CancellationToken cancellationToken = default)
    {
        // Validar partida doble: total débitos = total créditos
        var totalDebit = request.Lines.Sum(l => l.Debit);
        var totalCredit = request.Lines.Sum(l => l.Credit);

        if (Math.Abs(totalDebit - totalCredit) > 0.01)
            return ApiResponse<JournalEntryDto>.Fail(
                $"El asiento no está balanceado. Débitos: {totalDebit:F2}, Créditos: {totalCredit:F2}",
                "UNBALANCED_ENTRY");

        // Generar número de asiento
        var existingEntries = (await _unitOfWork.JournalEntries.GetAllAsync(cancellationToken))
            .Where(e => e.CompanyId == companyId)
            .ToList();
        var nextNumber = existingEntries.Count > 0 ? existingEntries.Max(e => e.Number) + 1 : 1;

        // Verificar que las cuentas existen y pertenecen a la empresa
        var accounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == companyId)
            .ToDictionary(a => a.Id);

        foreach (var line in request.Lines)
        {
            if (!accounts.ContainsKey(line.AccountId))
                return ApiResponse<JournalEntryDto>.Fail($"Cuenta '{line.AccountId}' no encontrada", "ACCOUNT_NOT_FOUND");
        }

        // Crear asiento con líneas
        var entry = new JournalEntry
        {
            Number = nextNumber,
            Date = request.Date,
            Description = request.Description,
            Concept = request.Concept,
            Status = "borrador",
            CompanyId = companyId,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            Lines = request.Lines.Select(l => new JournalEntryLine
            {
                AccountId = l.AccountId,
                Debit = l.Debit,
                Credit = l.Credit,
                Description = l.Description
            }).ToList()
        };

        await _unitOfWork.JournalEntries.AddAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de asiento creado
        try
        {
            var createdEvent = new JournalEntryCreatedEvent
            {
                EventType = nameof(JournalEntryCreatedEvent),
                CompanyId = companyId,
                UserId = userId,
                EntryId = entry.Id,
                EntryNumber = entry.Number,
                Description = entry.Description ?? string.Empty,
                TotalDebit = entry.TotalDebit,
                TotalCredit = entry.TotalCredit
            };
            await _eventDispatcher.DispatchAsync(createdEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch JournalEntryCreatedEvent for entry {EntryId}", entry.Id);
        }

        return ApiResponse<JournalEntryDto>.Ok(MapToDto(entry), "Asiento creado exitosamente");
    }

    public async Task<ApiResponse<JournalEntryDto>> ConfirmAsync(
        string companyId,
        string id,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var entry = await _unitOfWork.JournalEntries.GetByIdAsync(id, cancellationToken);
        if (entry == null || entry.CompanyId != companyId)
            return ApiResponse<JournalEntryDto>.Fail("Asiento no encontrado", "NOT_FOUND");

        if (entry.Status == "confirmado")
            return ApiResponse<JournalEntryDto>.Fail("El asiento ya está confirmado", "ALREADY_CONFIRMED");

        if (entry.Status == "anulado")
            return ApiResponse<JournalEntryDto>.Fail("El asiento está anulado y no puede confirmarse", "CANCELED_ENTRY");

        // Cargar líneas con cuentas
        var entryWithLines = (await _unitOfWork.JournalEntries.GetAllAsync(cancellationToken))
            .FirstOrDefault(e => e.Id == entry.Id);

        if (entryWithLines == null)
            return ApiResponse<JournalEntryDto>.Fail("Asiento no encontrado", "NOT_FOUND");

        // Actualizar saldos de cuentas afectadas
        var affectedAccounts = new List<AccountBalanceUpdate>();
        foreach (var line in entryWithLines.Lines)
        {
            var account = await _unitOfWork.Accounts.GetByIdAsync(line.AccountId, cancellationToken);
            if (account != null)
            {
                var previousBalance = account.Balance;
                account.Balance += line.Debit - line.Credit;
                await _unitOfWork.Accounts.UpdateAsync(account, cancellationToken);

                affectedAccounts.Add(new AccountBalanceUpdate
                {
                    AccountId = account.Id,
                    AccountCode = account.Code,
                    AccountName = account.Name,
                    Debit = line.Debit,
                    Credit = line.Credit,
                    NewBalance = account.Balance
                });
            }
        }

        entry.Status = "confirmado";
        entry.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.JournalEntries.UpdateAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Registrar en auditoría
        var user = await _unitOfWork.Users.GetByIdAsync(userId, cancellationToken);
        var auditLog = new AuditLog
        {
            UserId = userId,
            UserName = user?.Name ?? "Sistema",
            Action = "confirm",
            Entity = "journal_entry",
            EntityId = entry.Id,
            Details = $"Asiento #{entry.Number} confirmado. Débitos: {entry.TotalDebit:F2}, Créditos: {entry.TotalCredit:F2}",
            CompanyId = companyId
        };
        await _unitOfWork.AuditLogs.AddAsync(auditLog, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de asiento confirmado
        try
        {
            var confirmedEvent = new JournalEntryConfirmedEvent
            {
                EventType = nameof(JournalEntryConfirmedEvent),
                CompanyId = companyId,
                UserId = userId,
                EntryId = entry.Id,
                EntryNumber = entry.Number,
                AffectedAccounts = affectedAccounts
            };
            await _eventDispatcher.DispatchAsync(confirmedEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch JournalEntryConfirmedEvent for entry {EntryId}", entry.Id);
        }

        return ApiResponse<JournalEntryDto>.Ok(MapToDto(entry), "Asiento confirmado exitosamente");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(
        string companyId,
        string id,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var entry = await _unitOfWork.JournalEntries.GetByIdAsync(id, cancellationToken);
        if (entry == null || entry.CompanyId != companyId)
            return ApiResponse<bool>.Fail("Asiento no encontrado", "NOT_FOUND");

        if (entry.Status != "borrador")
            return ApiResponse<bool>.Fail("Solo se pueden eliminar asientos en estado borrador", "NOT_DRAFT");

        await _unitOfWork.JournalEntries.DeleteAsync(entry, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ApiResponse<bool>.Ok(true, "Asiento eliminado exitosamente");
    }

    private static JournalEntryDto MapToDto(JournalEntry entry)
    {
        return new JournalEntryDto
        {
            Id = entry.Id,
            Number = entry.Number,
            Date = entry.Date,
            Description = entry.Description,
            Concept = entry.Concept,
            Status = entry.Status,
            TotalDebit = entry.TotalDebit,
            TotalCredit = entry.TotalCredit,
            Lines = entry.Lines.Select(l => new JournalLineDto
            {
                Id = l.Id,
                AccountId = l.AccountId,
                AccountCode = l.Account?.Code ?? "",
                AccountName = l.Account?.Name ?? "",
                Debit = l.Debit,
                Credit = l.Credit,
                Description = l.Description
            }).ToList(),
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }
}
