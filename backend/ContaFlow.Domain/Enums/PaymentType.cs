namespace ContaFlow.Domain.Enums;

/// <summary>
/// Tipos de pago: cobro (ingreso) o pago (egreso).
/// </summary>
public enum PaymentType
{
    /// <summary>Cobro de cliente</summary>
    Cobro,
    /// <summary>Pago a proveedor</summary>
    Pago
}
