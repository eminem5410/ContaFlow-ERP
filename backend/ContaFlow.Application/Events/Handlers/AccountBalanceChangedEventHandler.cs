using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de cambio de saldo en cuentas: registra en log el cambio
/// e invalida caché de la cuenta afectada y sus cuentas padre.
/// </summary>
public class AccountBalanceChangedEventHandler : IDomainEventHandler<AccountBalanceChangedEvent>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly ILogger<AccountBalanceChangedEventHandler> _logger;

    public AccountBalanceChangedEventHandler(
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        ILogger<AccountBalanceChangedEventHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task HandleAsync(AccountBalanceChangedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Saldo de cuenta {Code} ('{Name}') cambiado: ${Previous:N2} → ${New:N2} (Motivo: {Reason})",
            domainEvent.AccountCode,
            domainEvent.AccountId,
            domainEvent.PreviousBalance,
            domainEvent.NewBalance,
            domainEvent.Reason);

        // Invalidar caché de la cuenta afectada
        await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:accounts:{domainEvent.AccountId}", cancellationToken);

        // Invalidar caché de listas de cuentas
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:accounts:list", cancellationToken);

        // Buscar cuentas padre e invalidar su caché también (saldo jerárquico puede haber cambiado)
        var allAccounts = (await _unitOfWork.Accounts.GetAllAsync(cancellationToken))
            .Where(a => a.CompanyId == domainEvent.CompanyId)
            .ToList();

        var parentIds = new HashSet<string>();
        var currentParentId = allAccounts
            .FirstOrDefault(a => a.Id == domainEvent.AccountId)?.ParentId;

        while (!string.IsNullOrEmpty(currentParentId))
        {
            parentIds.Add(currentParentId);
            currentParentId = allAccounts
                .FirstOrDefault(a => a.Id == currentParentId)?.ParentId;
        }

        // Invalidar caché individual de cada cuenta padre
        foreach (var parentId in parentIds)
        {
            await _cacheService.RemoveAsync($"company:{domainEvent.CompanyId}:accounts:{parentId}", cancellationToken);
        }

        // Invalidar caché de reportes financieros que dependen de saldos
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports:balance-sheet", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports:income-statement", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);

        _logger.LogInformation(
            "Caché invalidada para cuenta {AccountId} y {ParentCount} cuentas padre en empresa {CompanyId}",
            domainEvent.AccountId, parentIds.Count, domainEvent.CompanyId);
    }
}
