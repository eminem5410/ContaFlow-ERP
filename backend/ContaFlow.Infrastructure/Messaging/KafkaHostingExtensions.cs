using ContaFlow.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ContaFlow.Infrastructure.Messaging;

/// <summary>
/// Extensiones de registro para configurar la infraestructura de mensajería Kafka.
/// </summary>
public static class KafkaHostingExtensions
{
    /// <summary>
    /// Registra el productor, consumidor y servicio en segundo plano de Kafka.
    /// </summary>
    public static IServiceCollection AddKafkaMessaging(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IKafkaProducer, KafkaProducer>();
        services.AddSingleton<IKafkaEventConsumer, KafkaEventConsumer>();
        services.AddHostedService<KafkaBackgroundService>();
        return services;
    }
}

/// <summary>
/// Servicio en segundo plano que mantiene el consumidor de Kafka activo durante la vida de la aplicación.
/// </summary>
public class KafkaBackgroundService : BackgroundService
{
    private readonly IKafkaEventConsumer _consumer;
    private readonly ILogger<KafkaBackgroundService> _logger;

    public KafkaBackgroundService(IKafkaEventConsumer consumer, ILogger<KafkaBackgroundService> logger)
    {
        _consumer = consumer;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _consumer.StartAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(1000, stoppingToken);
        }
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        await _consumer.StopAsync(stoppingToken);
        await base.StopAsync(stoppingToken);
    }
}
