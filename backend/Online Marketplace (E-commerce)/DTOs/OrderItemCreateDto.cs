using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // unitPrice is intentionally omitted: the server snapshots it from the
    // product's current price so the client cannot set its own line price.
    public class OrderItemCreateDto
    {
        public int orderId { get; set; }

        public int productId { get; set; }

        [Required]
        public int quantity { get; set; }
    }
}
