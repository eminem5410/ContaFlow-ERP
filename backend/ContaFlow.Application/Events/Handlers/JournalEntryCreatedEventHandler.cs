using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events.Handlers;

/// <summary>
/// Maneja eventos de creación de asientos contables: registra en log
/// e invalida caché de asientos y reportes de la empresa.
/// </summary>
public class JournalEntryCreatedEventHandler : IDomainEventHandler<JournalEntryCreatedEvent>
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<JournalEntryCreatedEventHandler> _logger;

    public JournalEntryCreatedEventHandler(
        ICacheService cacheService,
        ILogger<JournalEntryCreatedEventHandler> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task HandleAsync(JournalEntryCreatedEvent domainEvent, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation(
            "Asiento contable #{Number} creado — Descripción: {Description}, " +
            "Debe: ${TotalDebit:N2}, Haber: ${TotalCredit:N2}",
            domainEvent.EntryNumber, domainEvent.Description,
            domainEvent.TotalDebit, domainEvent.TotalCredit);

        // Invalidar caché de asientos contables de la empresa
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:journal-entries", cancellationToken);

        // Invalidar caché de dashboard y reportes que dependen de los asientos
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:dashboard", cancellationToken);
        await _cacheService.RemoveByPrefixAsync($"company:{domainEvent.CompanyId}:reports", cancellationToken);

        _logger.LogInformation(
            "Caché invalidada para asientos de la empresa {CompanyId} tras creación del asiento #{Number}",
            domainEvent.CompanyId, domainEvent.EntryNumber);

        await Task.CompletedTask;
    }
}
