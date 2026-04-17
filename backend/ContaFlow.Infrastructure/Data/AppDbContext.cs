using Microsoft.EntityFrameworkCore;
using ContaFlow.Domain.Entities;

namespace ContaFlow.Infrastructure.Data;

/// <summary>
/// Contexto principal de base de datos para ContaFlow ERP.
/// Utiliza PostgreSQL como motor de base de datos.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // DbSets para todas las entidades del dominio
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Provider> Providers => Set<Provider>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // NOTE: Separate IEntityTypeConfiguration<T> classes exist in the Configurations/ folder
        // (Company, User, Account, JournalEntry, Invoice, Payment, AuditLog) but are superseded
        // by the inline configuration below, which is more complete and centralized.
        // ApplyConfigurationsFromAssembly is intentionally NOT called to avoid confusion
        // about which configuration takes precedence.

        ApplyGlobalConfigurations(modelBuilder);
    }

    /// <summary>
    /// Configuraciones globales aplicadas a todas las entidades.
    /// </summary>
    private static void ApplyGlobalConfigurations(ModelBuilder modelBuilder)
    {
        // Company - Configuración de la tabla
        modelBuilder.Entity<Company>(entity =>
        {
            entity.ToTable("companies");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Cuit).HasMaxLength(20);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.Phone).HasMaxLength(50);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Logo).HasMaxLength(500);
            entity.Property(e => e.Plan).HasMaxLength(50).HasDefaultValue("basico");
            entity.HasIndex(e => e.Cuit).IsUnique().HasFilter("\"cuit\" IS NOT NULL");
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Password).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Role).HasMaxLength(50).HasDefaultValue("user");
            entity.Property(e => e.RoleId).HasMaxLength(50);
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.RefreshToken).HasMaxLength(500);
            entity.Property(e => e.RefreshTokenExpiry);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Users)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.UserRole)
                .WithMany(r => r.Users)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Account - Plan de cuentas con jerarquía
        modelBuilder.Entity<Account>(entity =>
        {
            entity.ToTable("accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Subtype).HasMaxLength(50);
            entity.Property(e => e.ParentId).HasMaxLength(50);
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            // Índice único compuesto: código único por empresa
            entity.HasIndex(e => new { e.CompanyId, e.Code }).IsUnique();

            // Relación jerárquica auto-referencial
            entity.HasOne(e => e.Parent)
                .WithMany(p => p.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Account_Parent");

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Accounts)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // JournalEntry - Asientos contables
        modelBuilder.Entity<JournalEntry>(entity =>
        {
            entity.ToTable("journal_entries");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Concept).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("borrador");
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            // Índice por número y empresa
            entity.HasIndex(e => new { e.CompanyId, e.Number }).IsUnique();

            entity.HasOne(e => e.Company)
                .WithMany(c => c.JournalEntries)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Lines)
                .WithOne(l => l.JournalEntry)
                .HasForeignKey(l => l.JournalEntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // JournalEntryLine - Líneas de asiento
        modelBuilder.Entity<JournalEntryLine>(entity =>
        {
            entity.ToTable("journal_entry_lines");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.JournalEntryId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.AccountId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.JournalEntry)
                .WithMany(j => j.Lines)
                .HasForeignKey(e => e.JournalEntryId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Account)
                .WithMany(a => a.JournalLines)
                .HasForeignKey(e => e.AccountId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Client
        modelBuilder.Entity<Client>(entity =>
        {
            entity.ToTable("clients");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Cuit).HasMaxLength(20);
            entity.HasIndex(e => e.Cuit).IsUnique().HasFilter("\"cuit\" IS NOT NULL");
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Clients)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Provider
        modelBuilder.Entity<Provider>(entity =>
        {
            entity.ToTable("providers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Cuit).HasMaxLength(20);
            entity.HasIndex(e => e.Cuit).IsUnique().HasFilter("\"cuit\" IS NOT NULL");
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Providers)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Invoice
        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("invoices");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Number).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("pendiente");
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ClientId).HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Invoices)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Client)
                .WithMany(c => c.Invoices)
                .HasForeignKey(e => e.ClientId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // InvoiceItem
        modelBuilder.Entity<InvoiceItem>(entity =>
        {
            entity.ToTable("invoice_items");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(500);
            entity.Property(e => e.InvoiceId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Items)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Payment
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Number).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Method).HasMaxLength(50).HasDefaultValue("transferencia");
            entity.Property(e => e.Type).HasMaxLength(20).HasDefaultValue("cobro");
            entity.Property(e => e.Reference).HasMaxLength(100);
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.InvoiceId).HasMaxLength(50);
            entity.Property(e => e.ClientId).HasMaxLength(50);
            entity.Property(e => e.ProviderId).HasMaxLength(50);
            entity.Property(e => e.BankAccountId).HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.Payments)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Invoice)
                .WithMany(i => i.Payments)
                .HasForeignKey(e => e.InvoiceId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Client)
                .WithMany(c => c.Payments)
                .HasForeignKey(e => e.ClientId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Provider)
                .WithMany(p => p.Payments)
                .HasForeignKey(e => e.ProviderId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.BankAccount)
                .WithMany(b => b.Payments)
                .HasForeignKey(e => e.BankAccountId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // BankAccount
        modelBuilder.Entity<BankAccount>(entity =>
        {
            entity.ToTable("bank_accounts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Bank).HasMaxLength(100);
            entity.Property(e => e.Number).HasMaxLength(50);
            entity.Property(e => e.Type).HasMaxLength(50).HasDefaultValue("cta_corriente");
            entity.Property(e => e.Currency).HasMaxLength(10).HasDefaultValue("ARS");
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Company)
                .WithMany(c => c.BankAccounts)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AuditLog con índices para consultas frecuentes
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("audit_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.UserId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.UserName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Entity).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);

            // Índices para auditoría (consultas frecuentes por empresa, entidad y fecha)
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => e.Entity);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.CompanyId, e.Entity, e.CreatedAt });

            entity.HasOne(e => e.Company)
                .WithMany(c => c.AuditLogs)
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CompanyId).IsRequired().HasMaxLength(50);
        });

        // Permission
        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("permissions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
        });

        // RolePermission - Tabla intermedia
        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("role_permissions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(50);
            entity.Property(e => e.RoleId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PermissionId).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(e => e.PermissionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Un permiso solo puede asignarse una vez por rol
            entity.HasIndex(e => new { e.RoleId, e.PermissionId }).IsUnique();
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Actualizar automáticamente UpdatedAt antes de guardar
        var entries = ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.State == EntityState.Modified);

        foreach (var entry in entries)
        {
            entry.Property(nameof(BaseEntity.UpdatedAt)).CurrentValue = DateTime.UtcNow;
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
