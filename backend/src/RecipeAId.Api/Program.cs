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
// OCR
var ocrBaseUrl = builder.Configuration["OcrService:BaseUrl"] ?? "http://localhost:8001";
builder.Services.AddHttpClient("OcrService", c =>
{
    c.BaseAddress = new Uri(ocrBaseUrl);
    c.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<IOcrService, PythonOcrService>();
builder.Services.AddScoped<IOcrParser, OcrParserService>();

// Ingredient parser (LLM sidecar)
var parserBaseUrl = builder.Configuration["IngredientParser:BaseUrl"] ?? "http://localhost:8002";
builder.Services.AddHttpClient("IngredientParser", c =>
{
    c.BaseAddress = new Uri(parserBaseUrl);
    c.Timeout = TimeSpan.FromSeconds(200);
});
builder.Services.AddScoped<IIngredientParserService, LlmIngredientParserService>();

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
