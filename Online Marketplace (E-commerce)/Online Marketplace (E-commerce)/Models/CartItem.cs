using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class CartItem
    {
        [Key]
        [JsonIgnore]
        public int cartItemId { get; set; }

        public int cartId { get; set; }
        [JsonIgnore]
        public Cart? cart { get; set; }

        public int productId { get; set; }
        [JsonIgnore]
        public Product? product { get; set; }

        [Required]
        public int quantity { get; set; }
    }
}
