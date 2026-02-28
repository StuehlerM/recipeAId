using Microsoft.AspNetCore.Mvc;

namespace RecipeAId.Api.Middleware;

public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.ContentType = "application/problem+json";
            context.Response.StatusCode  = StatusCodes.Status500InternalServerError;

            var isDev = context.RequestServices
                .GetRequiredService<IHostEnvironment>()
                .IsDevelopment();

            var problem = new ProblemDetails
            {
                Status = 500,
                Title  = "An unexpected error occurred.",
                Detail = isDev ? ex.Message : null,
            };

            await context.Response.WriteAsJsonAsync(problem);
        }
    }
}
