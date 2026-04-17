using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BCryptCrypter = BCrypt.Net.BCrypt;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ContaFlow.Application.DTOs.Auth;
using ContaFlow.Application.DTOs.Common;
using ContaFlow.Application.Events;
using ContaFlow.Application.Interfaces;
using ContaFlow.Domain.Entities;
using ContaFlow.Domain.Events;
using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Application.Services;

/// <summary>
/// Implementación del servicio de autenticación con JWT.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly IEventDispatcher _eventDispatcher;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration, IEventDispatcher eventDispatcher, ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _eventDispatcher = eventDispatcher;
        _logger = logger;
    }

    public async Task<ApiResponse<LoginResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = (await _unitOfWork.Users.GetAllAsync(cancellationToken))
            .FirstOrDefault(u => u.Email == request.Email);

        if (user == null)
            return ApiResponse<LoginResponse>.Fail("Credenciales inválidas", "AUTH_INVALID");

        if (!VerifyPassword(request.Password, user.Password))
            return ApiResponse<LoginResponse>.Fail("Credenciales inválidas", "AUTH_INVALID");

        var company = await _unitOfWork.Companies.GetByIdAsync(user.CompanyId, cancellationToken);
        if (company == null)
            return ApiResponse<LoginResponse>.Fail("Empresa no encontrada", "COMPANY_NOT_FOUND");

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var expiresInSeconds = int.Parse(_configuration["Jwt:ExpiresInMinutes"] ?? "480") * 60;

        var response = new LoginResponse
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresIn = expiresInSeconds,
            RefreshToken = refreshToken,
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                CompanyId = company.Id,
                CompanyName = company.Name
            }
        };

        return ApiResponse<LoginResponse>.Ok(response, "Inicio de sesión exitoso");
    }

    public async Task<ApiResponse<LoginResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        // Verificar si el email ya existe
        var existingUsers = await _unitOfWork.Users.GetAllAsync(cancellationToken);
        if (existingUsers.Any(u => u.Email == request.Email))
            return ApiResponse<LoginResponse>.Fail("El email ya está registrado", "EMAIL_EXISTS");

        // Crear la empresa
        var company = new Company
        {
            Name = request.CompanyName,
            Cuit = request.Cuit,
            Plan = "basico"
        };
        await _unitOfWork.Companies.AddAsync(company, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Crear el usuario administrador
        var user = new User
        {
            Email = request.Email,
            Password = HashPassword(request.Password),
            Name = request.Name,
            Role = "admin",
            CompanyId = company.Id
        };
        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Publicar evento de usuario creado
        try
        {
            var userCreatedEvent = new UserCreatedEvent
            {
                EventType = nameof(UserCreatedEvent),
                CompanyId = company.Id,
                UserId = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role
            };
            await _eventDispatcher.DispatchAsync(userCreatedEvent, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch UserCreatedEvent for user {UserId}", user.Id);
        }

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var expiresInSeconds = int.Parse(_configuration["Jwt:ExpiresInMinutes"] ?? "480") * 60;

        var response = new LoginResponse
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresIn = expiresInSeconds,
            RefreshToken = refreshToken,
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                CompanyId = company.Id,
                CompanyName = company.Name
            }
        };

        return ApiResponse<LoginResponse>.Ok(response, "Registro exitoso");
    }

    public async Task<ApiResponse<LoginResponse>> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        // Validar refresh token existe
        var user = (await _unitOfWork.Users.GetAllAsync(cancellationToken))
            .FirstOrDefault(u => u.RefreshToken == refreshToken);

        if (user == null)
            return ApiResponse<LoginResponse>.Fail("Token de refresh inválido", "INVALID_REFRESH_TOKEN");

        if (user.RefreshTokenExpiry < DateTime.UtcNow)
            return ApiResponse<LoginResponse>.Fail("Token de refresh expirado", "REFRESH_TOKEN_EXPIRED");

        var company = await _unitOfWork.Companies.GetByIdAsync(user.CompanyId, cancellationToken);
        if (company == null)
            return ApiResponse<LoginResponse>.Fail("Empresa no encontrada", "COMPANY_NOT_FOUND");

        var newToken = GenerateJwtToken(user);
        var newRefreshToken = GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var expiresInSeconds = int.Parse(_configuration["Jwt:ExpiresInMinutes"] ?? "480") * 60;

        var response = new LoginResponse
        {
            Token = newToken,
            TokenType = "Bearer",
            ExpiresIn = expiresInSeconds,
            RefreshToken = newRefreshToken,
            User = new UserInfo
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                Role = user.Role,
                CompanyId = company.Id,
                CompanyName = company.Name
            }
        };

        return ApiResponse<LoginResponse>.Ok(response, "Token refresh exitoso");
    }

    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _configuration["Jwt:Key"] ?? "contaflow_secret_key_minimum_32_chars!!"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("CompanyId", user.CompanyId)
        };

        var expires = int.Parse(_configuration["Jwt:ExpiresInMinutes"] ?? "480");

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "ContaFlow.API",
            audience: _configuration["Jwt:Audience"] ?? "ContaFlow.Client",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expires),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        return BCryptCrypter.HashPassword(password);
    }

    private static bool VerifyPassword(string password, string hashedPassword)
    {
        return BCryptCrypter.Verify(password, hashedPassword);
    }

    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}
