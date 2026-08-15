using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CartItemCreateDto
    {
        public int cartId { get; set; }

        public int productId { get; set; }

        [Required]
        public int quantity { get; set; }
    }
}
