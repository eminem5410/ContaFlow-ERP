// Re-export of ICacheService from Domain layer for backward compatibility.
// The canonical definition lives in ContaFlow.Domain.Interfaces.
// This file exists so that existing using statements referencing
// ContaFlow.Infrastructure.Caching.ICacheService continue to compile.

using ContaFlow.Domain.Interfaces;

namespace ContaFlow.Infrastructure.Caching;

/// <summary>
/// Re-export of ICacheService from Domain layer for backward compatibility.
/// New code should reference ContaFlow.Domain.Interfaces.ICacheService directly.
/// </summary>
public interface ICacheService : Domain.Interfaces.ICacheService;
