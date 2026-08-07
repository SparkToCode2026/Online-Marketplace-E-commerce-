using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Coupon
    {
        [Key]
        [JsonIgnore]
        public int couponId { get; set; }

        [Required]
        public string code { get; set; }

        public decimal discountPercent { get; set; }

        public DateTime expiryDate { get; set; }

        [JsonIgnore]
        public List<Order> orders { get; set; }
    }
}