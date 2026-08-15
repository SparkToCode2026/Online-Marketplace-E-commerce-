using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CouponCreateDto
    {
        [Required]
        public string code { get; set; }

        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }
    }
}
