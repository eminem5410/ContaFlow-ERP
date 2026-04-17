using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.DTOs.JournalEntries;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Application.Services;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Application.Tests.Services;

public class JournalEntryServiceTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRepository<JournalEntry> _journalEntryRepo = Substitute.For<IRepository<JournalEntry>>();
    private readonly IRepository<Account> _accountRepo = Substitute.For<IRepository<Account>>();
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<AuditLog> _auditLogRepo = Substitute.For<IRepository<AuditLog>>();
    private readonly IEventDispatcher _eventDispatcher = Substitute.For<IEventDispatcher>();
    private readonly ILogger<JournalEntryService> _logger = Substitute.For<ILogger<JournalEntryService>>();
    private readonly JournalEntryService _service;

    public JournalEntryServiceTests()
    {
        _unitOfWork.JournalEntries.Returns(_journalEntryRepo);
        _unitOfWork.Accounts.Returns(_accountRepo);
        _unitOfWork.Users.Returns(_userRepo);
        _unitOfWork.AuditLogs.Returns(_auditLogRepo);
        _service = new JournalEntryService(_unitOfWork, _eventDispatcher, _logger);
    }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByCompany()
    {
        // Preparación: asientos de dos empresas distintas
        var entries = new List<JournalEntry>
        {
            new() { Id = "1", Number = 1, Description = "Asiento 1", Status = "borrador", CompanyId = "comp-1", TotalDebit = 1000, TotalCredit = 1000 },
            new() { Id = "2", Number = 2, Description = "Asiento 2", Status = "confirmado", CompanyId = "comp-1", TotalDebit = 500, TotalCredit = 500 },
            new() { Id = "3", Number = 1, Description = "Otra empresa", Status = "borrador", CompanyId = "comp-2", TotalDebit = 200, TotalCredit = 200 },
        };
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(entries);

        // Acción: obtener asientos de comp-1
        var result = await _service.GetAllAsync("comp-1");

        // Verificación: solo deben retornar 2 asientos de comp-1
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data!.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByStatus()
    {
        // Preparación: asientos con distintos estados
        var entries = new List<JournalEntry>
        {
            new() { Id = "1", Number = 1, Description = "Borrador", Status = "borrador", CompanyId = "comp-1", TotalDebit = 1000, TotalCredit = 1000 },
            new() { Id = "2", Number = 2, Description = "Confirmado", Status = "confirmado", CompanyId = "comp-1", TotalDebit = 500, TotalCredit = 500 },
        };
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(entries);

        // Acción: filtrar por estado "confirmado"
        var result = await _service.GetAllAsync("comp-1", status: "confirmado");

        // Verificación: solo el confirmado
        result.Data!.Items.Should().HaveCount(1);
        result.Data!.Items[0].Description.Should().Be("Confirmado");
    }

    [Fact]
    public async Task CreateAsync_WithBalancedEntry_ShouldSucceed()
    {
        // Preparación: cuentas válidas existentes, sin asientos previos
        var accounts = new List<Account>
        {
            new() { Id = "acc-1", Code = "1.1.1", Name = "Caja", CompanyId = "comp-1", Type = "activo", Level = 3, Balance = 0 },
            new() { Id = "acc-2", Code = "2.1.1", Name = "Proveedores", CompanyId = "comp-1", Type = "pasivo", Level = 3, Balance = 0 },
        };
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(accounts);
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<JournalEntry>());

        var request = new CreateJournalEntryRequest
        {
            Description = "Pago a proveedor",
            Date = DateTime.Today,
            Lines = new List<CreateJournalLineRequest>
            {
                new() { AccountId = "acc-1", Debit = 5000, Credit = 0, Description = "Egreso de caja" },
                new() { AccountId = "acc-2", Debit = 0, Credit = 5000, Description = "Aumento deuda" },
            }
        };

        // Acción: crear asiento balanceado
        var result = await _service.CreateAsync("comp-1", "user-1", request);

        // Verificación: debe crearse exitosamente
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.TotalDebit.Should().Be(5000);
        result.Data!.TotalCredit.Should().Be(5000);
    }

    [Fact]
    public async Task CreateAsync_WithUnbalancedEntry_ShouldFail()
    {
        // Preparación: cuentas válidas
        var accounts = new List<Account>
        {
            new() { Id = "acc-1", Code = "1.1.1", Name = "Caja", CompanyId = "comp-1", Type = "activo", Level = 3, Balance = 0 },
            new() { Id = "acc-2", Code = "2.1.1", Name = "Proveedores", CompanyId = "comp-1", Type = "pasivo", Level = 3, Balance = 0 },
        };
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(accounts);
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<JournalEntry>());

        var request = new CreateJournalEntryRequest
        {
            Description = "Asiento desbalanceado",
            Date = DateTime.Today,
            Lines = new List<CreateJournalLineRequest>
            {
                new() { AccountId = "acc-1", Debit = 5000, Credit = 0 },
                new() { AccountId = "acc-2", Debit = 0, Credit = 4000 }, // Crédito != Débito
            }
        };

        // Acción: intentar crear asiento desbalanceado
        var result = await _service.CreateAsync("comp-1", "user-1", request);

        // Verificación: debe fallar con UNBALANCED_ENTRY
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("UNBALANCED_ENTRY");
    }

    [Fact]
    public async Task CreateAsync_WithNonexistentAccount_ShouldFail()
    {
        // Preparación: la cuenta referenciada no existe
        _accountRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<Account>());
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<JournalEntry>());

        var request = new CreateJournalEntryRequest
        {
            Description = "Asiento con cuenta inexistente",
            Date = DateTime.Today,
            Lines = new List<CreateJournalLineRequest>
            {
                new() { AccountId = "nonexistent", Debit = 1000, Credit = 0 },
                new() { AccountId = "nonexistent-2", Debit = 0, Credit = 1000 },
            }
        };

        // Acción
        var result = await _service.CreateAsync("comp-1", "user-1", request);

        // Verificación: debe fallar con ACCOUNT_NOT_FOUND
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("ACCOUNT_NOT_FOUND");
    }

    [Fact]
    public async Task ConfirmAsync_ShouldUpdateAccountBalances()
    {
        // Preparación: asiento borrador con líneas
        var entryWithLines = new JournalEntry
        {
            Id = "entry-1",
            Number = 1,
            Description = "Asiento de prueba",
            Status = "borrador",
            CompanyId = "comp-1",
            TotalDebit = 1000,
            TotalCredit = 1000,
            Lines = new List<JournalEntryLine>
            {
                new() { AccountId = "acc-1", Debit = 1000, Credit = 0 },
                new() { AccountId = "acc-2", Debit = 0, Credit = 1000 },
            }
        };

        _journalEntryRepo.GetByIdAsync("entry-1", Arg.Any<CancellationToken>()).Returns(entryWithLines);
        _journalEntryRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<JournalEntry> { entryWithLines });

        var acc1 = new Account { Id = "acc-1", Code = "1.1.1", Name = "Caja", CompanyId = "comp-1", Balance = 5000 };
        var acc2 = new Account { Id = "acc-2", Code = "2.1.1", Name = "Proveedores", CompanyId = "comp-1", Balance = 3000 };

        _accountRepo.GetByIdAsync("acc-1", Arg.Any<CancellationToken>()).Returns(acc1);
        _accountRepo.GetByIdAsync("acc-2", Arg.Any<CancellationToken>()).Returns(acc2);
        _userRepo.GetByIdAsync("user-1", Arg.Any<CancellationToken>()).Returns(new User { Id = "user-1", Name = "Test User" });

        // Acción: confirmar asiento
        var result = await _service.ConfirmAsync("comp-1", "entry-1", "user-1");

        // Verificación: asiento confirmado y saldos actualizados
        result.Success.Should().BeTrue();
        result.Data!.Status.Should().Be("confirmado");
        acc1.Balance.Should().Be(6000); // 5000 + 1000 (débito)
        acc2.Balance.Should().Be(2000); // 3000 - 1000 (crédito)
        await _accountRepo.Received(2).UpdateAsync(Arg.Any<Account>(), Arg.Any<CancellationToken>());
        await _auditLogRepo.Received(1).AddAsync(Arg.Any<AuditLog>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ConfirmAsync_WithAlreadyConfirmedEntry_ShouldFail()
    {
        // Preparación: asiento ya confirmado
        var entry = new JournalEntry
        {
            Id = "entry-1",
            Number = 1,
            Description = "Asiento confirmado",
            Status = "confirmado",
            CompanyId = "comp-1",
            TotalDebit = 1000,
            TotalCredit = 1000,
        };
        _journalEntryRepo.GetByIdAsync("entry-1", Arg.Any<CancellationToken>()).Returns(entry);

        // Acción: intentar confirmar asiento ya confirmado
        var result = await _service.ConfirmAsync("comp-1", "entry-1", "user-1");

        // Verificación: debe fallar con ALREADY_CONFIRMED
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("ALREADY_CONFIRMED");
    }

    [Fact]
    public async Task DeleteAsync_WithDraftEntry_ShouldSucceed()
    {
        // Preparación: asiento en borrador
        var entry = new JournalEntry
        {
            Id = "entry-1",
            Number = 1,
            Description = "Borrador",
            Status = "borrador",
            CompanyId = "comp-1",
        };
        _journalEntryRepo.GetByIdAsync("entry-1", Arg.Any<CancellationToken>()).Returns(entry);

        // Acción: eliminar borrador
        var result = await _service.DeleteAsync("comp-1", "entry-1", "user-1");

        // Verificación: debe eliminarse exitosamente
        result.Success.Should().BeTrue();
        result.Data.Should().BeTrue();
        await _journalEntryRepo.Received(1).DeleteAsync(entry, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_WithConfirmedEntry_ShouldFail()
    {
        // Preparación: asiento confirmado (no borrable)
        var entry = new JournalEntry
        {
            Id = "entry-1",
            Number = 1,
            Description = "Confirmado",
            Status = "confirmado",
            CompanyId = "comp-1",
        };
        _journalEntryRepo.GetByIdAsync("entry-1", Arg.Any<CancellationToken>()).Returns(entry);

        // Acción: intentar eliminar asiento confirmado
        var result = await _service.DeleteAsync("comp-1", "entry-1", "user-1");

        // Verificación: debe fallar con NOT_DRAFT
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("NOT_DRAFT");
    }
}
