using System.ComponentModel.DataAnnotations;
namespace Online_Marketplace__E_commerce_.Models
{
    public class User
    {

        [Key]
        public int  UserId {  get; set; }
        //User display name
        [Required]
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public int Phonenumber { get; set; }
        public string Role { get; set; } // "Customer" or "Vendor"


        // holds a foreign key back to this user.
         public bool isActive { get; set; }

        // Registration timestamp — stamped on register, used by /User/stats ordering.
        public DateTime CreatedAt { get; set; }

        public VendorProfile? vendorProfile { get; set; }

        public Cart? cart { get; set; }
    }
}
