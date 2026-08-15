using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Editable fields of a product. Id, createdAt, isActive, categoryId and
    // vendorProfileId are not changed through this endpoint.
    public class ProductUpdateDto
    {
        [Required]
        public string name { get; set; }

        public string? description { get; set; }

        [Required]
        [Range(0.001, double.MaxValue, ErrorMessage = "price must be greater than 0")]
        public decimal price { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "stockQuantity cannot be negative")]
        public int stockQuantity { get; set; }
    }
}
