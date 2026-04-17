using System.Text.Json;
using Confluent.Kafka;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Infrastructure.Messaging;

/// <summary>
/// Productor de Kafka para publicar eventos de dominio con serialización JSON y tolerancia a fallos.
/// Se deshabilita graciosamente cuando Kafka:Enabled = false.
/// </summary>
public class KafkaProducer : IKafkaProducer, IDisposable
{
    private IProducer<Null, string>? _producer;
    private readonly ILogger<KafkaProducer> _logger;
    private readonly bool _enabled;

    public KafkaProducer(IConfiguration configuration, ILogger<KafkaProducer> logger)
    {
        _logger = logger;
        _enabled = configuration.GetValue<bool>("Kafka:Enabled");

        if (_enabled)
        {
            var config = new ProducerConfig
            {
                BootstrapServers = configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
                AllowAutoCreateTopics = true,
                ClientId = configuration["Kafka:ClientId"] ?? "contaflow-producer",
                Acks = Acks.All,
                MessageTimeoutMs = 5000,
                RetryBackoffMs = 100,
                EnableIdempotence = true,
                SecurityProtocol = SecurityProtocol.Plaintext
            };

            _producer = new ProducerBuilder<Null, string>(config).Build();
            _logger.LogInformation("Kafka Producer inicializado en {BootstrapServers}", config.BootstrapServers);
        }
        else
        {
            _logger.LogWarning("Kafka Producer deshabilitado (Kafka:Enabled = false)");
        }
    }

    /// <inheritdoc />
    public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default)
        where TEvent : DomainEvent
    {
        var topic = KafkaTopics.GetTopicForEvent(domainEvent.EventType);
        var json = JsonSerializer.Serialize(domainEvent, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
        await PublishAsync(topic, json, cancellationToken);
    }

    /// <inheritdoc />
    public async Task PublishAsync(string topic, string message, CancellationToken cancellationToken = default)
    {
        if (!_enabled)
        {
            _logger.LogDebug("[Kafka DISABLED] Would publish to {Topic}: {Message}", topic, message);
            return;
        }

        try
        {
            var result = await _producer.ProduceAsync(topic, new Message<Null, string> { Value = message }, cancellationToken);
            _logger.LogDebug("Mensaje publicado a {Topic} [Partition {Partition}] @ Offset {Offset}",
                result.Topic, result.Partition, result.Offset.Value);
        }
        catch (ProduceException<Null, string> ex)
        {
            _logger.LogError(ex, "Error publicando mensaje a Kafka topic {Topic}: {Reason}", topic, ex.Error.Reason);
            throw;
        }
    }

    public void Dispose()
    {
        _producer?.Dispose();
    }
}
