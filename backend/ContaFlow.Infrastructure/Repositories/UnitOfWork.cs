using Microsoft.EntityFrameworkCore;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Interfaces;
using ContaFlow.Infrastructure.Data;

namespace ContaFlow.Infrastructure.Repositories;

/// <summary>
/// Implementación de la Unidad de Trabajo que coordina todos los repositorios.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    // Repositorios懒加载 (lazy initialization)
    private IRepository<Company>? _companies;
    private IRepository<User>? _users;
    private IRepository<Account>? _accounts;
    private IRepository<JournalEntry>? _journalEntries;
    private IRepository<Client>? _clients;
    private IRepository<Provider>? _providers;
    private IRepository<Invoice>? _invoices;
    private IRepository<Payment>? _payments;
    private IRepository<BankAccount>? _bankAccounts;
    private IRepository<AuditLog>? _auditLogs;
    private IRepository<Role>? _roles;
    private IRepository<Permission>? _permissions;
    private IRepository<RolePermission>? _rolePermissions;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IRepository<Company> Companies => _companies ??= new Repository<Company>(_context);
    public IRepository<User> Users => _users ??= new Repository<User>(_context);
    public IRepository<Account> Accounts => _accounts ??= new Repository<Account>(_context);
    public IRepository<JournalEntry> JournalEntries => _journalEntries ??= new Repository<JournalEntry>(_context);
    public IRepository<Client> Clients => _clients ??= new Repository<Client>(_context);
    public IRepository<Provider> Providers => _providers ??= new Repository<Provider>(_context);
    public IRepository<Invoice> Invoices => _invoices ??= new Repository<Invoice>(_context);
    public IRepository<Payment> Payments => _payments ??= new Repository<Payment>(_context);
    public IRepository<BankAccount> BankAccounts => _bankAccounts ??= new Repository<BankAccount>(_context);
    public IRepository<AuditLog> AuditLogs => _auditLogs ??= new Repository<AuditLog>(_context);
    public IRepository<Role> Roles => _roles ??= new Repository<Role>(_context);
    public IRepository<Permission> Permissions => _permissions ??= new Repository<Permission>(_context);
    public IRepository<RolePermission> RolePermissions => _rolePermissions ??= new Repository<RolePermission>(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IDisposable> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        return new TransactionScope(transaction);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    /// <summary>
    /// Wrapper para manejar la transacción como IDisposable.
    /// </summary>
    private class TransactionScope : IDisposable
    {
        private readonly Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction _transaction;
        private bool _disposed;

        public TransactionScope(Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction)
        {
            _transaction = transaction;
        }

        public async Task CommitAsync()
        {
            if (!_disposed)
            {
                await _transaction.CommitAsync();
            }
        }

        public async Task RollbackAsync()
        {
            if (!_disposed)
            {
                await _transaction.RollbackAsync();
            }
        }

        public void Dispose()
        {
            if (!_disposed)
            {
                _transaction.Dispose();
                _disposed = true;
            }
        }
    }
}
