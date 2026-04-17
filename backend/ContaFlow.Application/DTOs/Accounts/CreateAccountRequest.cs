using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.Accounts;

/// <summary>
/// DTO para crear una nueva cuenta contable.
/// </summary>
public class CreateAccountRequest
{
    [Required(ErrorMessage = "El código es obligatorio")]
    [StringLength(20, ErrorMessage = "El código no puede superar los 20 caracteres")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El tipo es obligatorio")]
    [RegularExpression("^(activo|pasivo|patrimonio|ingreso|gasto)$",
        ErrorMessage = "Tipo inválido. Valores: activo, pasivo, patrimonio, ingreso, gasto")]
    public string Type { get; set; } = string.Empty;

    public string? Subtype { get; set; }

    /// <summary>
    /// ID de la cuenta padre (null para cuentas raíz).
    /// </summary>
    public string? ParentId { get; set; }

    public int Level { get; set; } = 1;
}
