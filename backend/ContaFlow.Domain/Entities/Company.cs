namespace ContaFlow.Domain.Entities;

/// <summary>
/// Entidad que representa la empresa/organización (tenant multi-compañía).
/// </summary>
public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Cuit { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? Logo { get; set; }
    public string Plan { get; set; } = "basico";

    // Propiedades de navegación
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    public ICollection<Client> Clients { get; set; } = new List<Client>();
    public ICollection<Provider> Providers { get; set; } = new List<Provider>();
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<BankAccount> BankAccounts { get; set; } = new List<BankAccount>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
