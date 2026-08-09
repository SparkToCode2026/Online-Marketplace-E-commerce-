using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Verification is toggled through the dedicated verify endpoint, not here.
    public class VendorProfileUpdateDto
    {
        [Required]
        public string StoreName { get; set; }

        [Required]
        public string Address { get; set; }
    }
}
