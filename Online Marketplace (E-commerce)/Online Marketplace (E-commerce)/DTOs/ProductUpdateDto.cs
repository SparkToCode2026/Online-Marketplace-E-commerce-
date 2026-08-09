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
        public decimal price { get; set; }

        public int stockQuantity { get; set; }
    }
}
