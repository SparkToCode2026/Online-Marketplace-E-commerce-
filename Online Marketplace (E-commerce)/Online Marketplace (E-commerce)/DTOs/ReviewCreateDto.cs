using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // createdAt is stamped by the server when the review is saved.
    public class ReviewCreateDto
    {
        public int userId { get; set; }

        public int productId { get; set; }

        [Required]
        [Range(1, 5)]
        public int rating { get; set; }

        public string? comment { get; set; }
    }
}
