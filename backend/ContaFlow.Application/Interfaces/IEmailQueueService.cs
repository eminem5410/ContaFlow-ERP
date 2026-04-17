using ContaFlow.Application.Models;

namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Cola de fondo para envío asincrónico de emails.
/// Los handlers de dominio encolan emails (fire-and-forget) y un BackgroundService
/// los procesa sin bloquear la respuesta HTTP.
/// </summary>
public interface IEmailQueueService
{
    /// <summary>Encola un email genérico para envío asincrónico.</summary>
    ValueTask QueueAsync(string to, string subject, string body, bool isHtml = true);

    /// <summary>Encola notificación de factura creada.</summary>
    ValueTask QueueInvoiceCreatedAsync(string to, string clientName, string invoiceNumber, double total, string type);

    /// <summary>Encola notificación de factura pagada.</summary>
    ValueTask QueueInvoicePaidAsync(string to, string clientName, string invoiceNumber, double amount);

    /// <summary>Encola notificación de cambio de estado de factura.</summary>
    ValueTask QueueInvoiceStatusChangedAsync(string to, string clientName, string invoiceNumber, double total, string previousStatus, string newStatus);

    /// <summary>Encola notificación de pago recibido.</summary>
    ValueTask QueuePaymentReceivedAsync(string to, string clientName, string invoiceNumber, double amount);

    /// <summary>Encola email de bienvenida.</summary>
    ValueTask QueueWelcomeEmailAsync(string to, string userName, string companyName);

    /// <summary>Cantidad de emails en cola pendientes de envío.</summary>
    int PendingCount { get; }
}

/// <summary>
/// Representa un trabajo de email encolado para procesamiento en background.
/// </summary>
public sealed class EmailJob
{
    public string To { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public bool IsHtml { get; init; } = true;
    public string JobType { get; init; } = "generic";
    public DateTime QueuedAt { get; init; } = DateTime.UtcNow;
}
