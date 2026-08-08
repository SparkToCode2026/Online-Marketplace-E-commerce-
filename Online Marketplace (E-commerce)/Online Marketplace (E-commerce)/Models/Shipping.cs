using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Shipping
    {
        [Key]
        [JsonIgnore]
        public int shippingId { get; set; }

        public int orderId { get; set; }
        [JsonIgnore]
        public Order? order { get; set; }

        [Required]
        public string address { get; set; }

        // Not required from client input: AddShipping always sets this to
        // "Preparing" itself, and UpdateShippingStatus takes it as a
        // separate parameter rather than through this model.
        public string? status { get; set; }

        public DateTime? shippedAt { get; set; }

        public DateTime? deliveredAt { get; set; }
    }
}
