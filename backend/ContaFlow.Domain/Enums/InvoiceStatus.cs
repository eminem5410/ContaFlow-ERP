namespace ContaFlow.Domain.Enums;

/// <summary>
/// Estados posibles de una factura.
/// </summary>
public enum InvoiceStatus
{
    /// <summary>Pendiente de pago</summary>
    Pendiente,
    /// <summary>Pagada parcialmente</summary>
    PagadaParcial,
    /// <summary>Pagada en su totalidad</summary>
    Pagada,
    /// <summary>Vencida (pasó la fecha de vencimiento)</summary>
    Vencida,
    /// <summary>Anulada / cancelada</summary>
    Anulada
}
