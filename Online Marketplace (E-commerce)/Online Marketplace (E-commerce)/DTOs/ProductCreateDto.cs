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

        [Required]
        public decimal price { get; set; }

        public int stockQuantity { get; set; }

        public int categoryId { get; set; }

        public int vendorProfileId { get; set; }
    }
}
