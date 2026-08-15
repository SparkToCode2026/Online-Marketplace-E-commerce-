using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Data-correction of a payment. status is changed through the dedicated
    // updateStatus endpoint, not here.
    public class PaymentUpdateDto
    {
        [Required]
        public decimal amount { get; set; }

        [Required]
        public string method { get; set; }
    }
}
