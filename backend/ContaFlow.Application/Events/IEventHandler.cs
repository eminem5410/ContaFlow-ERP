namespace ContaFlow.Application.Events;

/// <summary>
/// Interfaz base para handlers de eventos de dominio.
/// </summary>
public interface IDomainEventHandler<in TEvent> where TEvent : Domain.Events.DomainEvent
{
    Task HandleAsync(TEvent domainEvent, CancellationToken cancellationToken = default);
}

/// <summary>
/// Interfaz para el dispatcher que enruta eventos a los handlers registrados.
/// </summary>
public interface IEventDispatcher
{
    Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : Domain.Events.DomainEvent;
}
