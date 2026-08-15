using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // CreatedaAt and isVerified are server-managed: a new storefront starts
    // unverified until an admin approves it.
    public class VendorProfileCreateDto
    {
        [Required]
        public string StoreName { get; set; }

        [Required]
        public string Address { get; set; }

        public int UserId { get; set; }
    }
}
