using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CartItemCreateDto
    {
        public int cartId { get; set; }

        public int productId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "quantity must be at least 1")]
        public int quantity { get; set; }
    }
}
