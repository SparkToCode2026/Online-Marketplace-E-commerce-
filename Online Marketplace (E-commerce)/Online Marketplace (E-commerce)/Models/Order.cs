using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Order
    {
        [Key]
        [JsonIgnore]
        public int orderId { get; set; }

        public int userId { get; set; }
        [JsonIgnore]
        public User? user { get; set; }

        public int? couponId { get; set; }
        [JsonIgnore]
        public Coupon? coupon { get; set; }

        [Required]
        public string status { get; set; }

        public DateTime orderDate { get; set; }

        public decimal totalAmount { get; set; }

        [JsonIgnore]
        public List<OrderItem>? orderItems { get; set; }

        [JsonIgnore]
        public Payment? payment { get; set; }

        [JsonIgnore]
        public Shipping? shipping { get; set; }
    }
}