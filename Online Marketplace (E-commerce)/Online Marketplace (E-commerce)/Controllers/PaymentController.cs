using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly ProjectContext _context;
        public PaymentController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Record a payment for an order (one payment per order).
        [HttpPost("add")]
        public IActionResult AddPayment(Payment payment)
        {
            var order = _context.Orders.Find(payment.orderId);
            if (order == null)
                return NotFound("Order not found");

            if (_context.Payments.Any(p => p.orderId == payment.orderId))
                return Conflict("This order already has a payment on record");

            if (payment.amount != order.totalAmount)
                return BadRequest("amount must match the order's totalAmount");

            payment.paidAt = DateTime.Now;
            _context.Payments.Add(payment);
            _context.SaveChanges();
            return Ok(payment.paymentId);
        }

        // Case 2 — Update a payment's method/amount (data correction).
        [HttpPut("update")]
        public IActionResult UpdatePayment(int id, Payment updatedPayment)
        {
            var payment = _context.Payments.Find(id);
            if (payment == null)
                return NotFound("Payment not found");

            payment.method = updatedPayment.method;
            payment.amount = updatedPayment.amount;
            _context.SaveChanges();
            return Ok(payment);
        }

        // Case 3 — Change a payment's status. Completing a payment also
        // confirms its order, linking the two models through a status change.
        [HttpPatch("updateStatus")]
        public IActionResult UpdatePaymentStatus(int id, string status)
        {
            var payment = _context.Payments.Find(id);
            if (payment == null)
                return NotFound("Payment not found");

            payment.status = status;

            if (status == "Completed")
            {
                var order = _context.Orders.Find(payment.orderId);
                order.status = "Confirmed";
            }

            _context.SaveChanges();
            return Ok(payment);
        }

        // Case 4 — Delete a payment. Blocked once it's Completed, since a
        // successful payment should be refunded, not erased.
        [HttpDelete("delete")]
        public IActionResult DeletePayment(int id)
        {
            var payment = _context.Payments.Find(id);
            if (payment == null)
                return NotFound("Payment not found");

            if (payment.status == "Completed")
                return Conflict("Cannot delete a completed payment. Refund it instead.");

            _context.Payments.Remove(payment);
            _context.SaveChanges();
            return Ok("Payment deleted successfully");
        }

        // Case 5 — Get all payments, including their order.
        [HttpGet("all")]
        public IActionResult GetAllPayments()
        {
            var payments = _context.Payments.Include(p => p.order).ToList();
            return Ok(payments);
        }

        // Case 6 — Get a single payment by id.
        [HttpGet("getById")]
        public IActionResult GetPaymentById(int id)
        {
            var payment = _context.Payments
                .Include(p => p.order)
                .FirstOrDefault(p => p.paymentId == id);
            if (payment == null)
                return NotFound("Payment not found");
            return Ok(payment);
        }

        // Case 7 — Filter payments by status.
        [HttpGet("byStatus")]
        public IActionResult GetPaymentsByStatus(string status)
        {
            var payments = _context.Payments
                .Where(p => p.status == status)
                .ToList();
            return Ok(payments);
        }

        // Case 8 — Aggregate: total amount collected per payment method.
        [HttpGet("revenueByMethod")]
        public IActionResult GetRevenueByMethod()
        {
            var revenue = _context.Payments
                .GroupBy(p => p.method)
                .Select(g => new { method = g.Key, totalAmount = g.Sum(p => p.amount) })
                .OrderByDescending(x => x.totalAmount)
                .ToList();
            return Ok(revenue);
        }
    }
}
