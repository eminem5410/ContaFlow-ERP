using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Application.Events;

/// <summary>
/// Despachador de eventos de dominio que publica a Kafka y ejecuta handlers locales.
/// </summary>
public class EventDispatcher : IEventDispatcher
{
    private readonly IKafkaProducer _kafkaProducer;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EventDispatcher> _logger;

    public EventDispatcher(IKafkaProducer kafkaProducer, IServiceProvider serviceProvider, ILogger<EventDispatcher> logger)
    {
        _kafkaProducer = kafkaProducer;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent
    {
        _logger.LogInformation("Dispatching event {EventType} (ID: {EventId})", domainEvent.EventType, domainEvent.EventId);

        // 1. Publicar a Kafka (fire and forget desde la perspectiva de la aplicación)
        try
        {
            await _kafkaProducer.PublishAsync(domainEvent, cancellationToken);
            _logger.LogDebug("Event {EventType} published to Kafka", domainEvent.EventType);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish event {EventType} to Kafka (non-fatal)", domainEvent.EventType);
        }

        // 2. Ejecutar handlers locales
        try
        {
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(typeof(TEvent));
            var handlers = _serviceProvider.GetServices(handlerType);

            foreach (var handler in handlers)
            {
                if (handler is IDomainEventHandler<TEvent> typedHandler)
                {
                    try
                    {
                        await typedHandler.HandleAsync(domainEvent, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Event handler {HandlerType} failed for event {EventType}",
                            handler.GetType().Name, domainEvent.EventType);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve handlers for event {EventType} (non-fatal)", domainEvent.EventType);
        }
    }
}
