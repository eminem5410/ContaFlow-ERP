using System.Text.Json;
using Confluent.Kafka;
using ContaFlow.Domain.Events;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Infrastructure.Messaging;

/// <summary>
/// Consumidor de eventos de Kafka que se suscribe a todos los topics del dominio.
/// Deserializa mensajes según el eventType y los despacha a través del IEventDispatcher.
/// Se deshabilita graciosamente cuando Kafka:Enabled = false.
/// </summary>
public class KafkaEventConsumer : IKafkaEventConsumer, IDisposable
{
    private readonly ILogger<KafkaEventConsumer> _logger;
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;
    private IConsumer<string, string>? _consumer;
    private readonly bool _enabled;
    private CancellationTokenSource? _cts;
    private long _eventsProcessed;
    private long _eventsFailed;

    /// <summary>
    /// Mapeo estático de topic → tipo de evento por defecto para deserialización robusta.
    /// Se usa como fallback cuando el campo eventType no está presente en el mensaje.
    /// </summary>
    private static readonly Dictionary<string, Type> TopicToDefaultType = new()
    {
        [KafkaTopics.JournalEntries] = typeof(JournalEntryCreatedEvent),
        [KafkaTopics.Invoices] = typeof(InvoiceCreatedEvent),
        [KafkaTopics.Payments] = typeof(PaymentCreatedEvent),
        [KafkaTopics.Users] = typeof(UserCreatedEvent),
        [KafkaTopics.Accounts] = typeof(AccountBalanceChangedEvent),
    };

    public KafkaEventConsumer(IConfiguration configuration, IServiceProvider serviceProvider, ILogger<KafkaEventConsumer> logger)
    {
        _configuration = configuration;
        _serviceProvider = serviceProvider;
        _logger = logger;
        _enabled = configuration.GetValue<bool>("Kafka:Enabled");
    }

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken = default)
    {
        if (!_enabled)
        {
            _logger.LogInformation("Kafka Consumer deshabilitado, no se iniciará el consumo de eventos");
            return;
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
            GroupId = _configuration["Kafka:ConsumerGroupId"] ?? "contaflow-consumer-group",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = true,
            AutoCommitIntervalMs = 5000,
            SessionTimeoutMs = 10000,
            SecurityProtocol = SecurityProtocol.Plaintext
        };

        _consumer = new ConsumerBuilder<string, string>(config).Build();
        _consumer.Subscribe(new[]
        {
            KafkaTopics.JournalEntries,
            KafkaTopics.Invoices,
            KafkaTopics.Payments,
            KafkaTopics.Users,
            KafkaTopics.Accounts
        });

        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _logger.LogInformation("Kafka Consumer iniciado, suscrito a todos los topics de ContaFlow");

        _ = Task.Run(() => ConsumeLoop(_cts.Token));
        await Task.CompletedTask;
    }

    private async Task ConsumeLoop(CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    var result = _consumer!.Consume(cancellationToken);
                    _logger.LogDebug("Evento recibido: Topic={Topic}, Partition={Partition}, Offset={Offset}, Key={Key}",
                        result.Topic, result.Partition, result.Offset.Value, result.Message.Key);

                    await ProcessEventAsync(result.Topic, result.Message.Value, cancellationToken);

                    Interlocked.Increment(ref _eventsProcessed);
                }
                catch (ConsumeException ex)
                {
                    Interlocked.Increment(ref _eventsFailed);
                    _logger.LogError(ex, "Error consumiendo mensaje de Kafka: {Reason}", ex.Error.Reason);
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation(
                "Kafka Consumer detenido correctamente. Procesados: {Processed}, Fallidos: {Failed}",
                Interlocked.Read(ref _eventsProcessed), Interlocked.Read(ref _eventsFailed));
        }
    }

    /// <summary>
    /// Deserializa el mensaje JSON, resuelve el tipo de evento y lo despacha
    /// al EventDispatcher para ejecutar los handlers registrados.
    /// </summary>
    private async Task ProcessEventAsync(string topic, string message, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dispatcher = scope.ServiceProvider.GetRequiredService<ContaFlow.Application.Events.IEventDispatcher>();

            var typeObj = ResolveEventType(topic, message);
            if (typeObj == null)
            {
                _logger.LogWarning("No se pudo resolver el tipo de evento para topic {Topic}, skipping", topic);
                return;
            }

            var domainEvent = (DomainEvent?)JsonSerializer.Deserialize(message, typeObj, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });

            if (domainEvent == null)
            {
                _logger.LogWarning("Deserialización retornó null para topic {Topic}, tipo {Type}", topic, typeObj.Name);
                return;
            }

            _logger.LogInformation(
                "[Kafka Consumer] Despachando evento {EventType} (ID: {EventId}) desde topic {Topic}",
                domainEvent.EventType, domainEvent.EventId, topic);

            await dispatcher.DispatchAsync(domainEvent, cancellationToken);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Error de deserialización en topic {Topic}: {Message}", topic, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error procesando evento de Kafka en topic {Topic}", topic);
        }
    }

    /// <summary>
    /// Resuelve el tipo CLR correcto para un evento Kafka.
    /// Primero intenta usar el campo "eventType" del JSON; si no existe,
    /// usa el mapeo estático de topic → tipo por defecto.
    /// </summary>
    private Type? ResolveEventType(string topic, string message)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(message);

            // Estrategia 1: Usar el campo eventType del mensaje
            if (jsonDoc.RootElement.TryGetProperty("eventType", out var eventTypeElement) &&
                eventTypeElement.ValueKind == JsonValueKind.String)
            {
                var eventType = eventTypeElement.GetString();
                if (!string.IsNullOrEmpty(eventType))
                {
                    // Buscar en el namespace ContaFlow.Domain.Events por nombre de clase
                    var typeByName = Type.GetType($"ContaFlow.Domain.Events.{eventType}")
                        ?? AppDomain.CurrentDomain.GetAssemblies()
                            .SelectMany(a => a.GetTypes())
                            .FirstOrDefault(t => t.Name == eventType && typeof(DomainEvent).IsAssignableFrom(t));

                    if (typeByName != null)
                        return typeByName;
                }
            }

            // Estrategia 2: Fallback al mapeo estático de topic
            if (TopicToDefaultType.TryGetValue(topic, out var defaultType))
            {
                _logger.LogDebug("Usando tipo por defecto {Type} para topic {Topic}", defaultType.Name, topic);
                return defaultType;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON inválido recibido en topic {Topic}", topic);
        }

        return null;
    }

    /// <inheritdoc />
    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        _cts?.Cancel();
        _consumer?.Close();
        _logger.LogInformation("Kafka Consumer detenido");
        await Task.CompletedTask;
    }

    public void Dispose()
    {
        _cts?.Dispose();
        _consumer?.Dispose();
    }
}
