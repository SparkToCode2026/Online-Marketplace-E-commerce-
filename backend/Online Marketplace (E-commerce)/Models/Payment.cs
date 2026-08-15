using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Payment
    {
        [Key]
        public int paymentId { get; set; }

        public int orderId { get; set; }
        public Order? order { get; set; }

        [Required]
        public decimal amount { get; set; }

        [Required]
        public string method { get; set; }

        [Required]
        public string status { get; set; }

        public DateTime paidAt { get; set; }
    }
}
