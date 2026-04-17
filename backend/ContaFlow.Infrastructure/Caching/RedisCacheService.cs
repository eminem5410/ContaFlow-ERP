using System.Text.Json;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace ContaFlow.Infrastructure.Caching;

/// <summary>
/// Implementación del servicio de caché usando Redis con serialización JSON.
/// Se deshabilita graciosamente cuando Redis:Enabled = false.
/// </summary>
public class RedisCacheService : ICacheService
{
    private readonly IDatabase _database;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly bool _enabled;
    private readonly string _instancePrefix;

    public RedisCacheService(IConnectionMultiplexer redis, IConfiguration configuration, ILogger<RedisCacheService> logger)
    {
        _logger = logger;
        _enabled = configuration.GetValue<bool>("Redis:Enabled");
        _instancePrefix = configuration["Redis:InstancePrefix"] ?? "contaflow:";
        _database = redis.GetDatabase();

        if (_enabled)
        {
            _logger.LogInformation("Redis Cache Service inicializado");
        }
        else
        {
            _logger.LogWarning("Redis Cache Service deshabilitado (Redis:Enabled = false)");
        }
    }

    /// <inheritdoc />
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return default;

        try
        {
            var fullKey = $"{_instancePrefix}{key}";
            var value = await _database.StringGetAsync(fullKey);

            if (value.IsNullOrEmpty)
                return default;

            return JsonSerializer.Deserialize<T>(value!);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error obteniendo clave {Key} de Redis", key);
            return default;
        }
    }

    /// <inheritdoc />
    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return;

        try
        {
            var fullKey = $"{_instancePrefix}{key}";
            var json = JsonSerializer.Serialize(value);
            await _database.StringSetAsync(fullKey, json, expiration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error guardando clave {Key} en Redis", key);
        }
    }

    /// <inheritdoc />
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return;

        try
        {
            var fullKey = $"{_instancePrefix}{key}";
            await _database.KeyDeleteAsync(fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error eliminando clave {Key} de Redis", key);
        }
    }

    /// <inheritdoc />
    public async Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return;

        try
        {
            var fullPrefix = $"{_instancePrefix}{prefix}";
            var server = _database.Multiplexer.GetServer(_database.Multiplexer.GetEndPoints().First());
            var keys = server.Keys(pattern: $"{fullPrefix}*").ToArray();
            if (keys.Length > 0)
            {
                await _database.KeyDeleteAsync(keys);
                _logger.LogDebug("Eliminadas {Count} claves con prefijo {Prefix}", keys.Length, prefix);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error eliminando claves con prefijo {Prefix} de Redis", prefix);
        }
    }

    /// <inheritdoc />
    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        if (!_enabled) return false;

        try
        {
            var fullKey = $"{_instancePrefix}{key}";
            return await _database.KeyExistsAsync(fullKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verificando clave {Key} en Redis", key);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        var cached = await GetAsync<T>(key, cancellationToken);
        if (cached != null)
            return cached;

        var value = await factory();
        await SetAsync(key, value, expiration, cancellationToken);
        return value;
    }
}
