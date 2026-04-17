namespace ContaFlow.Infrastructure.Caching;

/// <summary>
/// Interfaz para el servicio de bloqueos distribuidos basado en Redis.
/// </summary>
public interface IDistributedLockService
{
    /// <summary>
    /// Intenta adquirir un lock distribuido con la clave y expiración indicadas.
    /// </summary>
    Task<IDistributedLock> AcquireLockAsync(string key, TimeSpan expiration, CancellationToken cancellationToken = default);
}

/// <summary>
/// Representa un lock distribuido adquirido. Debe liberarse al finalizar su uso.
/// </summary>
public interface IDistributedLock : IDisposable, IAsyncDisposable
{
    string LockKey { get; }
    bool IsAcquired { get; }
    Task ReleaseAsync();
}
