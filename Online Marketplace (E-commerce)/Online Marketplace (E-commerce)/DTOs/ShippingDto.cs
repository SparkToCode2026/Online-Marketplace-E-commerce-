namespace Online_Marketplace__E_commerce_.DTOs
{
    public class ShippingDto
    {
        public int shippingId { get; set; }
        public int orderId { get; set; }
        public string address { get; set; }
        public string? status { get; set; }
        public DateTime? shippedAt { get; set; }
        public DateTime? deliveredAt { get; set; }

        public OrderDto? order { get; set; }
    }
}
