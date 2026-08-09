namespace Online_Marketplace__E_commerce_.DTOs
{
    public class OrderItemDto
    {
        public int orderItemId { get; set; }
        public int orderId { get; set; }
        public int productId { get; set; }
        public int quantity { get; set; }
        public decimal unitPrice { get; set; }

        public ProductDto? product { get; set; }
        public OrderDto? order { get; set; }
    }
}
