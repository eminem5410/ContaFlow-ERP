using ContaFlow.Domain.Events;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Interfaz para publicar eventos de dominio en Kafka.
/// Definida en Application para respetar Clean Architecture
/// (la implementacion vive en Infrastructure).
/// </summary>
public interface IKafkaProducer
{
    /// <summary>
    /// Publica un evento de dominio tipado al topic correspondiente segun su EventType.
    /// </summary>
    Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent;

    /// <summary>
    /// Publica un mensaje serializado (JSON) a un topic especifico.
    /// </summary>
    Task PublishAsync(string topic, string message, CancellationToken cancellationToken = default);
}
