using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;
using System.Linq;
using System;
namespace Online_Marketplace__E_commerce_.Controllers
{
   
    public class VendorProfileController : ControllerBase
    {
        private readonly ProjectContext _context;
        public VendorProfileController(ProjectContext context)
        {
            _context = context;
        }


        //case 09 — Register a Vendor Profile
        // POST /vendorprofile/add
        [HttpPost("add")]
        public IActionResult AddVendorProfile(VendorProfile profile)
        {
            var user = _context.Users.FirstOrDefault(u => u.UserId == profile.UserId);
            if (user == null)
                return NotFound("User not found");
            if (user.Role != "Vendor")
                return BadRequest("User role must be Vendor");
            if (_context.VendorProfiles.Any(v => v.UserId == profile.UserId))
                return Conflict("Vendor already has a profile");
            profile.CreatedaAt = DateTime.Now;
            profile.isVerified = false;
            _context.VendorProfiles.Add(profile);
            _context.SaveChanges();
            return Ok(profile.VendorProfileId);
        }

    }
}
