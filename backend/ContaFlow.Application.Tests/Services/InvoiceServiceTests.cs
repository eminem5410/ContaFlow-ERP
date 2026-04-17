using ContaFlow.Application.DTOs.Invoices;
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

public class InvoiceServiceTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRepository<Invoice> _invoiceRepo = Substitute.For<IRepository<Invoice>>();
    private readonly IRepository<Client> _clientRepo = Substitute.For<IRepository<Client>>();
    private readonly IEventDispatcher _eventDispatcher = Substitute.For<IEventDispatcher>();
    private readonly ILogger<InvoiceService> _logger = Substitute.For<ILogger<InvoiceService>>();
    private readonly InvoiceService _service;

    public InvoiceServiceTests()
    {
        _unitOfWork.Invoices.Returns(_invoiceRepo);
        _unitOfWork.Clients.Returns(_clientRepo);
        _service = new InvoiceService(_unitOfWork, _eventDispatcher, _logger);
    }

    [Fact]
    public async Task CreateAsync_ShouldCalculateTotalsCorrectly()
    {
        // Preparación: cliente válido existente
        _clientRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new Client { Id = "cli-1", Name = "Test Client", CompanyId = "comp-1" });

        var request = new CreateInvoiceRequest
        {
            Number = "A-0001",
            Type = "factura_a",
            Date = DateTime.Today,
            ClientId = "cli-1",
            Items = new List<CreateInvoiceItemRequest>
            {
                new() { Description = "Item 1", Quantity = 2, UnitPrice = 1000, TaxRate = 21 },
                new() { Description = "Item 2", Quantity = 1, UnitPrice = 500, TaxRate = 10.5 },
            }
        };

        // Acción: crear factura con dos ítems
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: los totales deben calcularse correctamente
        // Ítem 1: 2 * 1000 = 2000, IVA = 420
        // Ítem 2: 1 * 500 = 500, IVA = 52.50
        // Neto: 2500, IVA: 472.50, Total: 2972.50
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.NetTotal.Should().BeApproximately(2500, 0.01);
        result.Data!.Total.Should().BeApproximately(2972.50, 0.01);
    }

    [Fact]
    public async Task CreateAsync_WithInvalidClient_ShouldFail()
    {
        // Preparación: cliente no existe
        _clientRepo.GetByIdAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns((Client?)null);

        var request = new CreateInvoiceRequest
        {
            Number = "A-0001",
            Type = "factura_a",
            Date = DateTime.Today,
            ClientId = "nonexistent",
            Items = new List<CreateInvoiceItemRequest> { new() { Description = "Item", Quantity = 1, UnitPrice = 100, TaxRate = 21 } }
        };

        // Acción: intentar crear factura con cliente inexistente
        var result = await _service.CreateAsync("comp-1", request);

        // Verificación: debe fallar con CLIENT_NOT_FOUND
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("CLIENT_NOT_FOUND");
    }

    [Fact]
    public async Task GetAllAsync_ShouldFilterByStatusAndType()
    {
        // Preparación: facturas con estados distintos
        var invoices = new List<Invoice>
        {
            new() { Id = "1", Number = "A-0001", Type = "factura_a", Status = "pendiente", CompanyId = "comp-1", Total = 1000, NetTotal = 826.45, Tax = 173.55, AmountPaid = 0 },
            new() { Id = "2", Number = "B-0001", Type = "factura_b", Status = "pagada", CompanyId = "comp-1", Total = 2000, NetTotal = 1652.89, Tax = 347.11, AmountPaid = 2000 },
        };
        _invoiceRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(invoices);

        // Acción: filtrar facturas por estado "pendiente"
        var result = await _service.GetAllAsync("comp-1", status: "pendiente");

        // Verificación: solo debe retornar la factura pendiente
        result.Data!.Items.Should().HaveCount(1);
        result.Data!.Items[0].Number.Should().Be("A-0001");
    }
}
