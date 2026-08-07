using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Cart
    {
        [Key]
        [JsonIgnore]
        public int cartId { get; set; }

        public int userId { get; set; }
        [JsonIgnore]
        public User user { get; set; }

        public DateTime createdAt { get; set; }

        [JsonIgnore]
        public List<CartItem> cartItems { get; set; }
    }
}
