using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // The coupon code is not editable after creation; only its discount and
    // expiry can change.
    public class CouponUpdateDto
    {
        [Range(0.001, 100, ErrorMessage = "discountPercent must be between 0 and 100")]
        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }
    }
}
