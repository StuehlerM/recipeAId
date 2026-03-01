using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeAId.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipeTitleIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Recipes_Title",
                table: "Recipes",
                column: "Title");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Recipes_Title",
                table: "Recipes");
        }
    }
}
