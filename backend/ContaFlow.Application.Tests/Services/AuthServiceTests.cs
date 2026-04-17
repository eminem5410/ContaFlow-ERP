using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using BCryptCrypter = BCrypt.Net.BCrypt;
using ContaFlow.Application.DTOs.Auth;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Application.Services;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;
using FluentAssertions;

namespace ContaFlow.Application.Tests.Services;

public class AuthServiceTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly IRepository<User> _userRepo = Substitute.For<IRepository<User>>();
    private readonly IRepository<Company> _companyRepo = Substitute.For<IRepository<Company>>();
    private readonly IConfiguration _configuration;
    private readonly IEventDispatcher _eventDispatcher = Substitute.For<IEventDispatcher>();
    private readonly ILogger<AuthService> _logger = Substitute.For<ILogger<AuthService>>();
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        _unitOfWork.Users.Returns(_userRepo);
        _unitOfWork.Companies.Returns(_companyRepo);

        // Configuración JWT mínima para tests
        var inMemorySettings = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "contaflow_test_secret_key_minimum_32_characters!!",
            ["Jwt:Issuer"] = "ContaFlow.API",
            ["Jwt:Audience"] = "ContaFlow.Client",
            ["Jwt:ExpiresInMinutes"] = "60",
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _service = new AuthService(_unitOfWork, _configuration, _eventDispatcher, _logger);
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ShouldReturnToken()
    {
        // Preparación: usuario existente con contraseña hasheada
        var hashedPassword = BCryptCrypter.HashPassword("Password123!");
        var user = new User
        {
            Id = "user-1",
            Email = "admin@contaflow.com",
            Password = hashedPassword,
            Name = "Admin User",
            Role = "admin",
            CompanyId = "comp-1"
        };

        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User> { user });
        _companyRepo.GetByIdAsync("comp-1", Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "comp-1", Name = "Test Company" });

        var request = new LoginRequest
        {
            Email = "admin@contaflow.com",
            Password = "Password123!"
        };

        // Acción: login con credenciales válidas
        var result = await _service.LoginAsync(request);

        // Verificación
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Token.Should().NotBeNullOrWhiteSpace();
        result.Data.TokenType.Should().Be("Bearer");
        result.Data.ExpiresIn.Should().Be(60 * 60); // 60 minutos en segundos
        result.Data.RefreshToken.Should().NotBeNullOrWhiteSpace();
        result.Data.User.Email.Should().Be("admin@contaflow.com");
        result.Data.User.Name.Should().Be("Admin User");
        result.Data.User.Role.Should().Be("admin");
        result.Data.User.CompanyName.Should().Be("Test Company");

        // Verificar que el token JWT contiene los claims correctos
        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(result.Data.Token);
        token.Claims.First(c => c.Type == ClaimTypes.Email).Value.Should().Be("admin@contaflow.com");
        token.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be("admin");
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ShouldReturnError()
    {
        // Preparación: no existe usuario con ese email
        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User>());

        var request = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "Password123!"
        };

        // Acción
        var result = await _service.LoginAsync(request);

        // Verificación: debe fallar con AUTH_INVALID
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("AUTH_INVALID");
        result.Message.Should().Contain("inválidas");
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ShouldReturnError()
    {
        // Preparación: usuario existe pero la contraseña no coincide
        var user = new User
        {
            Id = "user-1",
            Email = "admin@contaflow.com",
            Password = BCryptCrypter.HashPassword("CorrectPassword!"),
            Name = "Admin User",
            Role = "admin",
            CompanyId = "comp-1"
        };

        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User> { user });

        var request = new LoginRequest
        {
            Email = "admin@contaflow.com",
            Password = "WrongPassword!"
        };

        // Acción
        var result = await _service.LoginAsync(request);

        // Verificación: debe fallar con AUTH_INVALID
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("AUTH_INVALID");
    }

    [Fact]
    public async Task LoginAsync_WithNonexistentCompany_ShouldReturnError()
    {
        // Preparación: usuario existe pero empresa fue eliminada
        var user = new User
        {
            Id = "user-1",
            Email = "admin@contaflow.com",
            Password = BCryptCrypter.HashPassword("Password123!"),
            Name = "Admin User",
            Role = "admin",
            CompanyId = "deleted-comp"
        };

        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User> { user });
        _companyRepo.GetByIdAsync("deleted-comp", Arg.Any<CancellationToken>()).Returns((Company?)null);

        var request = new LoginRequest
        {
            Email = "admin@contaflow.com",
            Password = "Password123!"
        };

        // Acción
        var result = await _service.LoginAsync(request);

        // Verificación: debe fallar con COMPANY_NOT_FOUND
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("COMPANY_NOT_FOUND");
    }

    [Fact]
    public async Task RegisterAsync_ShouldCreateUserAndCompany()
    {
        // Preparación: no existen usuarios previos
        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User>());

        var request = new RegisterRequest
        {
            Name = "New User",
            Email = "new@contaflow.com",
            Password = "SecurePass123!",
            CompanyName = "New Company",
            Cuit = "20-12345678-9"
        };

        // Acción: registrar nuevo usuario
        var result = await _service.RegisterAsync(request);

        // Verificación: registro exitoso
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Token.Should().NotBeNullOrWhiteSpace();
        result.Data.User.Name.Should().Be("New User");
        result.Data.User.Email.Should().Be("new@contaflow.com");
        result.Data.User.Role.Should().Be("admin");

        // Verificar que se crearon la empresa y el usuario
        await _companyRepo.Received(1).AddAsync(Arg.Any<Company>(), Arg.Any<CancellationToken>());
        await _userRepo.Received(2).AddAsync(Arg.Any<User>(), Arg.Any<CancellationToken>());
        // Se llama dos veces: una para crear el usuario y otra para actualizar con refresh token
    }

    [Fact]
    public async Task RegisterAsync_WithDuplicateEmail_ShouldFail()
    {
        // Preparación: ya existe un usuario con ese email
        var existingUser = new User
        {
            Id = "existing-user",
            Email = "existing@contaflow.com",
            Password = BCryptCrypter.HashPassword("Password123!"),
            Name = "Existing User",
            Role = "admin",
            CompanyId = "comp-1"
        };

        _userRepo.GetAllAsync(Arg.Any<CancellationToken>()).Returns(new List<User> { existingUser });

        var request = new RegisterRequest
        {
            Name = "Another User",
            Email = "existing@contaflow.com",
            Password = "SecurePass123!",
            CompanyName = "Another Company"
        };

        // Acción: intentar registrar con email duplicado
        var result = await _service.RegisterAsync(request);

        // Verificación: debe fallar con EMAIL_EXISTS
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("EMAIL_EXISTS");
        result.Message.Should().Contain("email");
    }
}
