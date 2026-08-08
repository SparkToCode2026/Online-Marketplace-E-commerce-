using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShippingController : ControllerBase
    {
        private readonly ProjectContext _context;
        public ShippingController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a shipping record for an order (one per order).
        [HttpPost("add")]
        public IActionResult AddShipping(Shipping shipping)
        {
            if (!_context.Orders.Any(o => o.orderId == shipping.orderId))
                return NotFound("Order not found");

            if (_context.Shippings.Any(s => s.orderId == shipping.orderId))
                return Conflict("This order already has a shipping record");

            shipping.status = "Preparing";
            _context.Shippings.Add(shipping);
            _context.SaveChanges();
            return Ok(shipping.shippingId);
        }

        // Case 2 — Update the shipping address.
        [HttpPut("update")]
        public IActionResult UpdateShipping(int id, Shipping updatedShipping)
        {
            var shipping = _context.Shippings.Find(id);
            if (shipping == null)
                return NotFound("Shipping record not found");

            shipping.address = updatedShipping.address;
            _context.SaveChanges();
            return Ok(shipping);
        }

        // Case 3 — Delivery flips the parent order to Completed; the email
        // service will watch this field for its shipping-update trigger.
        [HttpPatch("updateStatus")]
        public IActionResult UpdateShippingStatus(int id, string status)
        {
            var shipping = _context.Shippings.Find(id);
            if (shipping == null)
                return NotFound("Shipping record not found");

            shipping.status = status;

            if (status == "Shipped")
                shipping.shippedAt = DateTime.Now;

            if (status == "Delivered")
            {
                shipping.deliveredAt = DateTime.Now;
                var order = _context.Orders.Find(shipping.orderId);
                order.status = "Completed";
            }

            _context.SaveChanges();
            return Ok(shipping);
        }

        // Case 4 — Delete a shipping record. Blocked once delivered.
        [HttpDelete("delete")]
        public IActionResult DeleteShipping(int id)
        {
            var shipping = _context.Shippings.Find(id);
            if (shipping == null)
                return NotFound("Shipping record not found");

            if (shipping.status == "Delivered")
                return Conflict("Cannot delete a shipping record that has already been delivered");

            _context.Shippings.Remove(shipping);
            _context.SaveChanges();
            return Ok("Shipping record deleted successfully");
        }

        // Case 5 — Get all shipping records, including their order.
        [HttpGet("all")]
        public IActionResult GetAllShippings()
        {
            var shippings = _context.Shippings.Include(s => s.order).ToList();
            return Ok(shippings);
        }

        // Case 6 — Get a single shipping record by id.
        [HttpGet("getById")]
        public IActionResult GetShippingById(int id)
        {
            var shipping = _context.Shippings
                .Include(s => s.order)
                .FirstOrDefault(s => s.shippingId == id);
            if (shipping == null)
                return NotFound("Shipping record not found");
            return Ok(shipping);
        }

        // Case 7 — Filter shipping records by status.
        [HttpGet("byStatus")]
        public IActionResult GetShippingsByStatus(string status)
        {
            var shippings = _context.Shippings
                .Where(s => s.status == status)
                .ToList();
            return Ok(shippings);
        }

        // Case 8 — Aggregate: average delivery time (in days) across all
        // delivered shipments.
        [HttpGet("avgDeliveryTime")]
        public IActionResult GetAverageDeliveryTime()
        {
            var delivered = _context.Shippings
                .Where(s => s.status == "Delivered" && s.shippedAt != null && s.deliveredAt != null)
                .ToList();

            if (!delivered.Any())
                return NotFound("No delivered shipments yet");

            var averageDays = delivered.Average(s => (s.deliveredAt!.Value - s.shippedAt!.Value).TotalDays);
            return Ok(new { averageDeliveryDays = averageDays });
        }
    }
}
