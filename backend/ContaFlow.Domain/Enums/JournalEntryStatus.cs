namespace ContaFlow.Domain.Enums;

/// <summary>
/// Estados posibles de un asiento contable.
/// </summary>
public enum JournalEntryStatus
{
    /// <summary>Borrador - editable, no afecta saldos</summary>
    Borrador,
    /// <summary>Confirmado - afecta saldos, no editable</summary>
    Confirmado,
    /// <summary>Anulado - reversa el efecto sobre saldos</summary>
    Anulado
}
