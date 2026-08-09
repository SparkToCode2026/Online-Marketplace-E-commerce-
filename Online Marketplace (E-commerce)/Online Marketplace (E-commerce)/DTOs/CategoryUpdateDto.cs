using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class CategoryUpdateDto
    {
        [Required]
        public string name { get; set; }

        public string? description { get; set; }
    }
}
