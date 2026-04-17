namespace ContaFlow.Domain.Interfaces;

/// <summary>
/// Interfaz para el servicio de caché distribuido.
/// Definida en Domain para que tanto Application como Infrastructure puedan referenciarla.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Obtiene un valor del caché. Retorna default si no existe o hay error.
    /// </summary>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Guarda un valor en el caché con expiración opcional.
    /// </summary>
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina una clave del caché.
    /// </summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Elimina todas las claves que comiencen con el prefijo dado.
    /// </summary>
    Task RemoveByPrefixAsync(string prefix, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifica si una clave existe en el caché.
    /// </summary>
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Obtiene del caché o crea y almacena usando la fábrica proporcionada.
    /// </summary>
    Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null, CancellationToken cancellationToken = default);
}
