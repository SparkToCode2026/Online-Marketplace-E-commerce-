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

        //case 10 — Update a Vendor Profile
        //PUT /vendorprofile/update

        [HttpPut("update")]
        public IActionResult UpdateVendorProfile(int id, VendorProfile updatedProfile)
        {
            var profile = _context.VendorProfiles.Find(id);
            if (profile == null)
                return NotFound("Vendor profile not found");
            profile.StoreName = updatedProfile.StoreName;
            profile.Address = updatedProfile.Address;
            _context.SaveChanges();
            return Ok(profile);
        }
        //case 11 — Verify a Vendor Profile
        [HttpPatch("verify")]
        public IActionResult DeleteVendorProfile(int id)
        {
            var profile = _context.VendorProfiles.Find(id);
            if (profile == null)
                return NotFound("Vendor profile not found");
            _context.VendorProfiles.Remove(profile);
            _context.SaveChanges();
            return Ok("Vendor profile deleted successfully");
        }

        //case 12 — Delete a Vendor Profile
        [HttpDelete("delete")]
        public IActionResult VerifyVendorProfile(int id)
        {
            var profile = _context.VendorProfiles.Find(id);
            if (profile == null)
                return NotFound("Vendor profile not found");
            profile.isVerified = true;
            _context.SaveChanges();
            return Ok("Vendor profile verified successfully");
        }

        //case 13 — Get all Vendor Profiles
        [HttpGet("all")]
        public IActionResult GetAllVendorProfiles()
        {
            var profiles = _context.VendorProfiles.Include(v => v.Users).ToList();
            return Ok(profiles);
        }

        // case 14 — Get a Vendor Profile by ID
        [HttpGet("Getbyid")]
        public IActionResult GetVendorProfileById(int id)
        {
            var profile = _context.VendorProfiles.Include(v => v.Users).FirstOrDefault(v => v.VendorProfileId == id);
            if (profile == null)
                return NotFound("Vendor profile not found");
            return Ok(profile);
        }


    }
}
