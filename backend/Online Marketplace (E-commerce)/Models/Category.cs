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

        public List<Product>? products { get; set; }
    }
}
