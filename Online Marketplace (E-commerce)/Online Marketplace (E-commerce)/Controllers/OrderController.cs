using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrderController : ControllerBase
    {
        private readonly ProjectContext _context;
        public OrderController(ProjectContext context)
        {
            _context = context;
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
                subtotal += item.product.price * item.quantity;
                orderItems.Add(new OrderItem
                {
                    productId = item.productId,
                    quantity = item.quantity,
                    unitPrice = item.product.price
                });
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

            return Ok(order.orderId);
        }

        // Case 2 — Update an order's status.
        [HttpPut("updateStatus")]
        public IActionResult UpdateStatus(int id, string status)
        {
            var order = _context.Orders.Find(id);

            if (order == null)
                return NotFound("Order not found");

            order.status = status;
            _context.SaveChanges();
            return Ok(order);
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
            return Ok(order);
        }

        // Case 4 — Delete an order. Blocked once it has a payment on record,
        // to keep financial history intact; cancel via status instead.
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
            return Ok(orders);
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

            return Ok(order);
        }

        // Case 7 — Filter orders placed within a date range.
        [HttpGet("byDateRange")]
        public IActionResult GetOrdersByDateRange(DateTime from, DateTime to)
        {
            var orders = _context.Orders
                .Where(o => o.orderDate >= from && o.orderDate <= to)
                .ToList();
            return Ok(orders);
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
    }
}
