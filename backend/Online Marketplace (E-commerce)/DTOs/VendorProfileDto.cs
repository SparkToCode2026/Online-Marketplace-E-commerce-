namespace Online_Marketplace__E_commerce_.DTOs
{
    public class VendorProfileDto
    {
        public int VendorProfileId { get; set; }
        public string StoreName { get; set; }
        public string Address { get; set; }
        public DateTime CreatedaAt { get; set; }
        public int UserId { get; set; }
        public bool isVerified { get; set; }

        public UserDto? Users { get; set; }
    }
}
