using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class OrderItem
    {
        [Key]
        [JsonIgnore]
        public int orderItemId { get; set; }

        public int orderId { get; set; }
        [JsonIgnore]
        public Order order { get; set; }

        public int productId { get; set; }
        [JsonIgnore]
        public Product product { get; set; }

        [Required]
        public int quantity { get; set; }

        // Price at the moment of purchase — must not be recalculated from Product.price later.
        [Required]
        public decimal unitPrice { get; set; }
    }
}
