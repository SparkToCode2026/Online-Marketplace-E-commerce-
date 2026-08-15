using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Online_Marketplace__E_commerce_.Migrations
{
    /// <inheritdoc />
    public partial class AddProductUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "productUrl",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "productUrl",
                table: "Products");
        }
    }
}
