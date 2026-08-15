using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Cart
    {
        [Key]
        public int cartId { get; set; }

        public int userId { get; set; }
        public User? user { get; set; }

        public DateTime createdAt { get; set; }

        public List<CartItem>? cartItems { get; set; }
    }
}
