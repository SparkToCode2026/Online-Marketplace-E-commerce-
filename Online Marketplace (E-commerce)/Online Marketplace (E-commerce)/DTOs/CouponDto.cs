namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CouponDto
    {
        public int couponId { get; set; }
        public string code { get; set; }
        public decimal discountPercent { get; set; }
        public DateTime expiryDate { get; set; }

        public List<OrderDto>? orders { get; set; }
    }
}
