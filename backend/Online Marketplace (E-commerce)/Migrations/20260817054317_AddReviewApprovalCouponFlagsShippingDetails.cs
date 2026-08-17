using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Online_Marketplace__E_commerce_.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewApprovalCouponFlagsShippingDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "carrier",
                table: "Shippings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "city",
                table: "Shippings",
                type: "nvarchar(max)",
                nullable: true);

            // defaultValue is true, not EF's generated false: existing reviews
            // and coupons must stay visible/usable after this migration.
            migrationBuilder.AddColumn<bool>(
                name: "isApproved",
                table: "Reviews",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "isActive",
                table: "Coupons",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "usageLimit",
                table: "Coupons",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "carrier",
                table: "Shippings");

            migrationBuilder.DropColumn(
                name: "city",
                table: "Shippings");

            migrationBuilder.DropColumn(
                name: "isApproved",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "isActive",
                table: "Coupons");

            migrationBuilder.DropColumn(
                name: "usageLimit",
                table: "Coupons");
        }
    }
}
