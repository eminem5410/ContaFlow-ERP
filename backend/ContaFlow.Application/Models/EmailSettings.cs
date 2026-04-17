using ContaFlow.Application.Interfaces;

namespace ContaFlow.Application.Models;

/// <summary>
/// Configuración del servicio de email SMTP.
/// Cuando Enabled = false, los emails se registran en log sin enviar (modo desarrollo).
/// </summary>
public class EmailSettings
{
    public string FromName { get; set; } = "ContaFlow ERP";
    public string FromEmail { get; set; } = string.Empty;
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 587;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
    public bool Enabled { get; set; } = false;
}
