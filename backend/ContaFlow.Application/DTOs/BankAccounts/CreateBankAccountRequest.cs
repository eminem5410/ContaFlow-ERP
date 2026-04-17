using System.ComponentModel.DataAnnotations;

namespace ContaFlow.Application.DTOs.BankAccounts;

/// <summary>
/// DTO para crear una nueva cuenta bancaria.
/// </summary>
public class CreateBankAccountRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio")]
    [StringLength(200, ErrorMessage = "El nombre no puede superar los 200 caracteres")]
    public string Name { get; set; } = string.Empty;

    [StringLength(100, ErrorMessage = "El banco no puede superar los 100 caracteres")]
    public string? Bank { get; set; }

    [StringLength(50, ErrorMessage = "El número no puede superar los 50 caracteres")]
    public string? Number { get; set; }

    [StringLength(22, ErrorMessage = "El CBU no puede superar los 22 caracteres")]
    public string? Cbu { get; set; }

    [StringLength(50, ErrorMessage = "El alias no puede superar los 50 caracteres")]
    public string? Alias { get; set; }

    [RegularExpression("^(caja|cta_corriente|caja_ahorro)$",
        ErrorMessage = "Tipo inválido. Valores: caja, cta_corriente, caja_ahorro")]
    public string? Type { get; set; }

    [StringLength(10, ErrorMessage = "La moneda no puede superar los 10 caracteres")]
    public string? Currency { get; set; }
}
