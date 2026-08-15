namespace Online_Marketplace__E_commerce_.DTOs
{
    public class OrderDto
    {
        public int orderId { get; set; }
        public int userId { get; set; }
        public int? couponId { get; set; }
        public string status { get; set; }
        public DateTime orderDate { get; set; }
        public decimal totalAmount { get; set; }

        public List<OrderItemDto>? orderItems { get; set; }
        public CouponDto? coupon { get; set; }
        public PaymentDto? payment { get; set; }
        public ShippingDto? shipping { get; set; }
    }
}
