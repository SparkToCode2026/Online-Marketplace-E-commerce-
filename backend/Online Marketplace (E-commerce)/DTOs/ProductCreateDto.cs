using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Fields a client supplies when creating a product. productId, createdAt
    // and isActive are set by the server, not the caller.
    public class ProductCreateDto
    {
        [Required]
        public string name { get; set; }

        public string? description { get; set; }

        // Optional image URL. Falls back to a placeholder if not provided.
        public string productUrl { get; set; } = "https://placehold.co/400x300?text=Product";

        [Required]
        [Range(0.001, double.MaxValue, ErrorMessage = "price must be greater than 0")]
        public decimal price { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "stockQuantity cannot be negative")]
        public int stockQuantity { get; set; }

        public int categoryId { get; set; }

        public int vendorProfileId { get; set; }
    }
}
