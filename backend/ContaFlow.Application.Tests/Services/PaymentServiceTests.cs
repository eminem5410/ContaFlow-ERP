using ContaFlow.Application.DTOs.Payments;
using ContaFlow.Application.DTOs.Common;
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

public class PaymentServiceTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRepository<Payment> _paymentRepo = Substitute.For<IRepository<Payment>>();
    private readonly IRepository<Invoice> _invoiceRepo = Substitute.For<IRepository<Invoice>>();
    private readonly IEventDispatcher _eventDispatcher = Substitute.For<IEventDispatcher>();
    private readonly ILogger<PaymentService> _logger = Substitute.For<ILogger<PaymentService>>();
    private readonly PaymentService _service;

    public PaymentServiceTests()
    {
        _unitOfWork.Payments.Returns(_paymentRepo);
        _unitOfWork.Invoices.Returns(_invoiceRepo);
        _service = new PaymentService(_unitOfWork, _eventDispatcher, _logger);
    }

    [Fact]
    public async Task CreateAsync_WithAmountExceedingBalance_ShouldFail()
    {
        // Preparación: factura con saldo pendiente de 800 (total 1000, pagado 200)
        _invoiceRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new Invoice
            {
                Id = "inv-1",
                Total = 1000,
                AmountPaid = 200,
                CompanyId = "comp-1"
            });

        var request = new CreatePaymentRequest
        {
            Number = "PAG-001",
            Amount = 900,
            InvoiceId = "inv-1",
            Type = "cobro",
            Method = "transferencia",
            Date = DateTime.Today,
        };

        // Acción: intentar registrar pago por 900 (supera el saldo de 800)
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: debe fallar con AMOUNT_EXCEEDS_BALANCE
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("AMOUNT_EXCEEDS_BALANCE");
    }

    [Fact]
    public async Task CreateAsync_WithValidAmount_ShouldSucceed()
    {
        // Preparación: factura con saldo pendiente de 800 (total 1000, pagado 200)
        _invoiceRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new Invoice
            {
                Id = "inv-1",
                Total = 1000,
                AmountPaid = 200,
                CompanyId = "comp-1"
            });

        var request = new CreatePaymentRequest
        {
            Number = "PAG-002",
            Amount = 300,
            InvoiceId = "inv-1",
            Type = "cobro",
            Method = "transferencia",
            Date = DateTime.Today,
        };

        // Acción: registrar pago de 300 (dentro del saldo disponible)
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: el pago debe registrarse exitosamente
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_WithInvoice_ShouldLinkPaymentToInvoice()
    {
        // Preparación: factura pendiente de $5000 sin pagos previos
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 5000,
            AmountPaid = 0,
            Status = "pendiente",
            CompanyId = "comp-1"
        };
        _invoiceRepo.GetByIdAsync("inv-1", Arg.Any<CancellationToken>()).Returns(invoice);

        var request = new CreatePaymentRequest
        {
            Number = "PAG-003",
            Amount = 2000,
            InvoiceId = "inv-1",
            Type = "cobro",
            Method = "transferencia",
            Date = DateTime.Today,
        };

        // Acción: registrar pago parcial
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: pago registrado y factura actualizada
        result.Success.Should().BeTrue();
        invoice.AmountPaid.Should().Be(2000);
        invoice.Status.Should().Be("parcial");
        await _invoiceRepo.Received().UpdateAsync(invoice, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_FullPayment_ShouldMarkInvoiceAsPaid()
    {
        // Preparación: factura con saldo pendiente exacto de $3000
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 3000,
            AmountPaid = 0,
            Status = "pendiente",
            CompanyId = "comp-1"
        };
        _invoiceRepo.GetByIdAsync("inv-1", Arg.Any<CancellationToken>()).Returns(invoice);

        var request = new CreatePaymentRequest
        {
            Number = "PAG-004",
            Amount = 3000,
            InvoiceId = "inv-1",
            Type = "cobro",
            Method = "efectivo",
            Date = DateTime.Today,
        };

        // Acción: registrar pago completo
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: factura marcada como pagada
        result.Success.Should().BeTrue();
        invoice.AmountPaid.Should().Be(3000);
        invoice.Status.Should().Be("pagada");
    }

    [Fact]
    public async Task CreateAsync_WithNonexistentInvoice_ShouldFail()
    {
        // Preparación: factura no existe
        _invoiceRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns((Invoice?)null);

        var request = new CreatePaymentRequest
        {
            Number = "PAG-005",
            Amount = 1000,
            InvoiceId = "nonexistent",
            Type = "cobro",
            Method = "transferencia",
            Date = DateTime.Today,
        };

        // Acción
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: debe fallar con INVOICE_NOT_FOUND
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("INVOICE_NOT_FOUND");
    }

    [Fact]
    public async Task DeleteAsync_WithPartialPayment_ShouldReverseInvoiceStatus()
    {
        // Preparación: pago de $1000 vinculado a factura parcialmente pagada
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 3000,
            AmountPaid = 2000,
            Status = "parcial",
            CompanyId = "comp-1"
        };

        var payment = new Payment
        {
            Id = "pay-1",
            Number = "PAG-006",
            Amount = 1000,
            InvoiceId = "inv-1",
            CompanyId = "comp-1"
        };

        _paymentRepo.GetByIdAsync("pay-1", Arg.Any<CancellationToken>()).Returns(payment);
        _invoiceRepo.GetByIdAsync("inv-1", Arg.Any<CancellationToken>()).Returns(invoice);

        // Acción: eliminar pago
        var result = await _service.DeleteAsync("comp-1", "pay-1");

        // Verificación: pago eliminado, factura revertida a parcial con monto ajustado
        result.Success.Should().BeTrue();
        invoice.AmountPaid.Should().Be(1000); // 2000 - 1000
        invoice.Status.Should().Be("parcial");
        await _paymentRepo.Received(1).DeleteAsync(payment, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_LastPayment_ShouldResetInvoiceToPending()
    {
        // Preparación: único pago de factura
        var invoice = new Invoice
        {
            Id = "inv-1",
            Total = 2000,
            AmountPaid = 2000,
            Status = "pagada",
            CompanyId = "comp-1"
        };

        var payment = new Payment
        {
            Id = "pay-1",
            Number = "PAG-007",
            Amount = 2000,
            InvoiceId = "inv-1",
            CompanyId = "comp-1"
        };

        _paymentRepo.GetByIdAsync("pay-1", Arg.Any<CancellationToken>()).Returns(payment);
        _invoiceRepo.GetByIdAsync("inv-1", Arg.Any<CancellationToken>()).Returns(invoice);

        // Acción: eliminar único pago
        var result = await _service.DeleteAsync("comp-1", "pay-1");

        // Verificación: factura vuelve a pendiente
        result.Success.Should().BeTrue();
        invoice.AmountPaid.Should().Be(0);
        invoice.Status.Should().Be("pendiente");
    }
}
