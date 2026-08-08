using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrderItemController : ControllerBase
    {
        private readonly ProjectContext _context;
        public OrderItemController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Add a line item to an order that hasn't shipped yet.
        [HttpPost("add")]
        public IActionResult AddOrderItem(OrderItem orderItem)
        {
            var order = _context.Orders
                .Include(o => o.orderItems)
                .FirstOrDefault(o => o.orderId == orderItem.orderId);
            if (order == null)
                return NotFound("Order not found");
            if (order.status != "Pending")
                return BadRequest("Cannot modify items on an order that is no longer pending");

            var product = _context.Products.Find(orderItem.productId);
            if (product == null)
                return NotFound("Product not found");

            orderItem.unitPrice = product.price;
            _context.OrderItems.Add(orderItem);
            RecalculateOrderTotal(order);
            _context.SaveChanges();
            return Ok(orderItem.orderItemId);
        }

        // Case 2 — Update a line item's quantity.
        [HttpPut("update")]
        public IActionResult UpdateOrderItem(int id, int quantity)
        {
            if (quantity <= 0)
                return BadRequest("quantity must be greater than 0");

            var item = _context.OrderItems
                .Include(oi => oi.order)
                .ThenInclude(o => o.orderItems)
                .FirstOrDefault(oi => oi.orderItemId == id);
            if (item == null)
                return NotFound("Order item not found");

            item.quantity = quantity;
            RecalculateOrderTotal(item.order);
            _context.SaveChanges();
            return Ok(item);
        }

        // Case 3 — Correct a line item's price (e.g. a billing mistake).
        // Deliberately a different kind of update than a quantity change.
        [HttpPatch("correctPrice")]
        public IActionResult CorrectPrice(int id, decimal correctedUnitPrice)
        {
            if (correctedUnitPrice <= 0)
                return BadRequest("correctedUnitPrice must be greater than 0");

            var item = _context.OrderItems
                .Include(oi => oi.order)
                .ThenInclude(o => o.orderItems)
                .FirstOrDefault(oi => oi.orderItemId == id);
            if (item == null)
                return NotFound("Order item not found");

            item.unitPrice = correctedUnitPrice;
            RecalculateOrderTotal(item.order);
            _context.SaveChanges();
            return Ok(item);
        }

        // Case 4 — Remove a line item from an order that hasn't shipped yet.
        [HttpDelete("remove")]
        public IActionResult RemoveOrderItem(int id)
        {
            var item = _context.OrderItems
                .Include(oi => oi.order)
                .ThenInclude(o => o.orderItems)
                .FirstOrDefault(oi => oi.orderItemId == id);
            if (item == null)
                return NotFound("Order item not found");
            if (item.order.status != "Pending")
                return BadRequest("Cannot modify items on an order that is no longer pending");

            var order = item.order;
            _context.OrderItems.Remove(item);
            RecalculateOrderTotal(order);
            _context.SaveChanges();
            return Ok("Order item removed successfully");
        }

        // Case 5 — Get all order items, including their order and product.
        [HttpGet("all")]
        public IActionResult GetAllOrderItems()
        {
            var items = _context.OrderItems
                .Include(oi => oi.order)
                .Include(oi => oi.product)
                .ToList();
            return Ok(items);
        }

        // Case 6 — Get a single order item by id.
        [HttpGet("getById")]
        public IActionResult GetOrderItemById(int id)
        {
            var item = _context.OrderItems
                .Include(oi => oi.order)
                .Include(oi => oi.product)
                .FirstOrDefault(oi => oi.orderItemId == id);
            if (item == null)
                return NotFound("Order item not found");
            return Ok(item);
        }

        // Case 7 — Every order line that included a given product.
        [HttpGet("byProduct")]
        public IActionResult GetItemsByProduct(int productId)
        {
            var items = _context.OrderItems
                .Include(oi => oi.order)
                .Where(oi => oi.productId == productId)
                .ToList();
            return Ok(items);
        }

        // Case 8 — Aggregate: total revenue generated by each product, a
        // monetary counterpart to Product.bestSellers (which counts units).
        [HttpGet("revenueByProduct")]
        public IActionResult GetRevenueByProduct()
        {
            var revenue = _context.OrderItems
                .GroupBy(oi => oi.productId)
                .Select(g => new
                {
                    productId = g.Key,
                    totalRevenue = g.Sum(oi => oi.unitPrice * oi.quantity)
                })
                .OrderByDescending(x => x.totalRevenue)
                .ToList();
            return Ok(revenue);
        }

        // Computed in memory, not via a fresh query, since a DB query would
        // miss pending unsaved changes; caller must Include orderItems first.
        private void RecalculateOrderTotal(Order order)
        {
            order.totalAmount = order.orderItems.Sum(oi => oi.unitPrice * oi.quantity);
        }
    }
}
