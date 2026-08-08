using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CouponController : ControllerBase
    {
        private readonly ProjectContext _context;
        public CouponController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a coupon.
        [HttpPost("add")]
        public IActionResult AddCoupon(Coupon coupon)
        {
            if (_context.Coupons.Any(c => c.code == coupon.code))
                return Conflict("A coupon with this code already exists");

            if (coupon.discountPercent <= 0 || coupon.discountPercent > 100)
                return BadRequest("discountPercent must be between 0 and 100");

            if (coupon.expiryDate <= DateTime.Now)
                return BadRequest("expiryDate must be in the future");

            _context.Coupons.Add(coupon);
            _context.SaveChanges();
            return Ok(coupon.couponId);
        }

        // Case 2 — Update a coupon's discount/expiry.
        [HttpPut("update")]
        public IActionResult UpdateCoupon(int id, Coupon updatedCoupon)
        {
            var coupon = _context.Coupons.Find(id);
            if (coupon == null)
                return NotFound("Coupon not found");

            coupon.discountPercent = updatedCoupon.discountPercent;
            coupon.expiryDate = updatedCoupon.expiryDate;
            _context.SaveChanges();
            return Ok(coupon);
        }

        // Case 3 — Deactivate a coupon immediately by expiring it now,
        // instead of adding a separate isActive flag to the model.
        [HttpPatch("expireNow")]
        public IActionResult ExpireCouponNow(int id)
        {
            var coupon = _context.Coupons.Find(id);
            if (coupon == null)
                return NotFound("Coupon not found");

            coupon.expiryDate = DateTime.Now;
            _context.SaveChanges();
            return Ok(coupon);
        }

        // Case 4 — Delete a coupon. Blocked while orders still reference it.
        [HttpDelete("delete")]
        public IActionResult DeleteCoupon(int id)
        {
            var coupon = _context.Coupons.Find(id);
            if (coupon == null)
                return NotFound("Coupon not found");

            if (_context.Orders.Any(o => o.couponId == id))
                return Conflict("Coupon is used by existing orders and cannot be deleted");

            _context.Coupons.Remove(coupon);
            _context.SaveChanges();
            return Ok("Coupon deleted successfully");
        }

        // Case 5 — Get all coupons, including the orders that used them.
        [HttpGet("all")]
        public IActionResult GetAllCoupons()
        {
            var coupons = _context.Coupons.Include(c => c.orders).ToList();
            return Ok(coupons);
        }

        // Case 6 — Get a single coupon by id.
        [HttpGet("getById")]
        public IActionResult GetCouponById(int id)
        {
            var coupon = _context.Coupons
                .Include(c => c.orders)
                .FirstOrDefault(c => c.couponId == id);
            if (coupon == null)
                return NotFound("Coupon not found");
            return Ok(coupon);
        }

        // Case 7 — Filter to only currently valid (not yet expired) coupons.
        [HttpGet("active")]
        public IActionResult GetActiveCoupons()
        {
            var coupons = _context.Coupons
                .Where(c => c.expiryDate >= DateTime.Now)
                .ToList();
            return Ok(coupons);
        }

        // Case 8 — Sort coupons by how many orders have used them.
        [HttpGet("byUsage")]
        public IActionResult GetCouponsByUsage()
        {
            var result = _context.Coupons
                .Select(c => new
                {
                    c.couponId,
                    c.code,
                    usageCount = c.orders.Count()
                })
                .OrderByDescending(c => c.usageCount)
                .ToList();
            return Ok(result);
        }
    }
}
