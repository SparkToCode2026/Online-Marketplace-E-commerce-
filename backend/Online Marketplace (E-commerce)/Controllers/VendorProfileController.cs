using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;
using System.Linq;
using System;
using System.Security.Claims;
namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VendorProfileController : ControllerBase
    {
        private readonly ProjectContext _context;
        public VendorProfileController(ProjectContext context)
        {
            _context = context;
        }


        //case 1 — Register a Vendor Profile
        // POST /vendorprofile/add
        // الأدمن ينشئ بروفايل لأي مستخدم؛ البائع ينشئ بروفايله هو بس.
        [Authorize(Roles = "Admin,Vendor")]
        [HttpPost("add")]
        public IActionResult AddVendorProfile(VendorProfileCreateDto dto)
        {
            // ownership: غير الأدمن ما يقدر ينشئ بروفايل باسم userId ثاني.
            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role != "Admin" && dto.UserId != callerId)
                return Forbid();

            var user = _context.Users.FirstOrDefault(u => u.UserId == dto.UserId);

            if (user == null)
                return NotFound("User not found");

            if (user.Role != "Vendor")
                return BadRequest("User role must be Vendor");

            if (_context.VendorProfiles.Any(v => v.UserId == dto.UserId))
                return Conflict("Vendor already has a profile");

            var profile = new VendorProfile
            {
                StoreName = dto.StoreName,
                Address = dto.Address,
                UserId = dto.UserId,
                CreatedaAt = DateTime.Now,
                isVerified = false
            };
            _context.VendorProfiles.Add(profile);
            _context.SaveChanges();
            return Ok(profile.VendorProfileId);
        }

        //case 2 — Update a Vendor Profile
        //PUT /vendorprofile/update

        [Authorize(Roles = "Admin,Vendor")]
        [HttpPut("update")]
        public IActionResult UpdateVendorProfile(int id, VendorProfileUpdateDto dto)
        {
            var profile = _context.VendorProfiles.Find(id);

            if (profile == null)
                return NotFound("Vendor profile not found");

            // ownership: البائع يعدّل بروفايله هو بس؛ الأدمن يعدّل أي بروفايل.
            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role != "Admin" && profile.UserId != callerId)
                return Forbid();

            profile.StoreName = dto.StoreName;
            profile.Address = dto.Address;

            _context.SaveChanges();
            return Ok(profile.ToDto());
        }
        //case 3 — Verify a Vendor Profile
        [Authorize(Roles = "Admin")]
        [HttpPatch("verify")]
        public IActionResult VerifyVendorProfile(int id)
        {
            var profile = _context.VendorProfiles.Find(id);

            if (profile == null)
                return NotFound("Vendor profile not found");

            profile.isVerified = true;

            _context.SaveChanges();
            return Ok("Vendor profile verified successfully");
        }

        //case 4 — Delete a Vendor Profile
        [Authorize(Roles = "Admin")]
        [HttpDelete("delete")]
        public IActionResult DeleteVendorProfile(int id)
        {
            var profile = _context.VendorProfiles.Find(id);

            if (profile == null)
                return NotFound("Vendor profile not found");

            _context.VendorProfiles.Remove(profile);
            _context.SaveChanges();

            return Ok("Vendor profile deleted successfully");
        }

        //case 5 — Get all Vendor Profiles
        [HttpGet("all")]
        public IActionResult GetAllVendorProfiles()
        {
            var profiles = _context.VendorProfiles.Include(v => v.Users).ToList();
            return Ok(profiles.Select(v => v.ToDto()));
        }

        // case 6 — Get a Vendor Profile by ID
        [HttpGet("Getbyid")]
        public IActionResult GetVendorProfileById(int id)
        {
            var profile = _context.VendorProfiles.Include(v => v.Users).FirstOrDefault(v => v.VendorProfileId == id);

            if (profile == null)
                return NotFound("Vendor profile not found");

            return Ok(profile.ToDto());
        }

        // case 7 — Filter vendor profiles by verification status.
        [HttpGet("byVerification")]
        public IActionResult GetVendorProfilesByVerification(bool isVerified)
        {
            var profiles = _context.VendorProfiles
                .Where(v => v.isVerified == isVerified)
                .Include(v => v.Users)
                .ToList();

            return Ok(profiles.Select(v => v.ToDto()));
        }

        // case 9 — Combined Where-filter: verification state and a store-name
        // search can be mixed freely. Any omitted parameter is skipped, so no
        // arguments returns every profile. Mirrors User/filter.
        [Authorize(Roles = "Admin")]
        [HttpGet("filter")]
        public IActionResult FilterVendorProfiles(bool? isVerified = null, string? search = null)
        {
            var query = _context.VendorProfiles.Include(v => v.Users).AsQueryable();

            if (isVerified.HasValue)
                query = query.Where(v => v.isVerified == isVerified.Value);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(v => v.StoreName.Contains(search));

            return Ok(query.ToList().Select(v => v.ToDto()));
        }

        // case 10 — Top vendors leaderboard. Each row carries both metrics
        // (product count via GroupBy+Count, and average rating aggregated over
        // Reviews -> Products -> vendor), and `by` picks which one to rank by.
        //   by=products (default) -> most products first
        //   by=rating            -> highest average rating first
        [Authorize(Roles = "Admin")]
        [HttpGet("top")]
        public IActionResult GetTopVendors(string by = "products", int take = 10)
        {
            // Products per vendor: GroupBy the vendor FK, then Count.
            var productCounts = _context.Products
                .GroupBy(p => p.vendorProfileId)
                .Select(g => new { vpid = g.Key, count = g.Count() })
                .ToDictionary(x => x.vpid, x => x.count);

            // Average rating per vendor: project each review down to its vendor
            // (via the product), then GroupBy + Average/Count.
            var ratingStats = _context.Reviews
                .Select(r => new { r.rating, vpid = r.product!.vendorProfileId })
                .GroupBy(x => x.vpid)
                .Select(g => new { vpid = g.Key, avg = g.Average(x => x.rating), reviews = g.Count() })
                .ToList()
                .ToDictionary(x => x.vpid, x => x);

            var vendors = _context.VendorProfiles.Include(v => v.Users).ToList();

            var rows = vendors.Select(v => new
            {
                vendorProfileId = v.VendorProfileId,
                storeName = v.StoreName,
                isVerified = v.isVerified,
                owner = v.Users?.Username,
                productCount = productCounts.TryGetValue(v.VendorProfileId, out var c) ? c : 0,
                averageRating = ratingStats.TryGetValue(v.VendorProfileId, out var rs) ? Math.Round(rs.avg, 2) : 0d,
                reviewCount = ratingStats.TryGetValue(v.VendorProfileId, out var rs2) ? rs2.reviews : 0,
            });

            var ordered = by?.ToLower() == "rating"
                ? rows.OrderByDescending(r => r.averageRating).ThenByDescending(r => r.reviewCount)
                : rows.OrderByDescending(r => r.productCount);

            return Ok(ordered.Take(take).ToList());
        }

        //case 8 -Get Newest Vendor Profiles
        [HttpGet("newest")]
        public IActionResult GetNewestVendorProfiles()
        {
            var profiles = _context.VendorProfiles
                .OrderByDescending(v => v.CreatedaAt)
                .Take(5)
                .Include(v => v.Users)
                .ToList();

            return Ok(profiles.Select(v => v.ToDto()));
        }

    }
}
