using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Order
    {
        [Key]
        public int orderId { get; set; }

        public int userId { get; set; }
        public User? user { get; set; }

        public int? couponId { get; set; }
        public Coupon? coupon { get; set; }

        [Required]
        public string status { get; set; }

        public DateTime orderDate { get; set; }

        public decimal totalAmount { get; set; }

        public List<OrderItem>? orderItems { get; set; }

        public Payment? payment { get; set; }

        public Shipping? shipping { get; set; }
    }
}
