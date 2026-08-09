namespace Online_Marketplace__E_commerce_.DTOs
{
    public class ProductDto
    {
        public int productId { get; set; }
        public string name { get; set; }
        public string? description { get; set; }
        public decimal price { get; set; }
        public int stockQuantity { get; set; }
        public bool isActive { get; set; }
        public DateTime createdAt { get; set; }

        public int categoryId { get; set; }
        public CategoryDto? category { get; set; }

        public int vendorProfileId { get; set; }
        public VendorProfileDto? vendorProfile { get; set; }
    }
}
