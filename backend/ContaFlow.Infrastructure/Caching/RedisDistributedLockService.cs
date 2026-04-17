using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace ContaFlow.Infrastructure.Caching;

/// <summary>
/// Implementación de bloqueos distribuidos usando Redis con liberación condicional (comparar y eliminar).
/// </summary>
public class RedisDistributedLockService : IDistributedLockService
{
    private readonly IDatabase _database;
    private readonly ILogger<RedisDistributedLockService> _logger;
    private readonly string _instancePrefix;

    public RedisDistributedLockService(IConnectionMultiplexer redis, IConfiguration configuration, ILogger<RedisDistributedLockService> logger)
    {
        _database = redis.GetDatabase();
        _instancePrefix = configuration["Redis:InstancePrefix"] ?? "contaflow:lock:";
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IDistributedLock> AcquireLockAsync(string key, TimeSpan expiration, CancellationToken cancellationToken = default)
    {
        var fullKey = $"{_instancePrefix}{key}";
        var lockId = Guid.NewGuid().ToString();

        var acquired = await _database.StringSetAsync(
            fullKey, lockId, expiration, When.NotExists);

        if (!acquired)
        {
            _logger.LogWarning("No se pudo adquirir el lock {LockKey}", fullKey);
            return new RedisDistributedLock(fullKey, lockId, _database, false);
        }

        _logger.LogDebug("Lock adquirido: {LockKey}", fullKey);
        return new RedisDistributedLock(fullKey, lockId, _database, true);
    }

    /// <summary>
    /// Implementación concreta del lock distribuido usando transacciones condicionales de Redis.
    /// </summary>
    private class RedisDistributedLock : IDistributedLock
    {
        private readonly string _key;
        private readonly string _lockId;
        private readonly IDatabase _database;
        private bool _released;

        public RedisDistributedLock(string key, string lockId, IDatabase database, bool acquired)
        {
            _key = key;
            _lockId = lockId;
            _database = database;
            IsAcquired = acquired;
        }

        public string LockKey => _key;
        public bool IsAcquired { get; }

        /// <summary>
        /// Libera el lock solo si el valor en Redis coincide con el lockId (compare-and-delete).
        /// </summary>
        public async Task ReleaseAsync()
        {
            if (!_released && IsAcquired)
            {
                var transaction = _database.CreateTransaction();
                transaction.AddCondition(Condition.StringEqual(_key, _lockId));
                _ = transaction.KeyDeleteAsync(_key);
                await transaction.ExecuteAsync();
                _released = true;
            }
        }

        public void Dispose() => ReleaseAsync().GetAwaiter().GetResult();
        public async ValueTask DisposeAsync() => await ReleaseAsync();
    }
}
