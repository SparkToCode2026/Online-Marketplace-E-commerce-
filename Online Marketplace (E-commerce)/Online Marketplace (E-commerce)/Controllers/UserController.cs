using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    public class UserController : ControllerBase
    {
        private readonly ProjectContext _context;
        public UserController(ProjectContext context)
        {
            _context = context;
        }
        // Case 01 — Register a User
        public  IActionResult AddUser(UserRegister register)
        {
            if (_context.Users.Any(u => u.Email == register.email))
                return BadRequest("Email already registered");
            User user = new User
            {
                Username = register.userName,
                Email = register.email,
                PasswordHash = register.password,
                Phonenumber = 0, // Assuming phone number is optional
                Role = register.role,
                isActive = true
            };
            _context.Users.Add(user);
            _context.SaveChanges();
            return Ok(user.UserId);
        }

    }
}
