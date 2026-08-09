using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class VendorProfile
    {

        // Primary key. Never sent to the client.
        [Key]
        public int VendorProfileId { get; set; }
        public string StoreName { get; set; }
        public string Address { get; set; }
        public DateTime CreatedaAt { get; set; }

        public int UserId { get; set; }

        public User? Users { get; set; } // Navigation property to the associated User

        // Not in the original ERD. Added so Case 11 has something concrete
        // for an admin to flip when approving a new storefront.
        public bool isVerified { get; set; }

        public List<Product>? Products { get; set; }
    }
}
