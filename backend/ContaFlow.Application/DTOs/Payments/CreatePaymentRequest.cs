using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Payments;

/// <summary>
/// DTO para crear un nuevo pago o cobro.
/// </summary>
public class CreatePaymentRequest
{
    [Required(ErrorMessage = "El número es obligatorio")]
    [StringLength(50, ErrorMessage = "El número no puede superar los 50 caracteres")]
    public string Number { get; set; } = string.Empty;

    public DateTime Date { get; set; } = DateTime.UtcNow;

    [Required(ErrorMessage = "El monto es obligatorio")]
    [Range(0.01, double.MaxValue, ErrorMessage = "El monto debe ser mayor a 0")]
    public double Amount { get; set; }

    [Required(ErrorMessage = "El método de pago es obligatorio")]
    [RegularExpression("^(efectivo|transferencia|cheque|tarjeta)$",
        ErrorMessage = "Método inválido. Valores: efectivo, transferencia, cheque, tarjeta")]
    public string Method { get; set; } = "transferencia";

    [Required(ErrorMessage = "El tipo es obligatorio")]
    [RegularExpression("^(cobro|pago)$",
        ErrorMessage = "Tipo inválido. Valores: cobro, pago")]
    public string Type { get; set; } = "cobro";

    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public string? InvoiceId { get; set; }
    public string? ClientId { get; set; }
    public string? ProviderId { get; set; }
    public string? BankAccountId { get; set; }
}
