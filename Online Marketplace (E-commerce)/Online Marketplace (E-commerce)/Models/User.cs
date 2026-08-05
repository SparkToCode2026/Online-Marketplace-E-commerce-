using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace Online_Marketplace__E_commerce_.Models
{
    public class User
    {
        [Key]
        [JsonIgnore]
        public int  UserId {  get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public int Phonenumber { get; set; }
        public string Role { get; set; } // "Customer" or "Vendor"

       


    }
}
