using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class CartItem
    {
        [Key]
        public int cartItemId { get; set; }

        public int cartId { get; set; }
        public Cart? cart { get; set; }

        public int productId { get; set; }
        public Product? product { get; set; }

        [Required]
        public int quantity { get; set; }
    }
}
