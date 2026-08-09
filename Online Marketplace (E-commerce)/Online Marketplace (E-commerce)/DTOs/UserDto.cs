namespace Online_Marketplace__E_commerce_.DTOs
{
    // Response shape for a User. Deliberately omits PasswordHash and the
    // cart navigation; the vendor profile is included only when loaded.
    public class UserDto
    {
        public int UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public int Phonenumber { get; set; }
        public string Role { get; set; }
        public bool isActive { get; set; }

        public VendorProfileDto? vendorProfile { get; set; }
    }
}
