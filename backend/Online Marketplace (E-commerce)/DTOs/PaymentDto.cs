namespace Online_Marketplace__E_commerce_.DTOs
{
    public class PaymentDto
    {
        public int paymentId { get; set; }
        public int orderId { get; set; }
        public decimal amount { get; set; }
        public string method { get; set; }
        public string status { get; set; }
        public DateTime paidAt { get; set; }

        public OrderDto? order { get; set; }
    }
}
