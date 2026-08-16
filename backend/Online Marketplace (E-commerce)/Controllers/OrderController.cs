using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;
using System.Security.Claims;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly ProjectContext _context;
        private readonly IConfiguration _configuration;
        public OrderController(ProjectContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Case 1 — Checkout: builds the order from the user's cart.
        // Prices/totals are derived server-side, never trusted from the caller.
        [HttpPost("checkout")]
        public IActionResult Checkout(int userId, string? couponCode)
        {
            var user = _context.Users.Find(userId);

            if (user == null)
                return NotFound("User not found");

            var cartItems = _context.CartItems
                .Include(ci => ci.product)
                .Where(ci => ci.cart.userId == userId)
                .ToList();

            if (!cartItems.Any())
                return BadRequest("Cart is empty");

            Coupon? coupon = null;

            if (!string.IsNullOrEmpty(couponCode))
            {
                coupon = _context.Coupons.FirstOrDefault(c => c.code == couponCode);
                if (coupon == null)
                    return NotFound("Coupon not found");
                if (coupon.expiryDate < DateTime.Now)
                    return BadRequest("Coupon has expired");
            }

            var orderItems = new List<OrderItem>();

            decimal subtotal = 0;

            foreach (var item in cartItems)
            {
                // Guard against overselling: never let an order take more units
                // than the product currently has in stock.
                if (item.quantity > item.product.stockQuantity)
                    return BadRequest(
                        $"Not enough stock for \"{item.product.name}\". Only {item.product.stockQuantity} left.");

                subtotal += item.product.price * item.quantity;
                orderItems.Add(new OrderItem
                {
                    productId = item.productId,
                    quantity = item.quantity,
                    unitPrice = item.product.price
                });

                // Reserve the purchased units by reducing the product's stock.
                // The product is tracked (Included above), so this change is
                // persisted by the SaveChanges call below.
                item.product.stockQuantity -= item.quantity;
            }

            var order = new Order
            {
                userId = userId,
                couponId = coupon?.couponId,
                status = "Pending",
                orderDate = DateTime.Now,
                totalAmount = coupon != null ? subtotal * (1 - coupon.discountPercent / 100) : subtotal,
                orderItems = orderItems
            };

            _context.Orders.Add(order);
            _context.CartItems.RemoveRange(cartItems);
            _context.SaveChanges();

            EmailService.Send(
                user.Email,
                "Order Confirmation",
                $"Thanks for your order! Order #{order.orderId} totaling {order.totalAmount:C} has been placed.",
                _configuration);

            return Ok(order.orderId);
        }

        // Case 2 — Update an order's status.
        [Authorize(Roles = "Admin")]
        [HttpPut("updateStatus")]
        public IActionResult UpdateStatus(int id, string status)
        {
            var order = _context.Orders.Find(id);

            if (order == null)
                return NotFound("Order not found");

            order.status = status;
            _context.SaveChanges();
            return Ok(order.ToDto());
        }

        // Case 2b — Customer cancels their OWN order. This is a soft cancel
        // (status -> Cancelled), never a hard delete, so the record is kept.
        // Guards: the caller must own the order (id taken from the JWT, an admin
        // may cancel any), the order must still be early in its lifecycle
        // (Pending/Processing), and it must have no payment on record. Anything
        // past that must go through an admin.
        [Authorize]
        [HttpPut("cancel")]
        public IActionResult CancelOrder(int id)
        {
            var order = _context.Orders.Find(id);
            if (order == null)
                return NotFound("Order not found");

            // ownership: a customer can only cancel their own order.
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (role != "Admin" && order.userId != callerId)
                return Forbid();

            if (order.status != "Pending" && order.status != "Processing")
                return BadRequest($"Order can't be cancelled while it is {order.status}.");

            if (_context.Payments.Any(p => p.orderId == id))
                return BadRequest("Order has a payment on record; contact support to cancel.");

            order.status = "Cancelled";
            _context.SaveChanges();
            return Ok(order.ToDto());
        }

        // Case 3 — Apply/change the coupon on an existing order and
        // recompute totalAmount from its line items.
        [HttpPatch("applyCoupon")]
        public IActionResult ApplyCoupon(int id, string couponCode)
        {
            var order = _context.Orders
                .Include(o => o.orderItems)
                .FirstOrDefault(o => o.orderId == id);
            if (order == null)
                return NotFound("Order not found");

            var coupon = _context.Coupons.FirstOrDefault(c => c.code == couponCode);

            if (coupon == null)
                return NotFound("Coupon not found");

            if (coupon.expiryDate < DateTime.Now)
                return BadRequest("Coupon has expired");

            decimal subtotal = order.orderItems.Sum(oi => oi.unitPrice * oi.quantity);

            order.couponId = coupon.couponId;

            order.totalAmount = subtotal * (1 - coupon.discountPercent / 100);

            _context.SaveChanges();
            return Ok(order.ToDto());
        }

        // Case 4 — Delete an order. Blocked once it has a payment on record,
        // to keep financial history intact; cancel via status instead.
        [Authorize(Roles = "Admin")]
        [HttpDelete("delete")]
        public IActionResult DeleteOrder(int id)
        {
            var order = _context.Orders.Find(id);
            if (order == null)
                return NotFound("Order not found");

            if (_context.Payments.Any(p => p.orderId == id))
                return Conflict("Order has a payment on record. Cancel it via status instead of deleting.");

            _context.Orders.Remove(order);
            _context.SaveChanges();
            return Ok("Order deleted successfully");
        }

        // Case 5 — Get all orders, including their items and coupon.
        [HttpGet("all")]
        public IActionResult GetAllOrders()
        {
            var orders = _context.Orders
                .Include(o => o.orderItems)
                .Include(o => o.coupon)
                .ToList();
            return Ok(orders.Select(o => o.ToDto()));
        }

        // Case 6 — Get a single order with its items, payment, and shipping.
        [HttpGet("getById")]
        public IActionResult GetOrderById(int id)
        {

            var order = _context.Orders
                .Include(o => o.orderItems)
                .Include(o => o.payment)
                .Include(o => o.shipping)
                .FirstOrDefault(o => o.orderId == id);

            if (order == null)
                return NotFound("Order not found");

            return Ok(order.ToDto());
        }

        // Case 7 — Filter orders placed within a date range.
        [HttpGet("byDateRange")]
        public IActionResult GetOrdersByDateRange(DateTime from, DateTime to)
        {
            var orders = _context.Orders
                .Where(o => o.orderDate >= from && o.orderDate <= to)
                .ToList();
            return Ok(orders.Select(o => o.ToDto()));
        }

        // Case 8 — Aggregate: order count and revenue grouped by status.
        [HttpGet("statsByStatus")]
        public IActionResult GetOrderStatsByStatus()
        {
            var stats = _context.Orders
                .GroupBy(o => o.status)
                .Select(g => new
                {
                    status = g.Key,
                    orderCount = g.Count(),
                    totalRevenue = g.Sum(o => o.totalAmount)
                })
                .ToList();
            return Ok(stats);
        }

        // Case 9 — Combined Where-filter: status, a date range and a specific
        // user can be mixed freely. Any omitted parameter is skipped, so no
        // arguments returns every order. Mirrors User/filter. Admin-only.
        [Authorize(Roles = "Admin")]
        [HttpGet("filter")]
        public IActionResult FilterOrders(
            string? status = null, DateTime? from = null, DateTime? to = null, int? userId = null)
        {
            var query = _context.Orders
                .Include(o => o.orderItems)
                .Include(o => o.coupon)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(o => o.status == status);

            if (from.HasValue)
                query = query.Where(o => o.orderDate >= from.Value);

            if (to.HasValue)
                query = query.Where(o => o.orderDate <= to.Value);

            if (userId.HasValue)
                query = query.Where(o => o.userId == userId.Value);

            return Ok(query.ToList().Select(o => o.ToDto()));
        }

        // Case 10 — Dashboard stats in one call: grand total sales (Sum), the
        // total order count, and the per-status breakdown (GroupBy: count +
        // revenue). The (decimal?) cast keeps Sum from throwing on an empty set.
        [Authorize(Roles = "Admin")]
        [HttpGet("stats")]
        public IActionResult GetOrderStats()
        {
            var byStatus = _context.Orders
                .GroupBy(o => o.status)
                .Select(g => new
                {
                    status = g.Key,
                    orderCount = g.Count(),
                    totalRevenue = g.Sum(o => o.totalAmount)
                })
                .ToList();

            return Ok(new
            {
                totalSales = _context.Orders.Sum(o => (decimal?)o.totalAmount) ?? 0,
                totalOrders = _context.Orders.Count(),
                byStatus
            });
        }
    }
}
