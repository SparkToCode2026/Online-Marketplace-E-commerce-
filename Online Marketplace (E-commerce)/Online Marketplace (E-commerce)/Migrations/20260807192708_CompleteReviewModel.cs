using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Online_Marketplace__E_commerce_.Migrations
{
    /// <inheritdoc />
    public partial class CompleteReviewModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Reviews",
                newName: "reviewId");

            migrationBuilder.AddColumn<string>(
                name: "comment",
                table: "Reviews",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "createdAt",
                table: "Reviews",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "productId",
                table: "Reviews",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "rating",
                table: "Reviews",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "userId",
                table: "Reviews",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_productId",
                table: "Reviews",
                column: "productId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_userId",
                table: "Reviews",
                column: "userId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Products_productId",
                table: "Reviews",
                column: "productId",
                principalTable: "Products",
                principalColumn: "productId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Users_userId",
                table: "Reviews",
                column: "userId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Products_productId",
                table: "Reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Users_userId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_productId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_userId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "comment",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "createdAt",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "productId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "rating",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "userId",
                table: "Reviews");

            migrationBuilder.RenameColumn(
                name: "reviewId",
                table: "Reviews",
                newName: "Id");
        }
    }
}
