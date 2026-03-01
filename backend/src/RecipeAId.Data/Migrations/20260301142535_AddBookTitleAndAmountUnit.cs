using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RecipeAId.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookTitleAndAmountUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "RecipeIngredients");

            migrationBuilder.AddColumn<string>(
                name: "BookTitle",
                table: "Recipes",
                type: "TEXT",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Amount",
                table: "RecipeIngredients",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "RecipeIngredients",
                type: "TEXT",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BookTitle",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "RecipeIngredients");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "RecipeIngredients");

            migrationBuilder.AddColumn<string>(
                name: "Quantity",
                table: "RecipeIngredients",
                type: "TEXT",
                maxLength: 200,
                nullable: true);
        }
    }
}
