namespace ContaFlow.Application.Interfaces;

/// <summary>
/// Servicio de envío de notificaciones por email.
/// </summary>
public interface IEmailService
{
    /// <summary>Envía un email genérico.</summary>
    Task<bool> SendAsync(string to, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default);

    /// <summary>Notifica al cliente que se creó una nueva factura.</summary>
    Task<bool> SendInvoiceCreatedAsync(string to, string clientName, string invoiceNumber, double total, string type, CancellationToken cancellationToken = default);

    /// <summary>Notifica al cliente cuando cambia el estado de una factura.</summary>
    Task<bool> SendInvoiceStatusChangedAsync(string to, string clientName, string invoiceNumber, double total, string previousStatus, string newStatus, CancellationToken cancellationToken = default);

    /// <summary>Notifica al cliente que su factura fue pagada.</summary>
    Task<bool> SendInvoicePaidAsync(string to, string clientName, string invoiceNumber, double amount, CancellationToken cancellationToken = default);

    /// <summary>Notifica al cliente que se recibió un pago.</summary>
    Task<bool> SendPaymentReceivedAsync(string to, string clientName, string invoiceNumber, double amount, CancellationToken cancellationToken = default);

    /// <summary>Envía email de bienvenida al usuario registrado.</summary>
    Task<bool> SendWelcomeEmailAsync(string to, string userName, string companyName, CancellationToken cancellationToken = default);
}
