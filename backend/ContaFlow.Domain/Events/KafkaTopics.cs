namespace ContaFlow.Domain.Events;

/// <summary>
/// Constantes de topics de Kafka utilizados por ContaFlow ERP.
/// </summary>
public static class KafkaTopics
{
    public const string JournalEntries = "contaflow.journal-entries";
    public const string Invoices = "contaflow.invoices";
    public const string Payments = "contaflow.payments";
    public const string Users = "contaflow.users";
    public const string Accounts = "contaflow.accounts";
    public const string Audit = "contaflow.audit";

    /// <summary>
    /// Determina el topic correspondiente según el tipo de evento.
    /// </summary>
    public static string GetTopicForEvent(string eventType) => eventType switch
    {
        var e when e.StartsWith("journal-entry") => JournalEntries,
        var e when e.StartsWith("invoice") => Invoices,
        var e when e.StartsWith("payment") => Payments,
        var e when e.StartsWith("user") || e.StartsWith("role") => Users,
        var e when e.StartsWith("account") => Accounts,
        _ => Audit
    };
}
