using System;
using System.Collections.Generic;
using System.Text;

namespace Online_Marketplace__E_commerce_.Models
{
    public class CartItem
    {
        [Key]
        [JsonIgnore]
        public int CartItemId { get; set; }

        [ForeignKey("Cart")]
        public int CartId { get; set; }

        [JsonIgnore]
        public Cart Cart { get; set; }

        [ForeignKey("Product")]
        public int ProductId { get; set; }

        [JsonIgnore]
        public Product Product { get; set; }

        public int Quantity { get; set; }
    }
}
