using Microsoft.EntityFrameworkCore;
using RecipeAId.Core.Entities;

namespace RecipeAId.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Ingredient> Ingredients => Set<Ingredient>();
    public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Recipe>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Title).IsRequired().HasMaxLength(500);
            entity.Property(r => r.CreatedAt).IsRequired();
            entity.Property(r => r.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<Ingredient>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Name).IsRequired().HasMaxLength(200);
            entity.HasIndex(i => i.Name).IsUnique();
        });

        modelBuilder.Entity<RecipeIngredient>(entity =>
        {
            entity.HasKey(ri => new { ri.RecipeId, ri.IngredientId });

            entity.HasOne(ri => ri.Recipe)
                  .WithMany(r => r.RecipeIngredients)
                  .HasForeignKey(ri => ri.RecipeId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ri => ri.Ingredient)
                  .WithMany(i => i.RecipeIngredients)
                  .HasForeignKey(ri => ri.IngredientId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(ri => ri.Quantity).HasMaxLength(200);
        });
    }

    public override int SaveChanges()
    {
        SetTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void SetTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<Recipe>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = entry.Entity.UpdatedAt = now;
            else if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = now;
        }
    }
}
