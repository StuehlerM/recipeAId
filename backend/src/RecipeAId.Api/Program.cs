using LiteDB;
using RecipeAId.Api.Middleware;
using RecipeAId.Api.OcrServices;
using RecipeAId.Api.OcrSessions;
using RecipeAId.Api.ParserServices;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using RecipeAId.Data.Repositories;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog — consistent plain-text format in all environments: [LEVEL] message
builder.Host.UseSerilog((ctx, config) =>
{
    config.WriteTo.Console(outputTemplate: "[{Level:u3}] {Message:lj}{NewLine}{Exception}");
    config.ReadFrom.Configuration(ctx.Configuration);
});

// Database — LiteDB (single file, no migrations)
var dbPath = builder.Configuration.GetConnectionString("DefaultConnection") ?? "recipeaid.db";
builder.Services.AddSingleton<ILiteDatabase>(_ => new LiteDatabase(dbPath));

// Repositories
builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
builder.Services.AddScoped<IIngredientRepository, IngredientRepository>();
builder.Services.AddScoped<IImageStorage, LiteDbImageStorage>();

// Services
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IRecipeImageService, RecipeImageService>();
builder.Services.AddScoped<IIngredientService, IngredientService>();
builder.Services.AddScoped<IRecipeMatchingService, RecipeMatchingService>();
// OCR (Mistral API)
var ocrApiKey = builder.Configuration["MISTRAL_OCR_API_KEY"]
    ?? builder.Configuration["INGREDIENT_PARSER_API_KEY"]
    ?? string.Empty;
var mistralBaseUrl = builder.Configuration["MISTRAL_BASE_URL"] ?? "https://api.mistral.ai";
builder.Services.AddHttpClient("MistralOcrApi", c =>
{
    c.BaseAddress = new Uri(mistralBaseUrl);
    c.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<IOcrService>(sp =>
{
    var client = sp.GetRequiredService<IHttpClientFactory>().CreateClient("MistralOcrApi");
    var logger = sp.GetRequiredService<ILogger<MistralOcrService>>();
    return new MistralOcrService(client, ocrApiKey, logger);
});
builder.Services.AddScoped<IOcrTextSanitizer, OcrTextSanitizer>();
builder.Services.AddScoped<IOcrParser, OcrParserService>();

// Ingredient parser — Mistral AI public API
// API key is read from INGREDIENT_PARSER_API_KEY at startup; empty = parsing unavailable.
// Base URL is overridable via MISTRAL_BASE_URL for integration-test mocking.
var ingredientParserApiKey = builder.Configuration["INGREDIENT_PARSER_API_KEY"] ?? string.Empty;
builder.Services.AddHttpClient("MistralApi", c =>
{
    c.BaseAddress = new Uri(mistralBaseUrl);
    c.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<IIngredientParserService>(sp =>
{
    var factory = sp.GetRequiredService<IHttpClientFactory>();
    var logger  = sp.GetRequiredService<ILogger<PublicLlmIngredientParserService>>();
    return new PublicLlmIngredientParserService(factory.CreateClient("MistralApi"), ingredientParserApiKey, logger);
});

// OCR session store (SSE async pipeline)
builder.Services.AddSingleton<OcrSessionStore>();
builder.Services.AddHostedService<OcrSessionCleanupService>();

// Controllers + OpenAPI
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS — origins configurable via Cors:AllowedOrigins (env: Cors__AllowedOrigins__0, etc.)
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];
builder.Services.AddCors(options =>
    options.AddPolicy("DevPolicy", policy =>
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()));

var app = builder.Build();

// Eagerly open the database so a corrupt/missing file crashes the container at startup
// (visible in logs) rather than silently failing on the first real request.
app.Services.GetRequiredService<ILiteDatabase>();

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("DevPolicy");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options => options.Title = "RecipeAId API");
    app.UseHttpsRedirection();
}
app.MapControllers();
app.Run();
