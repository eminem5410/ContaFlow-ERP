using ContaFlow.Domain.Entities;

namespace ContaFlow.Domain.Interfaces;

/// <summary>
/// Unidad de trabajo para manejar transacciones y coordinar múltiples repositorios.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    // Repositorios principales
    IRepository<Company> Companies { get; }
    IRepository<User> Users { get; }
    IRepository<Account> Accounts { get; }
    IRepository<JournalEntry> JournalEntries { get; }
    IRepository<Client> Clients { get; }
    IRepository<Provider> Providers { get; }
    IRepository<Invoice> Invoices { get; }
    IRepository<Payment> Payments { get; }
    IRepository<BankAccount> BankAccounts { get; }
    IRepository<AuditLog> AuditLogs { get; }
    IRepository<Role> Roles { get; }
    IRepository<Permission> Permissions { get; }
    IRepository<RolePermission> RolePermissions { get; }

    /// <summary>
    /// Guarda todos los cambios de forma atómica.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Inicia una transacción explícita.
    /// </summary>
    Task<IDisposable> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
