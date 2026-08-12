using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Product
    {
        [Key]
        public int productId { get; set; }

        [Required]
        public string name { get; set; }

        public string? description { get; set; }

        // Image URL shown on the storefront. Defaults to a placeholder so a
        // product always has something to display even if none is provided.
        public string productUrl { get; set; } = "https://placehold.co/400x300?text=Product";

        [Required]
        public decimal price { get; set; }

        public int stockQuantity { get; set; }

        public bool isActive { get; set; }

        public DateTime createdAt { get; set; }

        public int categoryId { get; set; }
        public Category? category { get; set; }

        public int vendorProfileId { get; set; }
        public VendorProfile? vendorProfile { get; set; }
    }
}
