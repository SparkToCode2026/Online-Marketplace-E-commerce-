namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CartDto
    {
        public int cartId { get; set; }
        public int userId { get; set; }
        public DateTime createdAt { get; set; }
        // test
        public UserDto? user { get; set; }
        public List<CartItemDto>? cartItems { get; set; }
    }
}
