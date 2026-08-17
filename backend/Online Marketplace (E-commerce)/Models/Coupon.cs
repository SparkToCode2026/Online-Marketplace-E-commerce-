using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Coupon
    {
        [Key]
        public int couponId { get; set; }

        [Required]
        public string code { get; set; }

        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }

        // Manual on/off switch, independent of expiry. Defaults to true; an
        // admin can flip it via PATCH /Coupon/toggle.
        public bool isActive { get; set; } = true;

        // Optional cap on how many orders may use this coupon. null = unlimited.
        public int? usageLimit { get; set; }

        public List<Order>? orders { get; set; }
    }
}
