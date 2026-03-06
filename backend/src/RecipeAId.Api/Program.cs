using Microsoft.EntityFrameworkCore;
using RecipeAId.Api.Middleware;
using RecipeAId.Api.OcrServices;
using RecipeAId.Api.OcrSessions;
using RecipeAId.Api.ParserServices;
using RecipeAId.Core.Interfaces;
using RecipeAId.Core.Services;
using RecipeAId.Data;
using RecipeAId.Data.Repositories;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// Serilog — compact JSON in Production (easy to grep/pipe), readable text in Development
builder.Host.UseSerilog((ctx, config) =>
{
    if (ctx.HostingEnvironment.IsProduction())
        config.WriteTo.Console(new CompactJsonFormatter());
    else
        config.WriteTo.Console();

    config.ReadFrom.Configuration(ctx.Configuration);
});

// Database
var dbPath = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=recipeaid.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(dbPath));

// Repositories
builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
builder.Services.AddScoped<IIngredientRepository, IngredientRepository>();

// Services
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IIngredientService, IngredientService>();
builder.Services.AddScoped<IRecipeMatchingService, RecipeMatchingService>();
builder.Services.AddSingleton<IUnitConversionService, UnitConversionService>();

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

// Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

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
