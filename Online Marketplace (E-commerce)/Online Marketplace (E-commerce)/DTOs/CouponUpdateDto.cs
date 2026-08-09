namespace Online_Marketplace__E_commerce_.DTOs
{
    // The coupon code is not editable after creation; only its discount and
    // expiry can change.
    public class CouponUpdateDto
    {
        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }
    }
}
