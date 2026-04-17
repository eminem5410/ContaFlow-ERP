namespace ContaFlow.Domain.Events;

/// <summary>
/// Sobre base para todos los eventos de dominio publicados a Kafka.
/// </summary>
public abstract class DomainEvent
{
    public string EventId { get; set; } = Guid.NewGuid().ToString();
    public string EventType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Version { get; set; } = "1.0";
    public string Source { get; set; } = "ContaFlow.API";
    public string? CorrelationId { get; set; }
    public string CompanyId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

public class JournalEntryCreatedEvent : DomainEvent
{
    public string EntryId { get; set; } = string.Empty;
    public int EntryNumber { get; set; }
    public string Description { get; set; } = string.Empty;
    public double TotalDebit { get; set; }
    public double TotalCredit { get; set; }
}

public class JournalEntryConfirmedEvent : DomainEvent
{
    public string EntryId { get; set; } = string.Empty;
    public int EntryNumber { get; set; }
    public List<AccountBalanceUpdate> AffectedAccounts { get; set; } = new();
}

/// <summary>
/// Representa la actualización de saldo de una cuenta contable dentro de un evento de asiento confirmado.
/// </summary>
public class AccountBalanceUpdate
{
    public string AccountId { get; set; } = string.Empty;
    public string AccountCode { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public double Debit { get; set; }
    public double Credit { get; set; }
    public double NewBalance { get; set; }
}

public class InvoiceCreatedEvent : DomainEvent
{
    public string InvoiceId { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Total { get; set; }
    public double Tax { get; set; }
    public double NetTotal { get; set; }
}

public class InvoiceStatusChangedEvent : DomainEvent
{
    public string InvoiceId { get; set; } = string.Empty;
    public string InvoiceNumber { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class PaymentCreatedEvent : DomainEvent
{
    public string PaymentId { get; set; } = string.Empty;
    public string PaymentNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string? InvoiceId { get; set; }
}

public class PaymentDeletedEvent : DomainEvent
{
    public string PaymentId { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string? InvoiceId { get; set; }
}

public class UserCreatedEvent : DomainEvent
{
    public new string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
}

public class RoleChangedEvent : DomainEvent
{
    public new string UserId { get; set; } = string.Empty;
    public string PreviousRole { get; set; } = string.Empty;
    public string NewRole { get; set; } = string.Empty;
    public string ChangedBy { get; set; } = string.Empty;
}

public class AccountBalanceChangedEvent : DomainEvent
{
    public string AccountId { get; set; } = string.Empty;
    public string AccountCode { get; set; } = string.Empty;
    public double PreviousBalance { get; set; }
    public double NewBalance { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? JournalEntryId { get; set; }
}
