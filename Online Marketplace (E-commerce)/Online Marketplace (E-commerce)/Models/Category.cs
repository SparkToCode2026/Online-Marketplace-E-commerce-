using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Category
    {
        [Key]
        [JsonIgnore]
        public int categoryId { get; set; }

        [Required]
        public string name { get; set; }

        public string? description { get; set; }
    }
}
