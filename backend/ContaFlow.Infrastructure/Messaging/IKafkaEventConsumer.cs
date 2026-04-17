namespace ContaFlow.Infrastructure.Messaging;

/// <summary>
/// Interfaz para el consumidor de eventos de Kafka que se ejecuta como servicio en segundo plano.
/// </summary>
public interface IKafkaEventConsumer
{
    /// <summary>
    /// Inicia el consumo de mensajes de todos los topics suscritos.
    /// </summary>
    Task StartAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Detiene el consumo de mensajes y libera recursos.
    /// </summary>
    Task StopAsync(CancellationToken cancellationToken = default);
}
