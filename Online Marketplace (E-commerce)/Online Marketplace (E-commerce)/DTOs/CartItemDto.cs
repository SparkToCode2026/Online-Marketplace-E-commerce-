namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CartItemDto
    {
        public int cartItemId { get; set; }
        public int cartId { get; set; }
        public int productId { get; set; }
        public int quantity { get; set; }

        public ProductDto? product { get; set; }
        public CartDto? cart { get; set; }
    }
}
