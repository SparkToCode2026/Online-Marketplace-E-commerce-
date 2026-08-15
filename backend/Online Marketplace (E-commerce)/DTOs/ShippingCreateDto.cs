using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // status/shippedAt/deliveredAt are managed by the server: a new record
    // always starts as "Preparing".
    public class ShippingCreateDto
    {
        public int orderId { get; set; }

        [Required]
        public string address { get; set; }
    }
}
