using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Product
    {
        [Key]
        [JsonIgnore]
        public int productId { get; set; }

        [Required]
        public string name { get; set; }

        public string? description { get; set; }

        [Required]
        public decimal price { get; set; }

        public int stockQuantity { get; set; }

        public bool isActive { get; set; }

        public DateTime createdAt { get; set; }

        [ForeignKey("category")]
        public int categoryId { get; set; }
        [JsonIgnore]
        public Category category { get; set; }

        [ForeignKey("vendorProfile")]
        public int vendorProfileId { get; set; }
        [JsonIgnore]
        public VendorProfile vendorProfile { get; set; }
    }
}
