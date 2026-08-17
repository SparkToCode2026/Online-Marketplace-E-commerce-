using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Only the address is editable here; status/timestamps are managed by the
    // dedicated updateStatus endpoint.
    public class ShippingUpdateDto
    {
        [Required]
        public string address { get; set; }

        public string? carrier { get; set; }
        public string? city { get; set; }
    }
}
