using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // paidAt is set by the server when the payment is recorded.
    public class PaymentCreateDto
    {
        public int orderId { get; set; }

        [Required]
        public decimal amount { get; set; }

        [Required]
        public string method { get; set; }

        [Required]
        public string status { get; set; }
    }
}
