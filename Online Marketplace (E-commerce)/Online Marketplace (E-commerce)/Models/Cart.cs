using System;
using System.Collections.Generic;
using System.Text;

namespace Online_Marketplace__E_commerce_.Models
{
   public  class Cart
    {

        [Key]
        public int CartId { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }

        public DateTime CreatedAt { get; set; }

        [JsonIgnore]
        public User User { get; set; }

        [InverseProperty("Cart")]
        [JsonIgnore]
        public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }
}
