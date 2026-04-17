namespace ContaFlow.Domain.Enums;

/// <summary>
/// Métodos de pago disponibles.
/// </summary>
public enum PaymentMethod
{
    /// <summary>Efectivo</summary>
    Efectivo,
    /// <summary>Transferencia bancaria</summary>
    Transferencia,
    /// <summary>Cheque</summary>
    Cheque,
    /// <summary>Tarjeta de crédito/débito</summary>
    Tarjeta
}
