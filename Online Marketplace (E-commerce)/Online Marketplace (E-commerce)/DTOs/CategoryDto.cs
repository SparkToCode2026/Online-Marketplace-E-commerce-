namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CategoryDto
    {
        public int categoryId { get; set; }
        public string name { get; set; }
        public string? description { get; set; }

        public List<ProductDto>? products { get; set; }
    }
}
