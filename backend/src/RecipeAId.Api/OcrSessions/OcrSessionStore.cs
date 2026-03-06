using System.Collections.Concurrent;
using RecipeAId.Core.DTOs;

namespace RecipeAId.Api.OcrSessions;

/// <summary>
/// Singleton in-memory store for active OCR sessions.
/// Each session holds a TaskCompletionSource that the SSE endpoint awaits
/// while the LLM background task runs.
/// </summary>
public sealed class OcrSessionStore
{
    private record Session(
        TaskCompletionSource<IngredientParseResult> Tcs,
        DateTimeOffset CreatedAt);

    private readonly ConcurrentDictionary<string, Session> _sessions = new();

    /// <summary>Creates a new session and returns its unique ID.</summary>
    public string CreateSession()
    {
        var id = Guid.NewGuid().ToString("N");
        _sessions[id] = new Session(
            new TaskCompletionSource<IngredientParseResult>(),
            DateTimeOffset.UtcNow);
        return id;
    }

    /// <summary>Returns the TCS for the given session, or null if it does not exist.</summary>
    public TaskCompletionSource<IngredientParseResult>? TryGetTcs(string id)
        => _sessions.TryGetValue(id, out var s) ? s.Tcs : null;

    /// <summary>Signals the session TCS with the LLM result.</summary>
    public void Complete(string id, IngredientParseResult result)
    {
        if (_sessions.TryGetValue(id, out var s))
            s.Tcs.TrySetResult(result);
    }

    /// <summary>Removes the session from the store.</summary>
    public void Remove(string id) => _sessions.TryRemove(id, out _);

    /// <summary>Cancels and removes sessions older than <paramref name="maxAge"/>.</summary>
    public void CleanupStale(TimeSpan maxAge)
    {
        var cutoff = DateTimeOffset.UtcNow - maxAge;
        foreach (var (key, session) in _sessions)
        {
            if (session.CreatedAt < cutoff)
            {
                session.Tcs.TrySetCanceled();
                _sessions.TryRemove(key, out _);
            }
        }
    }
}
