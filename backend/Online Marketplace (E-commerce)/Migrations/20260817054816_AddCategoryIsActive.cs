using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Online_Marketplace__E_commerce_.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryIsActive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isActive",
                table: "Categories",
                type: "bit",
                nullable: false,
                // true, not EF's generated false: existing categories must stay
                // active (and therefore browsable) after this migration.
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "isActive",
                table: "Categories");
        }
    }
}
