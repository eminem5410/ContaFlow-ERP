namespace ContaFlow.Domain.Enums;

/// <summary>
/// Tipos de factura según normativa AFIP argentina.
/// </summary>
public enum InvoiceType
{
    /// <summary>Factura A - Responsable Inscripto</summary>
    A,
    /// <summary>Factura B - Consumidor Final / Monotributo</summary>
    B,
    /// <summary>Factura C - No categorizado</summary>
    C,
    /// <summary>Nota de Crédito</summary>
    NC,
    /// <summary>Nota de Débito</summary>
    ND
}
