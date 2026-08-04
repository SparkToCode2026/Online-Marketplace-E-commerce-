using System.ComponentModel.DataAnnotations.Schema;

namespace Online_Marketplace__E_commerce_.Models
{
    public class VendorProfile
    {
        public int VendorProfileId { get; set; }
        public string StoreName { get; set; }
        public string Address { get; set; }
        public int CreatedaAt { get; set; }

        [ForeignKey("Users")] // Specify the foreign key relationship
        public int UserId { get; set; }
        public User Users { get; set; } // Navigation property to the associated User
    }
}
