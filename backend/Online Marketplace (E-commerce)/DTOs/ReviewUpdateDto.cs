using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    public class ReviewUpdateDto
    {
        [Required]
        [Range(1, 5)]
        public int rating { get; set; }

        public string? comment { get; set; }
    }
}
