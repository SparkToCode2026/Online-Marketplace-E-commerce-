using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Category
    {
        [Key]
        public int categoryId { get; set; }

        [Required]
        public string name { get; set; }

        public string? description { get; set; }

        // Soft on/off switch: a disabled category is hidden from browsing
        // without deleting it or its products.
        public bool isActive { get; set; } = true;

        public List<Product>? products { get; set; }
    }
}
