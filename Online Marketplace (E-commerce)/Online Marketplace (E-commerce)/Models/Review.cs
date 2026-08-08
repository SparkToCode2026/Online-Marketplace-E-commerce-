using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Review
    {
        [Key]
        [JsonIgnore]
        public int reviewId { get; set; }

        public int userId { get; set; }
        [JsonIgnore]
        public User? user { get; set; }

        public int productId { get; set; }
        [JsonIgnore]
        public Product? product { get; set; }

        [Required]
        [Range(1, 5)]
        public int rating { get; set; }

        public string? comment { get; set; }

        public DateTime createdAt { get; set; }
    }
}
