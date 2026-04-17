using ContaFlow.Domain.Interfaces;
using ContaFlow.Infrastructure.Caching;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace ContaFlow.Infrastructure.Caching;

/// <summary>
/// Extensiones de registro para configurar la infraestructura de caché Redis.
/// Registra implementaciones reales cuando Redis está habilitado, o no-op en caso contrario.
/// </summary>
public static class RedisHostingExtensions
{
    /// <summary>
    /// Registra el servicio de caché y bloqueos distribuidos con Redis.
    /// Cuando Redis:Enabled = false, registra implementaciones no-operativas.
    /// </summary>
    public static IServiceCollection AddRedisCaching(this IServiceCollection services, IConfiguration configuration)
    {
        var enabled = configuration.GetValue<bool>("Redis:Enabled");

        if (enabled)
        {
            var connectionString = configuration.GetConnectionString("Redis")
                ?? configuration["Redis:ConnectionString"]
                ?? "localhost:6379";

            services.AddSingleton<IConnectionMultiplexer>(sp =>
            {
                return ConnectionMultiplexer.Connect(connectionString);
            });

            services.AddSingleton<Infrastructure.Caching.ICacheService, RedisCacheService>();
            services.AddSingleton<Domain.Interfaces.ICacheService, RedisCacheService>();
            services.AddSingleton<IDistributedLockService, RedisDistributedLockService>();
        }
        else
        {
            // Registrar implementaciones no-operativas cuando Redis está deshabilitado
            services.AddSingleton<Infrastructure.Caching.ICacheService, NoOpCacheService>();
            services.AddSingleton<Domain.Interfaces.ICacheService, NoOpCacheService>();
            services.AddSingleton<IDistributedLockService, NoOpLockService>();
        }

        return services;
    }
}

/// <summary>
/// Implementación no-operativa del servicio de caché para cuando Redis está deshabilitado.
/// </summary>
internal class NoOpCacheService : ICacheService
{
    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) => Task.FromResult<T?>(default);
    public Task SetAsync<T>(string key, T value, TimeSpan? exp = null, CancellationToken ct = default) => Task.CompletedTask;
    public Task RemoveAsync(string key, CancellationToken ct = default) => Task.CompletedTask;
    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default) => Task.CompletedTask;
    public Task<bool> ExistsAsync(string key, CancellationToken ct = default) => Task.FromResult(false);
    public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? exp = null, CancellationToken ct = default) => await factory();
}

/// <summary>
/// Implementación no-operativa del servicio de bloqueos distribuidos para cuando Redis está deshabilitado.
/// </summary>
internal class NoOpLockService : IDistributedLockService
{
    public Task<IDistributedLock> AcquireLockAsync(string key, TimeSpan exp, CancellationToken ct = default)
        => Task.FromResult<IDistributedLock>(new NoOpLock());

    private class NoOpLock : IDistributedLock
    {
        public string LockKey => "";
        public bool IsAcquired => true;
        public Task ReleaseAsync() => Task.CompletedTask;
        public void Dispose() { }
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
