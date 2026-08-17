using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ProjectContext _context;
        public CartController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a cart for a user (one per user, enforced here and
        // by the unique index on Carts.userId).
        [HttpPost("create")]
        public IActionResult CreateCart(int userId)
        {
            if (!_context.Users.Any(u => u.UserId == userId))
                return NotFound("User not found");

            if (_context.Carts.Any(c => c.userId == userId))
                return Conflict("User already has a cart");

            var cart = new Cart { userId = userId, createdAt = DateTime.Now };
            _context.Carts.Add(cart);
            _context.SaveChanges();
            return Ok(cart.cartId);
        }

        // Case 2 — Reassign a cart to a different user (e.g. merging a
        // guest cart into a logged-in account).
        [HttpPut("reassignOwner")]
        public IActionResult ReassignOwner(int id, int newUserId)
        {
            var cart = _context.Carts.Find(id);
            if (cart == null)
                return NotFound("Cart not found");

            if (!_context.Users.Any(u => u.UserId == newUserId))
                return NotFound("User not found");

            if (_context.Carts.Any(c => c.userId == newUserId))
                return Conflict("Target user already has a cart");

            cart.userId = newUserId;
            _context.SaveChanges();
            return Ok(cart.ToDto());
        }

        // Case 3 — Clear a cart: remove all its items without deleting the
        // cart record itself.
        [HttpPatch("clear")]
        public IActionResult ClearCart(int id)
        {
            var cart = _context.Carts.Find(id);
            if (cart == null)
                return NotFound("Cart not found");

            var items = _context.CartItems.Where(ci => ci.cartId == id).ToList();
            _context.CartItems.RemoveRange(items);
            _context.SaveChanges();
            return Ok($"{items.Count} item(s) removed");
        }

        // Case 4 — Delete a cart entirely (its items cascade with it).
        [HttpDelete("delete")]
        public IActionResult DeleteCart(int id)
        {
            var cart = _context.Carts.Find(id);
            if (cart == null)
                return NotFound("Cart not found");

            _context.Carts.Remove(cart);
            _context.SaveChanges();
            return Ok("Cart deleted successfully");
        }

        // Case 5 — Get all carts (admin view), including each cart's owner and
        // its items with their products.
        [HttpGet("all")]
        public IActionResult GetAllCarts()
        {
            var carts = _context.Carts
                .Include(c => c.user)
                .Include(c => c.cartItems)
                .ThenInclude(ci => ci.product)
                .ToList();
            return Ok(carts.Select(c => c.ToDto()));
        }

        // Case 6 — Get a single cart with its items and each item's product.
        [HttpGet("getById")]
        public IActionResult GetCartById(int id)
        {
            var cart = _context.Carts
                .Include(c => c.cartItems)
                .ThenInclude(ci => ci.product)
                .FirstOrDefault(c => c.cartId == id);
            if (cart == null)
                return NotFound("Cart not found");
            return Ok(cart.ToDto());
        }

        // Case 7 — Filter carts created after a given date.
        [HttpGet("createdAfter")]
        public IActionResult GetCartsCreatedAfter(DateTime date)
        {
            var carts = _context.Carts
                .Where(c => c.createdAt >= date)
                .ToList();
            return Ok(carts.Select(c => c.ToDto()));
        }

        // Case 8 — Sort carts by how many items they currently hold.
        [HttpGet("byItemCount")]
        public IActionResult GetCartsByItemCount()
        {
            var result = _context.Carts
                .Select(c => new
                {
                    c.cartId,
                    c.userId,
                    itemCount = c.cartItems.Count()
                })
                .OrderByDescending(c => c.itemCount)
                .ToList();
            return Ok(result);
        }

        // Case 9 — Filter carts (admin) with an optional owner and activity
        // status. status: "active" = has items; "abandoned" = has items but was
        // created more than `abandonedDays` ago; "empty" = has no items.
        [HttpGet("filter")]
        public IActionResult FilterCarts(int? userId, string? status, int abandonedDays = 7)
        {
            var query = _context.Carts
                .Include(c => c.user)
                .Include(c => c.cartItems)
                .ThenInclude(ci => ci.product)
                .AsQueryable();

            if (userId.HasValue)
                query = query.Where(c => c.userId == userId.Value);

            if (!string.IsNullOrEmpty(status))
            {
                var cutoff = DateTime.Now.AddDays(-abandonedDays);
                query = status.ToLower() switch
                {
                    "active" => query.Where(c => c.cartItems.Any()),
                    "abandoned" => query.Where(c => c.cartItems.Any() && c.createdAt < cutoff),
                    "empty" => query.Where(c => !c.cartItems.Any()),
                    _ => query
                };
            }

            var carts = query.ToList();
            return Ok(carts.Select(c => c.ToDto()));
        }

        // Case 10 — One cart's totals: line count, total units (Count/Sum) and
        // the money total (Sum of price x quantity), priced from the products'
        // current prices.
        [HttpGet("total")]
        public IActionResult GetCartTotal(int id)
        {
            var cart = _context.Carts
                .Include(c => c.cartItems)
                .ThenInclude(ci => ci.product)
                .FirstOrDefault(c => c.cartId == id);

            if (cart == null)
                return NotFound("Cart not found");

            var items = cart.cartItems ?? new List<CartItem>();

            return Ok(new
            {
                cartId = cart.cartId,
                lineCount = items.Count,
                totalQuantity = items.Sum(ci => ci.quantity),
                totalAmount = items.Sum(ci => (ci.product?.price ?? 0) * ci.quantity)
            });
        }
    }
}
