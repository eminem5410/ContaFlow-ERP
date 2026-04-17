using ContaFlow.Application.DTOs.Accounts;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Interfaces;
using ContaFlow.Application.Services;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Interfaces;
using NSubstitute;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Application.Tests.Services;

public class AccountServiceTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRepository<Account> _accountRepo = Substitute.For<IRepository<Account>>();
    private readonly AccountService _service;

    public AccountServiceTests()
    {
        _unitOfWork.Accounts.Returns(_accountRepo);
        _service = new AccountService(_unitOfWork);
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAccountsForCompanyOnly()
    {
        // Preparación: se crean cuentas para dos empresas distintas
        var accounts = new List<Account>
        {
            new() { Id = "1", Code = "1", Name = "Activo", CompanyId = "comp-1", Type = "activo", Level = 1, Balance = 0 },
            new() { Id = "2", Code = "2", Name = "Pasivo", CompanyId = "comp-1", Type = "pasivo", Level = 1, Balance = 0 },
            new() { Id = "3", Code = "3", Name = "Otra empresa", CompanyId = "comp-2", Type = "patrimonio", Level = 1, Balance = 0 },
        };
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(accounts);

        // Acción: obtener cuentas de comp-1
        var result = await _service.GetAllAsync("comp-1");

        // Verificación: solo deben retornar 2 cuentas de comp-1
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data!.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAllAsync_WithSearch_ShouldFilterByCodeOrName()
    {
        // Preparación: cuentas con distintos códigos y nombres
        var accounts = new List<Account>
        {
            new() { Id = "1", Code = "1.1.1", Name = "Caja", CompanyId = "comp-1", Type = "activo", Level = 3, Balance = 1000 },
            new() { Id = "2", Code = "1.1.2", Name = "Banco", CompanyId = "comp-1", Type = "activo", Level = 3, Balance = 5000 },
            new() { Id = "3", Code = "2.1.1", Name = "Proveedor", CompanyId = "comp-1", Type = "pasivo", Level = 3, Balance = 0 },
        };
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(accounts);

        // Acción: buscar por término "Caja"
        var result = await _service.GetAllAsync("comp-1", searchTerm: "Caja");

        // Verificación: solo debe retornar la cuenta "Caja"
        result.Data!.Items.Should().HaveCount(1);
        result.Data!.Items[0].Name.Should().Be("Caja");
    }

    [Fact]
    public async Task CreateAsync_WithDuplicateCode_ShouldFail()
    {
        // Preparación: ya existe una cuenta con código "1.1.1"
        var accounts = new List<Account>
        {
            new() { Id = "1", Code = "1.1.1", Name = "Caja", CompanyId = "comp-1", Type = "activo", Level = 3, Balance = 0 },
        };
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(accounts);

        var request = new CreateAccountRequest
        {
            Code = "1.1.1",
            Name = "Caja Duplicada",
            Type = "activo",
            Level = 3,
        };

        // Acción: intentar crear cuenta con código duplicado
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: debe fallar con error DUPLICATE_CODE
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("DUPLICATE_CODE");
    }

    [Fact]
    public async Task CreateAsync_WithValidData_ShouldSucceed()
    {
        // Preparación: no existen cuentas previas
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Account>());

        var request = new CreateAccountRequest
        {
            Code = "1.1.10",
            Name = "Nueva Cuenta",
            Type = "activo",
            Level = 3,
        };

        // Acción: crear nueva cuenta
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: debe crearse exitosamente
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Code.Should().Be("1.1.10");
        result.Message.Should().Contain("exitosamente");
    }

    [Fact]
    public async Task DeleteAsync_WithNonexistentAccount_ShouldReturnNotFound()
    {
        // Preparación: la cuenta no existe
        _accountRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns((Account?)null);

        // Acción: intentar eliminar cuenta inexistente
        var result = await _service.DeleteAsync("comp-1", "nonexistent");

        // Verificación: debe retornar NOT_FOUND
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("NOT_FOUND");
    }
}
