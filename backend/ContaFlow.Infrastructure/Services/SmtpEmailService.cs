using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ContaFlow.Application.Interfaces;
using ContaFlow.Application.Models;

namespace ContaFlow.Infrastructure.Services;

/// <summary>
/// Implementación del servicio de email mediante SMTP (System.Net.Mail).
/// Si el servicio está deshabilitado, registra en el log lo que se enviaría sin lanzar excepciones.
/// Nunca propaga errores: los fallos se capturan, registran y devuelven false.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<bool> SendAsync(string to, string subject, string body, bool isHtml = true, CancellationToken cancellationToken = default)
    {
        try
        {
            // Modo deshabilitado: registrar lo que se enviaría (degradación elegante)
            if (!_settings.Enabled)
            {
                _logger.LogInformation(
                    "[EMAIL DESHABILITADO] Se enviaría email a: {To} | Asunto: {Subject} | HTML: {IsHtml}",
                    to, subject, isHtml);
                _logger.LogDebug(
                    "[EMAIL DESHABILITADO] Cuerpo del mensaje:\n{Body}",
                    body);
                return true;
            }

            // Validar destinatario
            if (string.IsNullOrWhiteSpace(to))
            {
                _logger.LogWarning("No se especificó destinatario para el email con asunto: {Subject}", subject);
                return false;
            }

            using var message = new MailMessage();
            message.From = new MailAddress(_settings.FromEmail, _settings.FromName);
            message.To.Add(to);
            message.Subject = subject;
            message.Body = body;
            message.IsBodyHtml = isHtml;
            message.Priority = MailPriority.Normal;

            using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort);
            client.EnableSsl = _settings.UseSsl;
            client.Credentials = new NetworkCredential(_settings.SmtpUser, _settings.SmtpPassword);
            client.Timeout = 30000; // 30 segundos de timeout

            await client.SendMailAsync(message, cancellationToken);

            _logger.LogInformation("Email enviado exitosamente a {To} con asunto: {Subject}", to, subject);
            return true;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Envío de email cancelado para {To} con asunto: {Subject}", to, subject);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al enviar email a {To} con asunto: {Subject}", to, subject);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<bool> SendInvoiceStatusChangedAsync(string to, string clientName, string invoiceNumber, double total, string previousStatus, string newStatus, CancellationToken cancellationToken = default)
    {
        var subject = $"ContaFlow — Factura {invoiceNumber}: {previousStatus.ToUpper()} → {newStatus.ToUpper()}";
        var body = BuildInvoiceStatusChangedHtml(clientName, invoiceNumber, total, previousStatus, newStatus);
        return await SendAsync(to, subject, body, true, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SendInvoiceCreatedAsync(string to, string clientName, string invoiceNumber, double total, string type, CancellationToken cancellationToken = default)
    {
        var subject = $"ContaFlow — Nueva factura {invoiceNumber}";
        var body = BuildInvoiceCreatedHtml(clientName, invoiceNumber, total, type);
        return await SendAsync(to, subject, body, true, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SendInvoicePaidAsync(string to, string clientName, string invoiceNumber, double amount, CancellationToken cancellationToken = default)
    {
        var subject = $"ContaFlow — Factura {invoiceNumber} pagada";
        var body = BuildInvoicePaidHtml(clientName, invoiceNumber, amount);
        return await SendAsync(to, subject, body, true, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SendPaymentReceivedAsync(string to, string clientName, string invoiceNumber, double amount, CancellationToken cancellationToken = default)
    {
        var subject = $"ContaFlow — Pago recibido de {clientName}";
        var body = BuildPaymentReceivedHtml(clientName, invoiceNumber, amount);
        return await SendAsync(to, subject, body, true, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> SendWelcomeEmailAsync(string to, string userName, string companyName, CancellationToken cancellationToken = default)
    {
        var subject = $"Bienvenido a ContaFlow, {userName}";
        var body = BuildWelcomeHtml(userName, companyName);
        return await SendAsync(to, subject, body, true, cancellationToken);
    }

    #region Plantillas HTML

    /// <summary>
    /// Plantilla HTML para notificación de nueva factura creada.
    /// </summary>
    private static string BuildInvoiceCreatedHtml(string clientName, string invoiceNumber, double total, string type)
    {
        var content = $"""
            <h2>Nueva Factura Emitida</h2>
            <p>Estimado/a <strong>{clientName}</strong>,</p>
            <p>Se ha emitido una nueva factura a su nombre:</p>

            <table class="details-table">
                <tr><td>Factura</td><td><strong>{invoiceNumber}</strong></td></tr>
                <tr><td>Tipo</td><td>{type.ToUpper()}</td></tr>
                <tr><td>Monto Total</td><td><strong>${total:N2}</strong></td></tr>
                <tr><td>Fecha</td><td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
            </table>

            <p>Para ver el detalle completo, acceda a ContaFlow.</p>
            """;

        return BuildBaseTemplate($"Factura {invoiceNumber}", content);
    }

    /// <summary>
    /// Plantilla HTML para notificación de factura pagada.
    /// </summary>
    private static string BuildInvoicePaidHtml(string clientName, string invoiceNumber, double amount)
    {
        var content = $"""
            <h2>Factura Pagada</h2>
            <p>Estimado/a <strong>{clientName}</strong>,</p>
            <p>Le confirmamos que la factura ha sido cancelada en su totalidad:</p>

            <div class="highlight-box">
                <div class="label">Monto cancelado</div>
                <div class="value">${amount:N2}</div>
            </div>

            <table class="details-table">
                <tr><td>Factura</td><td><strong>{invoiceNumber}</strong></td></tr>
                <tr><td>Fecha</td><td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td></tr>
            </table>

            <p>Gracias por su pago.</p>
            """;

        return BuildBaseTemplate($"Factura {invoiceNumber} pagada", content);
    }

    /// <summary>
    /// Genera la plantilla HTML base con branding de ContaFlow.
    /// </summary>
    private static string BuildBaseTemplate(string title, string contentHtml)
    {
        var template = """
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{title}</title>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; color: #333; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; }
                    .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 32px 40px; text-align: center; }
                    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
                    .header .subtitle { margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px; }
                    .body { padding: 40px; line-height: 1.6; font-size: 15px; }
                    .body h2 { margin-top: 0; color: #1a73e8; font-size: 20px; }
                    .body p { margin: 0 0 16px; }
                    .highlight-box { background-color: #e8f0fe; border-left: 4px solid #1a73e8; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
                    .highlight-box .label { font-size: 12px; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                    .highlight-box .value { font-size: 22px; color: #1a73e8; font-weight: 700; margin-top: 4px; }
                    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .details-table td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
                    .details-table td:first-child { color: #5f6368; font-weight: 600; width: 40%; }
                    .details-table td:last-child { color: #333; }
                    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
                    .status-pagada { background-color: #e6f4ea; color: #137333; }
                    .status-pendiente { background-color: #fef7e0; color: #b06000; }
                    .status-default { background-color: #e8eaed; color: #3c4043; }
                    .footer { padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #80868b; }
                    .footer a { color: #1a73e8; text-decoration: none; }
                    .btn { display: inline-block; padding: 12px 28px; background-color: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>ContaFlow ERP</h1>
                        <div class="subtitle">Gestion Contable Inteligente</div>
                    </div>
                    <div class="body">
                        {contentHtml}
                    </div>
                    <div class="footer">
                        <p>Este email fue enviado automaticamente por <strong>ContaFlow ERP</strong>.</p>
                        <p>Si no esperabas este mensaje, puedes ignorarlo con seguridad.</p>
                        <p>&copy; {year} ContaFlow</p>
                    </div>
                </div>
            </body>
            </html>
            """;

        return template
            .Replace("{title}", title)
            .Replace("{contentHtml}", contentHtml)
            .Replace("{year}", DateTime.UtcNow.Year.ToString());
    }

    /// <summary>
    /// Plantilla HTML para notificación de cambio de estado de factura.
    /// </summary>
    private static string BuildInvoiceStatusChangedHtml(string clientName, string invoiceNumber, double total, string previousStatus, string newStatus)
    {
        var newStatusClass = newStatus.ToLower() switch
        {
            "pagada" => "status-pagada",
            "pendiente" => "status-pendiente",
            "parcial" => "status-pendiente",
            "anulada" => "status-default",
            _ => "status-default"
        };

        var content = $"""
            <h2>Actualización de Factura</h2>
            <p>Estimado/a <strong>{clientName}</strong>,</p>
            <p>Le informamos que el estado de su factura ha sido actualizado:</p>

            <table class="details-table">
                <tr>
                    <td>Factura</td>
                    <td><strong>{invoiceNumber}</strong></td>
                </tr>
                <tr>
                    <td>Monto Total</td>
                    <td><strong>${total:N2}</strong></td>
                </tr>
                <tr>
                    <td>Estado Anterior</td>
                    <td>{previousStatus.ToUpper()}</td>
                </tr>
                <tr>
                    <td>Nuevo Estado</td>
                    <td><span class="status-badge {newStatusClass}">{newStatus.ToUpper()}</span></td>
                </tr>
                <tr>
                    <td>Fecha</td>
                    <td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td>
                </tr>
            </table>

            <p>Si tiene alguna consulta sobre esta factura, no dude en contactarnos.</p>
            """;

        return BuildBaseTemplate($"Factura {invoiceNumber}", content);
    }

    /// <summary>
    /// Plantilla HTML para notificación de pago recibido.
    /// </summary>
    private static string BuildPaymentReceivedHtml(string clientName, string invoiceNumber, double amount)
    {
        var content = $"""
            <h2>✅ Pago Recibido</h2>
            <p>Estimado/a <strong>{clientName}</strong>,</p>
            <p>Hemos recibido su pago correctamente. A continuación, el detalle de la operación:</p>

            <div class="highlight-box">
                <div class="label">Monto del pago</div>
                <div class="value">${amount:N2}</div>
            </div>

            <table class="details-table">
                <tr>
                    <td>Factura</td>
                    <td><strong>{invoiceNumber}</strong></td>
                </tr>
                <tr>
                    <td>Fecha del pago</td>
                    <td>{DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC</td>
                </tr>
            </table>

            <p>Gracias por su pago puntual. Adjuntamos el comprobante para su registro.</p>
            <p>Si tiene alguna consulta, no dude en contactarnos.</p>
            """;

        return BuildBaseTemplate("Pago recibido", content);
    }

    /// <summary>
    /// Plantilla HTML para email de bienvenida.
    /// </summary>
    private static string BuildWelcomeHtml(string userName, string companyName)
    {
        var content = $"""
            <h2>🎉 ¡Bienvenido a ContaFlow!</h2>
            <p>Hola <strong>{userName}</strong>,</p>
            <p>Su cuenta ha sido creada exitosamente para la empresa <strong>{companyName}</strong>.</p>

            <div class="highlight-box">
                <div class="label">Empresa registrada</div>
                <div class="value">{companyName}</div>
            </div>

            <p>Con ContaFlow podrá:</p>
            <ul style="margin: 12px 0 24px 20px; line-height: 2;">
                <li>📤 Emitir facturas electrónicas (A, B, C)</li>
                <li>💰 Registrar pagos y cobros</li>
                <li>📒 Gestionar su plan de cuentas y asientos contables</li>
                <li>📊 Generar reportes financieros</li>
                <li>👥 Administrar clientes y proveedores</li>
            </ul>

            <p>Comience a configurar su empresa desde el panel principal de ContaFlow.</p>
            <p>Si necesita ayuda, nuestro equipo de soporte está disponible para asistirlo.</p>
            """;

        return BuildBaseTemplate("Bienvenido a ContaFlow", content);
    }

    #endregion
}
