using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de asientos contables: recalcula saldos jerárquicos de cuentas
/// e invalida caché de reportes y dashboards afectados.
/// </summary>
public class JournalEntryConfirmedEventHandler : IDomainEventHandler<JournalEntryConfirmedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly ILogger<JournalEntryConfirmedEventHandler> _logger;

    public JournalEntryConfirmedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        ILogger<JournalEntryConfirmedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task HandleAsync(JournalEntryConfirmedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Processing JournalEntryConfirmed for entry #{Number} with {AccountCount} affected accounts",
            domainEvent.EntryNumber, domainEvent.AffectedAccounts.Count);

        // Recalcular saldos de cuentas padre (agregación jerárquica)
        var allAccounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == domainEvent.CompanyId)
            .ToList();

        // Obtener IDs de cuentas afectadas para encontrar sus padres
        var affectedAccountIds = domainEvent.AffectedAccounts.Select(a => a.AccountId).ToHashSet();

        // Encontrar todas las cuentas padre que necesitan recálculo de saldo
        var parentsToRecalculate = new HashSet<string>();
        foreach (var accountId in affectedAccountIds)
        {
            var currentId = accountId;
            while (!string.IsNullOrEmpty(currentId))
            {
                var account = allAccounts.FirstOrDefault(a => a.Id == currentId);
                if (account == null) break;

                currentId = account.ParentId;
                if (!string.IsNullOrEmpty(currentId))
                {
                    parentsToRecalculate.Add(currentId);
                }
            }
        }

        // Recalcular saldos de padres sumando los saldos de sus hijos
        foreach (var parentId in parentsToRecalculate)
        {
            var children = allAccounts.Where(a => a.ParentId == parentId).ToList();
            if (children.Count == 0) continue;

            var parentAccount = allAccounts.FirstOrDefault(a => a.Id == parentId);
            if (parentAccount == null) continue;

            // Para cuentas padre, el saldo = suma de los saldos de los hijos
            parentAccount.Balance = children.Sum(c => c.Balance);
            await _unitOfWork.Accounts.UpdateAsync(parentAccount, cancellationToken);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Invalidar caché de cuentas y reportes afectados por el asiento
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:accounts", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports:balance-sheet", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:journal-entries", cancellationToken);

        _logger.LogInformation(
            "Recalculated balances for {ParentCount} parent accounts after entry #{Number}. Cache invalidated.",
            parentsToRecalculate.Count, domainEvent.EntryNumber);
    }
}
