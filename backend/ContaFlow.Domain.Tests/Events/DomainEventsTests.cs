using ContaFlow.Domain.Events;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Domain.Tests.Events;

public class DomainEventsTests
{
    [Fact]
    public void JournalEntryCreatedEvent_ShouldInitializeWithDefaults()
    {
        var evt = new JournalEntryCreatedEvent();

        evt.EventId.Should().NotBeNullOrWhiteSpace();
        evt.EventType.Should().NotBeNullOrWhiteSpace();
        evt.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        evt.Version.Should().Be("1.0");
        evt.Source.Should().Be("ContaFlow.API");
    }

    [Fact]
    public void JournalEntryConfirmedEvent_ShouldContainAffectedAccounts()
    {
        var evt = new JournalEntryConfirmedEvent
        {
            EntryId = "entry-123",
            EntryNumber = 42,
            CompanyId = "company-1",
            UserId = "user-1",
            AffectedAccounts = new List<AccountBalanceUpdate>
            {
                new() { AccountId = "acc-1", AccountCode = "1.1.1", AccountName = "Caja", Debit = 1000, Credit = 0, NewBalance = 15000 },
                new() { AccountId = "acc-2", AccountCode = "1.1.2", AccountName = "Banco", Debit = 0, Credit = 1000, NewBalance = 5000 },
            }
        };

        evt.AffectedAccounts.Should().HaveCount(2);
        evt.EntryNumber.Should().Be(42);
        evt.AffectedAccounts[0].AccountName.Should().Be("Caja");
        evt.AffectedAccounts[1].NewBalance.Should().Be(5000);
    }

    [Fact]
    public void InvoiceCreatedEvent_ShouldSetCorrectTotals()
    {
        var evt = new InvoiceCreatedEvent
        {
            InvoiceId = "inv-1",
            InvoiceNumber = "A-0001",
            Type = "factura_a",
            Total = 12100,
            Tax = 2100,
            NetTotal = 10000,
            CompanyId = "comp-1"
        };

        evt.Total.Should().Be(12100);
        evt.Tax.Should().Be(2100);
        evt.NetTotal.Should().Be(10000);
    }

    [Fact]
    public void DomainEvent_ShouldGenerateUniqueEventIds()
    {
        var evt1 = new JournalEntryCreatedEvent();
        var evt2 = new InvoiceCreatedEvent();

        evt1.EventId.Should().NotBe(evt2.EventId);
    }
}
