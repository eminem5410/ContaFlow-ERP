using ContaFlow.Domain.Events;
using Xunit;

namespace ContaFlow.Domain.Tests.Events;

public class KafkaTopicsTests
{
    [Theory]
    [InlineData("journal-entry.created", KafkaTopics.JournalEntries)]
    [InlineData("journal-entry.confirmed", KafkaTopics.JournalEntries)]
    [InlineData("journal-entry.deleted", KafkaTopics.JournalEntries)]
    [InlineData("invoice.created", KafkaTopics.Invoices)]
    [InlineData("invoice.updated", KafkaTopics.Invoices)]
    [InlineData("invoice.status-changed", KafkaTopics.Invoices)]
    [InlineData("invoice.deleted", KafkaTopics.Invoices)]
    [InlineData("payment.created", KafkaTopics.Payments)]
    [InlineData("payment.deleted", KafkaTopics.Payments)]
    [InlineData("user.created", KafkaTopics.Users)]
    [InlineData("user.updated", KafkaTopics.Users)]
    [InlineData("user.role-changed", KafkaTopics.Users)]
    [InlineData("role.changed", KafkaTopics.Users)]
    [InlineData("account.balance-changed", KafkaTopics.Accounts)]
    [InlineData("unknown.event", KafkaTopics.Audit)]
    [InlineData("random-stuff", KafkaTopics.Audit)]
    public void GetTopicForEvent_ShouldRouteCorrectly(string eventType, string expectedTopic)
    {
        var topic = KafkaTopics.GetTopicForEvent(eventType);
        Assert.Equal(expectedTopic, topic);
    }
}
