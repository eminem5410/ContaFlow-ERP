namespace ContaFlow.Application.DTOs.Common;

/// <summary>
/// Wrapper estándar para todas las respuestas de la API.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Message { get; set; }
    public string? ErrorCode { get; set; }
    public List<string> Errors { get; set; } = new();

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public static ApiResponse<T> Fail(string message, string? errorCode = null) => new()
    {
        Success = false,
        Message = message,
        ErrorCode = errorCode
    };

    public static ApiResponse<T> Fail(List<string> errors, string? errorCode = null) => new()
    {
        Success = false,
        Errors = errors,
        ErrorCode = errorCode
    };
}
