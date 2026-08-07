using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
namespace Online_Marketplace__E_commerce_.Models
{
    public class User
    {

        [Key]
        [JsonIgnore]
        public int  UserId {  get; set; }
        //User display name
        [Required]
        public string Username { get; set; }
        public string Email { get; set; }
        [JsonIgnore]
        public string PasswordHash { get; set; }
        public int Phonenumber { get; set; }
        public string Role { get; set; } // "Customer" or "Vendor"


        // holds a foreign key back to this user.
         public bool isActive { get; set; }

        [InverseProperty("Users")]
        [JsonIgnore]
        public VendorProfile vendorProfile { get; set; }
    }
}
