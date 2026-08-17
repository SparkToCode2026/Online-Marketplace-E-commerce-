using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
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
        public IActionResult AddCartItem(CartItemCreateDto dto)
        {
            if (!_context.Carts.Any(c => c.cartId == dto.cartId))
                return NotFound("Cart not found");

            var product = _context.Products.Find(dto.productId);
            if (product == null || !product.isActive)
                return NotFound("Product not found or unavailable");

            var existing = _context.CartItems
                .FirstOrDefault(ci => ci.cartId == dto.cartId && ci.productId == dto.productId);
            if (existing != null)
            {
                existing.quantity += dto.quantity;
                _context.SaveChanges();
                return Ok(existing.ToDto());
            }

            var cartItem = new CartItem
            {
                cartId = dto.cartId,
                productId = dto.productId,
                quantity = dto.quantity
            };
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
            return Ok(item.ToDto());
        }

        // Case 3 — Adjust quantity by a relative delta (+/- buttons); removes
        // the item if it drops to zero or below.
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
            return Ok(item.ToDto());
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
            return Ok(items.Select(ci => ci.ToDto()));
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
            return Ok(item.ToDto());
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
            return Ok(items.Select(ci => ci.ToDto()));
        }

        // Case 8 — Total quantity of each product across all carts: a live
        // demand signal, distinct from actual sales in Product.bestSellers.
        [HttpGet("demand")]
        public IActionResult GetProductDemand()
        {
            var demand = _context.CartItems
                .GroupBy(ci => ci.productId)
                .Select(g => new {
                    productId = g.Key,
                    totalQuantity = g.Sum(ci => ci.quantity)
                })
                .OrderByDescending(x => x.totalQuantity)
                .ToList();
            return Ok(demand);
        }

        // Case 9 — Filter cart items (admin) by cart, by product, and/or by
        // whether the product is still active. status: "active" | "inactive".
        [HttpGet("filter")]
        public IActionResult FilterCartItems(int? cartId, int? productId, string? status)
        {
            var query = _context.CartItems
                .Include(ci => ci.cart)
                .Include(ci => ci.product)
                .AsQueryable();

            if (cartId.HasValue)
                query = query.Where(ci => ci.cartId == cartId.Value);

            if (productId.HasValue)
                query = query.Where(ci => ci.productId == productId.Value);

            if (!string.IsNullOrEmpty(status))
            {
                query = status.ToLower() switch
                {
                    "active" => query.Where(ci => ci.product.isActive),
                    "inactive" => query.Where(ci => !ci.product.isActive),
                    _ => query
                };
            }

            var items = query.ToList();
            return Ok(items.Select(ci => ci.ToDto()));
        }

        // Case 10 — Value of every cart in one call: GroupBy cart, then Sum
        // quantity x current product price. Materialised first because the
        // multiplication reads through the product navigation.
        [HttpGet("summary")]
        public IActionResult GetCartSummaries()
        {
            var summaries = _context.CartItems
                .Include(ci => ci.product)
                .ToList()
                .GroupBy(ci => ci.cartId)
                .Select(g => new
                {
                    cartId = g.Key,
                    lineCount = g.Count(),
                    totalQuantity = g.Sum(ci => ci.quantity),
                    totalAmount = g.Sum(ci => (ci.product?.price ?? 0) * ci.quantity)
                })
                .OrderByDescending(x => x.totalAmount)
                .ToList();

            return Ok(summaries);
        }
    }
}
