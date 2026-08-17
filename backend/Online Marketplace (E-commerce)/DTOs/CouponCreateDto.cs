using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CouponCreateDto
    {
        [Required]
        public string code { get; set; }

        [Range(0.001, 100, ErrorMessage = "discountPercent must be between 0 and 100")]
        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }

        // Optional cap on total uses. null = unlimited.
        [Range(1, int.MaxValue, ErrorMessage = "usageLimit must be at least 1")]
        public int? usageLimit { get; set; }
    }
}
