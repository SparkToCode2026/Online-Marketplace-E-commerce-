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

        public List<Order>? orders { get; set; }
    }
}
