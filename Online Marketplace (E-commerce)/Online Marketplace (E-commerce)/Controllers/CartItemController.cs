using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartItemController : ControllerBase
    {
        private readonly ProjectContext _context;
        public CartItemController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Add a product to a cart. If it's already in there,
        // increase the quantity instead of creating a duplicate row.
        [HttpPost("add")]
        public IActionResult AddCartItem(CartItem cartItem)
        {
            if (!_context.Carts.Any(c => c.cartId == cartItem.cartId))
                return NotFound("Cart not found");

            var product = _context.Products.Find(cartItem.productId);
            if (product == null || !product.isActive)
                return NotFound("Product not found or unavailable");

            var existing = _context.CartItems
                .FirstOrDefault(ci => ci.cartId == cartItem.cartId && ci.productId == cartItem.productId);
            if (existing != null)
            {
                existing.quantity += cartItem.quantity;
                _context.SaveChanges();
                return Ok(existing);
            }

            _context.CartItems.Add(cartItem);
            _context.SaveChanges();
            return Ok(cartItem.cartItemId);
        }

        // Case 2 — Set a cart item's quantity to an exact value.
        [HttpPut("update")]
        public IActionResult UpdateCartItem(int id, int quantity)
        {
            if (quantity <= 0)
                return BadRequest("quantity must be greater than 0");

            var item = _context.CartItems.Find(id);
            if (item == null)
                return NotFound("Cart item not found");

            item.quantity = quantity;
            _context.SaveChanges();
            return Ok(item);
        }

        // Case 3 — Adjust a cart item's quantity by a relative delta (+/-),
        // e.g. the +/- buttons on a cart page. Removes the row if it drops
        // to zero or below.
        [HttpPatch("adjustQuantity")]
        public IActionResult AdjustQuantity(int id, int delta)
        {
            var item = _context.CartItems.Find(id);
            if (item == null)
                return NotFound("Cart item not found");

            item.quantity += delta;
            if (item.quantity <= 0)
            {
                _context.CartItems.Remove(item);
                _context.SaveChanges();
                return Ok("Item removed from cart");
            }

            _context.SaveChanges();
            return Ok(item);
        }

        // Case 4 — Remove a cart item.
        [HttpDelete("remove")]
        public IActionResult RemoveCartItem(int id)
        {
            var item = _context.CartItems.Find(id);
            if (item == null)
                return NotFound("Cart item not found");

            _context.CartItems.Remove(item);
            _context.SaveChanges();
            return Ok("Cart item removed successfully");
        }

        // Case 5 — Get all cart items, including their cart and product.
        [HttpGet("all")]
        public IActionResult GetAllCartItems()
        {
            var items = _context.CartItems
                .Include(ci => ci.cart)
                .Include(ci => ci.product)
                .ToList();
            return Ok(items);
        }

        // Case 6 — Get a single cart item by id.
        [HttpGet("getById")]
        public IActionResult GetCartItemById(int id)
        {
            var item = _context.CartItems
                .Include(ci => ci.product)
                .FirstOrDefault(ci => ci.cartItemId == id);
            if (item == null)
                return NotFound("Cart item not found");
            return Ok(item);
        }

        // Case 7 — Find cart items sitting on a now-inactive product
        // (useful for flagging stale carts before checkout fails).
        [HttpGet("inactiveProducts")]
        public IActionResult GetItemsWithInactiveProducts()
        {
            var items = _context.CartItems
                .Include(ci => ci.product)
                .Where(ci => !ci.product.isActive)
                .ToList();
            return Ok(items);
        }

        // Case 8 — Aggregate: total quantity of each product currently
        // sitting in any cart. A live demand signal, distinct from actual
        // completed sales in Product.bestSellers.
        [HttpGet("demand")]
        public IActionResult GetProductDemand()
        {
            var demand = _context.CartItems
                .GroupBy(ci => ci.productId)
                .Select(g => new { productId = g.Key, totalQuantity = g.Sum(ci => ci.quantity) })
                .OrderByDescending(x => x.totalQuantity)
                .ToList();
            return Ok(demand);
        }
    }
}
