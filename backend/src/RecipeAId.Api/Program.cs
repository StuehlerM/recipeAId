using Microsoft.EntityFrameworkCore;
using RecipeAId.Core.Interfaces;
using RecipeAId.Data;
using RecipeAId.Data.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Database
var dbPath = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=recipeaid.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(dbPath));

// Repositories
builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
builder.Services.AddScoped<IIngredientRepository, IngredientRepository>();

// Controllers + OpenAPI
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS — allow Vite dev server
builder.Services.AddCors(options =>
    options.AddPolicy("DevPolicy", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()));

var app = builder.Build();

// Auto-apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("DevPolicy");
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
