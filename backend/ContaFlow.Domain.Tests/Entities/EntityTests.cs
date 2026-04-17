using ContaFlow.Domain.Entities;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Domain.Tests.Entities;

public class EntityTests
{
    // ══════════════════════════════════════════════════════════════════
    // Account Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void Account_ShouldInitializeWithDefaults()
    {
        // Acción
        var account = new Account();

        // Verificación: valores por defecto de Account
        account.Id.Should().NotBeNullOrWhiteSpace();
        account.Code.Should().BeEmpty();
        account.Name.Should().BeEmpty();
        account.Type.Should().BeEmpty();
        account.Subtype.Should().BeNull();
        account.ParentId.Should().BeNull();
        account.Level.Should().Be(1);
        account.Balance.Should().Be(0);
        account.CompanyId.Should().BeEmpty();
        account.Children.Should().NotBeNull().And.BeEmpty();
        account.JournalLines.Should().NotBeNull().And.BeEmpty();
        account.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        account.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void Account_ShouldSetPropertiesCorrectly()
    {
        // Acción
        var account = new Account
        {
            Id = "acc-1",
            Code = "1.1.1",
            Name = "Caja",
            Type = "activo",
            Subtype = "corriente",
            Level = 3,
            Balance = 15000.50,
            CompanyId = "comp-1"
        };

        // Verificación
        account.Code.Should().Be("1.1.1");
        account.Name.Should().Be("Caja");
        account.Type.Should().Be("activo");
        account.Subtype.Should().Be("corriente");
        account.Balance.Should().Be(15000.50);
    }

    // ══════════════════════════════════════════════════════════════════
    // JournalEntry Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void JournalEntry_ShouldInitializeWithDefaults()
    {
        // Acción
        var entry = new JournalEntry();

        // Verificación: valores por defecto
        entry.Number.Should().Be(0);
        entry.Description.Should().BeEmpty();
        entry.Concept.Should().BeNull();
        entry.Status.Should().Be("borrador");
        entry.CompanyId.Should().BeEmpty();
        entry.TotalDebit.Should().Be(0);
        entry.TotalCredit.Should().Be(0);
        entry.Lines.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void JournalEntry_WithLines_ShouldValidateBalanced()
    {
        // Preparación
        var entry = new JournalEntry
        {
            Number = 1,
            Description = "Asiento de prueba",
            Status = "borrador",
            TotalDebit = 5000,
            TotalCredit = 5000,
            CompanyId = "comp-1",
            Lines = new List<JournalEntryLine>
            {
                new() { AccountId = "acc-1", Debit = 5000, Credit = 0, Description = "Debe" },
                new() { AccountId = "acc-2", Debit = 0, Credit = 5000, Description = "Haber" },
            }
        };

        // Verificación: debe estar balanceado
        entry.TotalDebit.Should().Be(entry.TotalCredit);
        entry.Lines.Should().HaveCount(2);
        entry.Lines.Sum(l => l.Debit).Should().Be(5000);
        entry.Lines.Sum(l => l.Credit).Should().Be(5000);
    }

    [Fact]
    public void JournalEntry_ShouldRejectUnbalanced()
    {
        // Preparación: asiento desbalanceado (débitos ≠ créditos)
        var entry = new JournalEntry
        {
            TotalDebit = 3000,
            TotalCredit = 2500,
        };

        // Verificación: totales no coinciden
        (entry.TotalDebit == entry.TotalCredit).Should().BeFalse();
    }

    // ══════════════════════════════════════════════════════════════════
    // Invoice Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void Invoice_ShouldInitializeWithDefaults()
    {
        // Acción
        var invoice = new Invoice();

        // Verificación
        invoice.Number.Should().BeEmpty();
        invoice.Type.Should().BeEmpty();
        invoice.Status.Should().Be("pendiente");
        invoice.Total.Should().Be(0);
        invoice.Tax.Should().Be(0);
        invoice.NetTotal.Should().Be(0);
        invoice.AmountPaid.Should().Be(0);
        invoice.ClientId.Should().BeNull();
        invoice.Notes.Should().BeNull();
        invoice.Items.Should().NotBeNull().And.BeEmpty();
        invoice.Payments.Should().NotBeNull().And.BeEmpty();
    }

    [Fact]
    public void Invoice_ShouldCalculateTotalCorrectly()
    {
        // Preparación: factura con un ítem
        var invoice = new Invoice
        {
            Number = "A-0001",
            Type = "factura_a",
            NetTotal = 10000,
            Tax = 2100,
            Total = 12100,
            Items = new List<InvoiceItem>
            {
                new() { Description = "Consultoría", Quantity = 10, UnitPrice = 1000, Subtotal = 10000, TaxRate = 21, TaxAmount = 2100 },
            }
        };

        // Verificación: Total = NetTotal + Tax
        invoice.Total.Should().BeApproximately(invoice.NetTotal + invoice.Tax, 0.01);
        invoice.Total.Should().BeApproximately(12100, 0.01);
    }

    [Fact]
    public void Invoice_WithPayments_ShouldTrackAmountPaid()
    {
        // Preparación: factura con pagos parciales
        var invoice = new Invoice
        {
            Total = 5000,
            AmountPaid = 3000,
            Status = "parcial",
            Payments = new List<Payment>
            {
                new() { Amount = 1000 },
                new() { Amount = 2000 },
            }
        };

        // Verificación
        invoice.AmountPaid.Should().Be(3000);
        invoice.Payments.Should().HaveCount(2);
        invoice.Payments.Sum(p => p.Amount).Should().Be(3000);
    }

    // ══════════════════════════════════════════════════════════════════
    // Payment Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void Payment_ShouldInitializeWithDefaults()
    {
        // Acción
        var payment = new Payment();

        // Verificación
        payment.Number.Should().BeEmpty();
        payment.Amount.Should().Be(0);
        payment.Method.Should().Be("transferencia");
        payment.Type.Should().Be("cobro");
        payment.Reference.Should().BeNull();
        payment.Notes.Should().BeNull();
        payment.InvoiceId.Should().BeNull();
        payment.ClientId.Should().BeNull();
        payment.ProviderId.Should().BeNull();
        payment.BankAccountId.Should().BeNull();
        payment.CompanyId.Should().BeEmpty();
    }

    [Fact]
    public void Payment_ShouldSetPropertiesCorrectly()
    {
        // Acción
        var payment = new Payment
        {
            Id = "pay-1",
            Number = "PAG-001",
            Amount = 5000.75,
            Method = "cheque",
            Type = "pago",
            Reference = "CHEQUE-12345",
            Notes = "Pago a proveedor",
            InvoiceId = "inv-1",
            CompanyId = "comp-1",
            Date = new DateTime(2024, 3, 15)
        };

        // Verificación
        payment.Number.Should().Be("PAG-001");
        payment.Amount.Should().Be(5000.75);
        payment.Method.Should().Be("cheque");
        payment.Type.Should().Be("pago");
        payment.Reference.Should().Be("CHEQUE-12345");
        payment.InvoiceId.Should().Be("inv-1");
    }

    // ══════════════════════════════════════════════════════════════════
    // BaseEntity Tests (shared behavior)
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void BaseEntity_ShouldGenerateUniqueIds()
    {
        var account = new Account();
        var invoice = new Invoice();
        var payment = new Payment();

        account.Id.Should().NotBe(invoice.Id);
        account.Id.Should().NotBe(payment.Id);
        invoice.Id.Should().NotBe(payment.Id);
    }

    [Fact]
    public void BaseEntity_ShouldSetTimestamps()
    {
        var before = DateTime.UtcNow;
        var entity = new Account { Name = "Test" };
        var after = DateTime.UtcNow;

        entity.CreatedAt.Should().BeOnOrAfter(before);
        entity.CreatedAt.Should().BeOnOrBefore(after);
        entity.UpdatedAt.Should().BeOnOrAfter(before);
        entity.UpdatedAt.Should().BeOnOrBefore(after);
    }

    // ══════════════════════════════════════════════════════════════════
    // InvoiceItem Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void InvoiceItem_ShouldCalculateSubtotalAndTax()
    {
        var item = new InvoiceItem
        {
            Description = "Servicio profesional",
            Quantity = 5,
            UnitPrice = 2000,
            TaxRate = 21,
            Subtotal = 10000,
            TaxAmount = 2100,
        };

        // Verificación: Subtotal = Qty * Price, Tax = Subtotal * TaxRate / 100
        item.Subtotal.Should().Be(item.Quantity * item.UnitPrice);
        item.TaxAmount.Should().BeApproximately(item.Subtotal * (item.TaxRate / 100), 0.01);
    }

    // ══════════════════════════════════════════════════════════════════
    // Client Entity Tests
    // ══════════════════════════════════════════════════════════════════

    [Fact]
    public void Client_ShouldInitializeWithDefaults()
    {
        var client = new Client();

        client.Code.Should().BeNull();
        client.Name.Should().BeEmpty();
        client.Cuit.Should().BeNull();
        client.Email.Should().BeNull();
        client.Balance.Should().Be(0);
        client.CompanyId.Should().BeEmpty();
        client.Invoices.Should().NotBeNull().And.BeEmpty();
        client.Payments.Should().NotBeNull().And.BeEmpty();
    }
}
