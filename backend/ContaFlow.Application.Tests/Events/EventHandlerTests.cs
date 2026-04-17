using ContaFlow.Application.Events.Handlers;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Application.Tests.Events;

// ─── JournalEntryConfirmedEventHandler ─────────────────────────────────────────

public class JournalEntryConfirmedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly ILogger<JournalEntryConfirmedEventHandler> _logger =
        Substitute.For<ILogger<JournalEntryConfirmedEventHandler>>();
    private readonly JournalEntryConfirmedEventHandler _handler;

    public JournalEntryConfirmedEventHandlerTests()
    {
        _handler = new JournalEntryConfirmedEventHandler(_unitOfWork, _cacheService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldRecalculateParentAccountBalances_WhenEntryConfirmed()
    {
        // Arrange: parent → child hierarchy; child balance changed by the entry
        var parentId = "acc-parent";
        var childId = "acc-child";

        var accounts = new List<Account>
        {
            new() { Id = parentId, Code = "1", Name = "Activos", Balance = 0, CompanyId = "comp-1", ParentId = null },
            new() { Id = childId, Code = "1.1", Name = "Caja", Balance = 5000, CompanyId = "comp-1", ParentId = parentId },
        };
        _unitOfWork.Accounts.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(accounts);

        var domainEvent = new JournalEntryConfirmedEvent
        {
            CompanyId = "comp-1",
            EntryNumber = 42,
            AffectedAccounts = new List<AccountBalanceUpdate>
            {
                new() { AccountId = childId, NewBalance = 8000, Debit = 3000, Credit = 0 },
            },
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: parent balance should be recalculated as sum of children (8000)
        await _unitOfWork.Accounts.Received(1).UpdateAsync(
            Arg.Is<Account>(a => a.Id == parentId && a.Balance == 8000),
            Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateCacheKeys_WhenEntryConfirmed()
    {
        // Arrange
        _unitOfWork.Accounts.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<Account>());

        var domainEvent = new JournalEntryConfirmedEvent
        {
            CompanyId = "comp-1",
            EntryNumber = 1,
            AffectedAccounts = new List<AccountBalanceUpdate>(),
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: cache keys for accounts, balance-sheet, and journal-entries should be invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:accounts", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:reports:balance-sheet", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:journal-entries", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_WithDeepHierarchy_ShouldRecalculateAllAncestors()
    {
        // Arrange: grandparent → parent → child (3 levels)
        var gpId = "acc-gp";
        var pId = "acc-p";
        var cId = "acc-c";

        var accounts = new List<Account>
        {
            new() { Id = gpId, Code = "1", Name = "Root", Balance = 0, CompanyId = "comp-1", ParentId = null },
            new() { Id = pId, Code = "1.1", Name = "Mid", Balance = 0, CompanyId = "comp-1", ParentId = gpId },
            new() { Id = cId, Code = "1.1.1", Name = "Leaf", Balance = 3000, CompanyId = "comp-1", ParentId = pId },
        };
        _unitOfWork.Accounts.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(accounts);

        var domainEvent = new JournalEntryConfirmedEvent
        {
            CompanyId = "comp-1",
            EntryNumber = 10,
            AffectedAccounts = new List<AccountBalanceUpdate>
            {
                new() { AccountId = cId, NewBalance = 3000, Debit = 3000, Credit = 0 },
            },
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: both parent and grandparent should be recalculated
        await _unitOfWork.Accounts.Received(1).UpdateAsync(
            Arg.Is<Account>(a => a.Id == pId && a.Balance == 3000),
            Arg.Any<CancellationToken>());
        await _unitOfWork.Accounts.Received(1).UpdateAsync(
            Arg.Is<Account>(a => a.Id == gpId && a.Balance == 3000),
            Arg.Any<CancellationToken>());
    }
}

// ─── InvoiceCreatedEventHandler ────────────────────────────────────────────────

public class InvoiceCreatedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<InvoiceCreatedEventHandler> _logger =
        Substitute.For<ILogger<InvoiceCreatedEventHandler>>();
    private readonly InvoiceCreatedEventHandler _handler;

    public InvoiceCreatedEventHandlerTests()
    {
        _handler = new InvoiceCreatedEventHandler(_unitOfWork, _cacheService, _emailService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldUpdateClientBalance_WhenInvoiceHasClient()
    {
        // Arrange: invoice with associated client
        var clientId = "client-1";
        var invoice = new Invoice
        {
            Id = "inv-1",
            ClientId = clientId,
            CompanyId = "comp-1",
        };
        var client = new Client
        {
            Id = clientId,
            Balance = 1000,
            CompanyId = "comp-1",
        };

        _unitOfWork.Invoices.GetByIdAsync("inv-1", Arg.Any<CancellationToken>())
            .Returns(invoice);
        _unitOfWork.Clients.GetByIdAsync(clientId, Arg.Any<CancellationToken>())
            .Returns(client);

        var domainEvent = new InvoiceCreatedEvent
        {
            InvoiceId = "inv-1",
            InvoiceNumber = "A-001",
            Total = 5000,
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: client balance incremented by invoice total
        client.Balance.Should().Be(6000);
        await _unitOfWork.Clients.Received(1).UpdateAsync(client, Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateCache_ForInvoicesAndReports()
    {
        // Arrange: invoice without client (to isolate cache invalidation)
        _unitOfWork.Invoices.GetByIdAsync("inv-1", Arg.Any<CancellationToken>())
            .Returns((Invoice?)null);

        var domainEvent = new InvoiceCreatedEvent
        {
            InvoiceId = "inv-1",
            InvoiceNumber = "B-002",
            Total = 3000,
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: invoice, report, and dashboard cache should be invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:invoices", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:reports", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:dashboard", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldNotUpdateClient_WhenInvoiceHasNoClient()
    {
        // Arrange: invoice without client
        var invoice = new Invoice
        {
            Id = "inv-no-client",
            ClientId = null,
            CompanyId = "comp-1",
        };
        _unitOfWork.Invoices.GetByIdAsync("inv-no-client", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new InvoiceCreatedEvent
        {
            InvoiceId = "inv-no-client",
            InvoiceNumber = "X-999",
            Total = 2000,
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: should never look up a client
        await _unitOfWork.Clients.DidNotReceive().GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}

// ─── InvoiceStatusChangedEventHandler ──────────────────────────────────────────

public class InvoiceStatusChangedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<InvoiceStatusChangedEventHandler> _logger =
        Substitute.For<ILogger<InvoiceStatusChangedEventHandler>>();
    private readonly InvoiceStatusChangedEventHandler _handler;

    public InvoiceStatusChangedEventHandlerTests()
    {
        _handler = new InvoiceStatusChangedEventHandler(_unitOfWork, _cacheService, _emailService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateClientsAndIncomeStatementCache_WhenStatusIsPagada()
    {
        // Arrange: invoice with client (to test email + cache invalidation)
        var invoice = new Invoice
        {
            Id = "inv-1",
            ClientId = "client-1",
            Total = 5000,
            CompanyId = "comp-1",
        };
        var client = new Client
        {
            Id = "client-1",
            Email = "client@test.com",
            Name = "Test Client",
            CompanyId = "comp-1",
        };
        _unitOfWork.Invoices.GetByIdAsync("inv-1", Arg.Any<CancellationToken>())
            .Returns(invoice);
        _unitOfWork.Clients.GetByIdAsync("client-1", Arg.Any<CancellationToken>())
            .Returns(client);
        _emailService.SendInvoicePaidAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<double>(), Arg.Any<CancellationToken>())
            .Returns(true);

        var domainEvent = new InvoiceStatusChangedEvent
        {
            CompanyId = "comp-1",
            InvoiceId = "inv-1",
            InvoiceNumber = "A-001",
            PreviousStatus = "pendiente",
            NewStatus = "pagada",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: email de factura pagada enviado
        await _emailService.Received(1).SendInvoicePaidAsync(
            "client@test.com", "Test Client", "A-001", 5000, Arg.Any<CancellationToken>());

        // Assert: when status is "pagada", clients, income-statement, and iva caches are invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:clients", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:reports:income-statement", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:reports:iva", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateInvoicesAndDashboardCache_ForAnyStatusChange()
    {
        // Arrange: non-pagada status change (e.g., pendiente → parcial), invoice without client
        var invoice = new Invoice
        {
            Id = "inv-2",
            ClientId = null,
            Total = 3000,
            CompanyId = "comp-1",
        };
        _unitOfWork.Invoices.GetByIdAsync("inv-2", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new InvoiceStatusChangedEvent
        {
            CompanyId = "comp-1",
            InvoiceId = "inv-2",
            InvoiceNumber = "B-002",
            PreviousStatus = "pendiente",
            NewStatus = "parcial",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: invoices and dashboard cache always invalidated regardless of status
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:invoices", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:dashboard", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldNotInvalidateIncomeStatement_WhenStatusIsNotPagada()
    {
        // Arrange: status change that is NOT "pagada", invoice without client
        var invoice = new Invoice
        {
            Id = "inv-3",
            ClientId = null,
            Total = 2000,
            CompanyId = "comp-1",
        };
        _unitOfWork.Invoices.GetByIdAsync("inv-3", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new InvoiceStatusChangedEvent
        {
            CompanyId = "comp-1",
            InvoiceId = "inv-3",
            InvoiceNumber = "C-003",
            PreviousStatus = "parcial",
            NewStatus = "pendiente",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: income-statement and iva caches should NOT be invalidated
        await _cacheService.DidNotReceive().RemoveByPrefixAsync(
            "company:comp-1:reports:income-statement", Arg.Any<CancellationToken>());
        await _cacheService.DidNotReceive().RemoveByPrefixAsync(
            "company:comp-1:reports:iva", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldSendStatusChangedEmail_WhenNonPagadaStatusChange()
    {
        // Arrange: status change with client that has email
        var invoice = new Invoice
        {
            Id = "inv-4",
            ClientId = "client-2",
            Total = 7500,
            CompanyId = "comp-1",
        };
        var client = new Client
        {
            Id = "client-2",
            Email = "cliente2@test.com",
            Name = "Otro Cliente",
            CompanyId = "comp-1",
        };
        _unitOfWork.Invoices.GetByIdAsync("inv-4", Arg.Any<CancellationToken>())
            .Returns(invoice);
        _unitOfWork.Clients.GetByIdAsync("client-2", Arg.Any<CancellationToken>())
            .Returns(client);
        _emailService.SendInvoiceStatusChangedAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<double>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(true);

        var domainEvent = new InvoiceStatusChangedEvent
        {
            CompanyId = "comp-1",
            InvoiceId = "inv-4",
            InvoiceNumber = "D-004",
            PreviousStatus = "pendiente",
            NewStatus = "parcial",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: email de cambio de estado enviado
        await _emailService.Received(1).SendInvoiceStatusChangedAsync(
            "cliente2@test.com", "Otro Cliente", "D-004", 7500, "pendiente", "parcial", Arg.Any<CancellationToken>());
    }
}

// ─── PaymentCreatedEventHandler ────────────────────────────────────────────────

public class PaymentCreatedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<PaymentCreatedEventHandler> _logger =
        Substitute.For<ILogger<PaymentCreatedEventHandler>>();
    private readonly PaymentCreatedEventHandler _handler;

    public PaymentCreatedEventHandlerTests()
    {
        _handler = new PaymentCreatedEventHandler(_unitOfWork, _cacheService, _emailService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldSetInvoiceStatusToParcial_WhenPartialPayment()
    {
        // Arrange: invoice total is 10000, payment is 4000 → partial
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 10000,
            AmountPaid = 0,
            Status = "pendiente",
            CompanyId = "comp-1",
            ClientId = "client-1",
        };

        _unitOfWork.Invoices.GetByIdAsync("inv-1", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new PaymentCreatedEvent
        {
            PaymentId = "pay-1",
            PaymentNumber = "REC-001",
            Amount = 4000,
            InvoiceId = "inv-1",
            CompanyId = "comp-1",
            Type = "cobro",
            Method = "transferencia",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert
        invoice.AmountPaid.Should().Be(4000);
        invoice.Status.Should().Be("parcial");
        await _unitOfWork.Invoices.Received(1).UpdateAsync(invoice, Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldSetInvoiceStatusToPagada_WhenFullyPaid()
    {
        // Arrange: invoice total is 10000, payment is 10000 → fully paid
        var invoice = new Invoice
        {
            Id = "inv-2",
            Total = 10000,
            AmountPaid = 0,
            Status = "pendiente",
            CompanyId = "comp-1",
            ClientId = "client-1",
        };

        _unitOfWork.Invoices.GetByIdAsync("inv-2", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new PaymentCreatedEvent
        {
            PaymentId = "pay-2",
            PaymentNumber = "REC-002",
            Amount = 10000,
            InvoiceId = "inv-2",
            CompanyId = "comp-1",
            Type = "cobro",
            Method = "efectivo",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert
        invoice.AmountPaid.Should().Be(10000);
        invoice.Status.Should().Be("pagada");
        await _unitOfWork.Invoices.Received(1).UpdateAsync(invoice, Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldNotUpdateInvoice_WhenNoInvoiceAssociated()
    {
        // Arrange: payment without associated invoice
        var domainEvent = new PaymentCreatedEvent
        {
            PaymentId = "pay-3",
            PaymentNumber = "PAG-001",
            Amount = 500,
            InvoiceId = null,
            CompanyId = "comp-1",
            Type = "pago",
            Method = "cheque",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: should never look up invoice
        await _unitOfWork.Invoices.DidNotReceive().GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidatePaymentsAndDashboardCache()
    {
        // Arrange
        var domainEvent = new PaymentCreatedEvent
        {
            PaymentId = "pay-4",
            PaymentNumber = "REC-004",
            Amount = 1000,
            InvoiceId = null,
            CompanyId = "comp-1",
            Type = "cobro",
            Method = "transferencia",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: payments, dashboard, and reports cache invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:payments", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:dashboard", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:reports", Arg.Any<CancellationToken>());
    }
}

// ─── PaymentDeletedEventHandler ────────────────────────────────────────────────

public class PaymentDeletedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly ILogger<PaymentDeletedEventHandler> _logger =
        Substitute.For<ILogger<PaymentDeletedEventHandler>>();
    private readonly PaymentDeletedEventHandler _handler;

    public PaymentDeletedEventHandlerTests()
    {
        _handler = new PaymentDeletedEventHandler(_unitOfWork, _cacheService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldRevertInvoiceToPendiente_WhenFullPaymentDeleted()
    {
        // Arrange: invoice was fully paid (10000/10000), full payment deleted
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 10000,
            AmountPaid = 10000,
            Status = "pagada",
            CompanyId = "comp-1",
            ClientId = "client-1",
        };

        _unitOfWork.Invoices.GetByIdAsync("inv-1", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new PaymentDeletedEvent
        {
            PaymentId = "pay-1",
            Amount = 10000,
            InvoiceId = "inv-1",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: invoice reverts to pendiente with zero amount paid
        invoice.AmountPaid.Should().Be(0);
        invoice.Status.Should().Be("pendiente");
        await _unitOfWork.Invoices.Received(1).UpdateAsync(invoice, Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldRevertInvoiceToParcial_WhenPartialPaymentDeleted()
    {
        // Arrange: invoice fully paid (10000/10000), partial payment of 4000 deleted
        var invoice = new Invoice
        {
            Id = "inv-2",
            Total = 10000,
            AmountPaid = 10000,
            Status = "pagada",
            CompanyId = "comp-1",
            ClientId = "client-2",
        };

        _unitOfWork.Invoices.GetByIdAsync("inv-2", Arg.Any<CancellationToken>())
            .Returns(invoice);

        var domainEvent = new PaymentDeletedEvent
        {
            PaymentId = "pay-2",
            Amount = 4000,
            InvoiceId = "inv-2",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: remaining amount = 6000 → status = "parcial"
        invoice.AmountPaid.Should().Be(6000);
        invoice.Status.Should().Be("parcial");
        await _unitOfWork.Invoices.Received(1).UpdateAsync(invoice, Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidatePaymentsAndDashboardCache()
    {
        // Arrange: payment without invoice (to isolate cache invalidation)
        var domainEvent = new PaymentDeletedEvent
        {
            PaymentId = "pay-3",
            Amount = 500,
            InvoiceId = null,
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: payments and dashboard cache invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:payments", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:dashboard", Arg.Any<CancellationToken>());
    }
}

// ─── UserCreatedEventHandler ───────────────────────────────────────────────────

public class UserCreatedEventHandlerTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly ILogger<UserCreatedEventHandler> _logger =
        Substitute.For<ILogger<UserCreatedEventHandler>>();
    private readonly UserCreatedEventHandler _handler;

    public UserCreatedEventHandlerTests()
    {
        _handler = new UserCreatedEventHandler(_unitOfWork, _cacheService, _emailService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldSeedDefaultPermissions_ForAdminRole()
    {
        // Arrange: matching admin role and available permissions
        var adminRole = new Role
        {
            Id = "role-admin",
            Name = "admin",
            CompanyId = "comp-1",
        };
        var permissions = new List<Permission>
        {
            new() { Id = "perm-1", Name = "accounts.read" },
            new() { Id = "perm-2", Name = "accounts.create" },
            new() { Id = "perm-3", Name = "accounts.update" },
            new() { Id = "perm-4", Name = "accounts.delete" },
            new() { Id = "perm-5", Name = "journal_entries.read" },
            new() { Id = "perm-6", Name = "invoices.read" },
            new() { Id = "perm-7", Name = "reports.read" },
            new() { Id = "perm-8", Name = "users.read" },
            new() { Id = "perm-9", Name = "roles.read" },
            new() { Id = "perm-10", Name = "settings.read" },
            new() { Id = "perm-11", Name = "audit_logs.read" },
            new() { Id = "perm-12", Name = "journal_entries.create" },
            new() { Id = "perm-13", Name = "journal_entries.confirm" },
            new() { Id = "perm-14", Name = "journal_entries.delete" },
            new() { Id = "perm-15", Name = "invoices.create" },
            new() { Id = "perm-16", Name = "invoices.update" },
            new() { Id = "perm-17", Name = "invoices.delete" },
            new() { Id = "perm-18", Name = "payments.read" },
            new() { Id = "perm-19", Name = "payments.create" },
            new() { Id = "perm-20", Name = "payments.delete" },
            new() { Id = "perm-21", Name = "clients.read" },
            new() { Id = "perm-22", Name = "clients.create" },
            new() { Id = "perm-23", Name = "clients.update" },
            new() { Id = "perm-24", Name = "clients.delete" },
            new() { Id = "perm-25", Name = "providers.read" },
            new() { Id = "perm-26", Name = "providers.create" },
            new() { Id = "perm-27", Name = "providers.update" },
            new() { Id = "perm-28", Name = "providers.delete" },
            new() { Id = "perm-29", Name = "reports.export" },
            new() { Id = "perm-30", Name = "users.create" },
            new() { Id = "perm-31", Name = "users.update" },
            new() { Id = "perm-32", Name = "users.delete" },
            new() { Id = "perm-33", Name = "roles.manage" },
            new() { Id = "perm-34", Name = "settings.update" },
        };

        _unitOfWork.Roles.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<Role> { adminRole });
        _unitOfWork.Permissions.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(permissions);
        _unitOfWork.RolePermissions.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<RolePermission>()); // No existing permissions

        var domainEvent = new UserCreatedEvent
        {
            UserId = "user-1",
            Email = "admin@contaflow.com",
            Name = "Admin",
            Role = "admin",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: all admin permissions should be assigned (34 permissions)
        await _unitOfWork.RolePermissions.Received(34)
            .AddAsync(Arg.Any<RolePermission>(), Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldSeedLimitedPermissions_ForViewerRole()
    {
        // Arrange: viewer role with limited permissions
        var viewerRole = new Role
        {
            Id = "role-viewer",
            Name = "viewer",
            CompanyId = "comp-1",
        };
        var permissions = new List<Permission>
        {
            new() { Id = "p1", Name = "accounts.read" },
            new() { Id = "p2", Name = "journal_entries.read" },
            new() { Id = "p3", Name = "invoices.read" },
            new() { Id = "p4", Name = "payments.read" },
            new() { Id = "p5", Name = "clients.read" },
            new() { Id = "p6", Name = "providers.read" },
            new() { Id = "p7", Name = "reports.read" },
            new() { Id = "p8", Name = "accounts.create" }, // extra, not for viewer
        };

        _unitOfWork.Roles.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<Role> { viewerRole });
        _unitOfWork.Permissions.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(permissions);
        _unitOfWork.RolePermissions.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<RolePermission>());

        var domainEvent = new UserCreatedEvent
        {
            UserId = "user-viewer",
            Email = "viewer@contaflow.com",
            Name = "Viewer User",
            Role = "viewer",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: only 7 read permissions assigned (not the extra create one)
        await _unitOfWork.RolePermissions.Received(7)
            .AddAsync(Arg.Any<RolePermission>(), Arg.Any<CancellationToken>());
        await _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateUsersAndPermissionsCache()
    {
        // Arrange: role doesn't exist so no permissions are seeded
        _unitOfWork.Roles.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<Role>());

        var domainEvent = new UserCreatedEvent
        {
            UserId = "user-2",
            Email = "user2@contaflow.com",
            Name = "User Two",
            Role = "nonexistent",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: cache still invalidated even when no permissions seeded
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:users", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "company:comp-1:permissions", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldNotSeed_WhenRoleNotFound()
    {
        // Arrange: role does not exist in the system
        _unitOfWork.Roles.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns(new List<Role>());

        var domainEvent = new UserCreatedEvent
        {
            UserId = "user-3",
            Email = "user3@contaflow.com",
            Name = "User Three",
            Role = "superadmin",
            CompanyId = "comp-1",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: no permissions should be looked up or assigned
        await _unitOfWork.Permissions.DidNotReceive().GetAllAsync(Arg.Any<CancellationToken>());
        await _unitOfWork.RolePermissions.DidNotReceive()
            .AddAsync(Arg.Any<RolePermission>(), Arg.Any<CancellationToken>());
    }
}

// ─── RoleChangedEventHandler ───────────────────────────────────────────────────

public class RoleChangedEventHandlerTests
{
    private readonly ICacheService _cacheService = Substitute.For<ICacheService>();
    private readonly ILogger<RoleChangedEventHandler> _logger =
        Substitute.For<ILogger<RoleChangedEventHandler>>();
    private readonly RoleChangedEventHandler _handler;

    public RoleChangedEventHandlerTests()
    {
        _handler = new RoleChangedEventHandler(_cacheService, _logger);
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateUserPermissionsCache()
    {
        // Arrange
        var domainEvent = new RoleChangedEvent
        {
            UserId = "user-1",
            PreviousRole = "viewer",
            NewRole = "admin",
            ChangedBy = "super-admin",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert: permissions and roles cache for the user should be invalidated
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "user:user-1:permissions", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "user:user-1:roles", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "users:list", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task HandleAsync_ShouldInvalidateCache_ForAnyRoleChange()
    {
        // Arrange: change from operador to contador
        var domainEvent = new RoleChangedEvent
        {
            UserId = "user-42",
            PreviousRole = "operador",
            NewRole = "contador",
            ChangedBy = "admin-user",
        };

        // Act
        await _handler.HandleAsync(domainEvent);

        // Assert
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "user:user-42:permissions", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "user:user-42:roles", Arg.Any<CancellationToken>());
        await _cacheService.Received(1).RemoveByPrefixAsync(
            "users:list", Arg.Any<CancellationToken>());
    }
}
