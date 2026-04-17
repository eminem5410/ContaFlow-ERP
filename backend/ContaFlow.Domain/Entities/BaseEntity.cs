namespace ContaFlow.Domain.Entities;

/// <summary>
/// Entidad base con campos comunes para todas las entidades del sistema.
/// </summary>
public abstract class BaseEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
