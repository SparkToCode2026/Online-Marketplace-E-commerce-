using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    public class Review
    {
        [Key]
        public int reviewId { get; set; }

        public int userId { get; set; }
        public User? user { get; set; }

        public int productId { get; set; }
        public Product? product { get; set; }

        [Required]
        [Range(1, 5)]
        public int rating { get; set; }

        public string? comment { get; set; }

        public DateTime createdAt { get; set; }

        // Moderation flag. Defaults to true (visible); an admin can hide a
        // review by flipping it to false via PATCH /Review/approve.
        public bool isApproved { get; set; } = true;
    }
}
