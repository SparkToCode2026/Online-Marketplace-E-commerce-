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
