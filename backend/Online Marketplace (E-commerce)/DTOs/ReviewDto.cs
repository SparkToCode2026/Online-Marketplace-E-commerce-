namespace Online_Marketplace__E_commerce_.DTOs
{
    public class ReviewDto
    {
        public int reviewId { get; set; }
        public int userId { get; set; }
        public int productId { get; set; }
        public int rating { get; set; }
        public string? comment { get; set; }
        public DateTime createdAt { get; set; }
        public bool isApproved { get; set; }

        public UserDto? user { get; set; }
        public ProductDto? product { get; set; }
    }
}
