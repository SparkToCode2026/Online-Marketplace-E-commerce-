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
        [HttpPost("add")]
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
            
            //(self-study): send activation email
            return Ok(user.UserId);
        }
        // case 02 — Update a User
        [HttpPut("update")]
        public IActionResult UpdateUser(int id, User updatedUser)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            user.Username = updatedUser.Username;
            user.Phonenumber = updatedUser.Phonenumber;
            _context.SaveChanges();
            return Ok(user);
        }
        // case 3 — Change a User's Role
        [HttpPut("changeRole")]
        public IActionResult ChangeUserRole(int id, string newRole)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            user.Role = newRole;
            _context.SaveChanges();
            return Ok(user);
        }

        // case 4 — Deactivate a User
        // DELETE /user/remove 
        [HttpDelete("remove")]
        public IActionResult DeactivateUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            user.isActive = false;
            _context.SaveChanges();
          
            return Ok("User deactivated successfully");
        }

        // case 5 — Reactivate a User
        public IActionResult ReactivateUser(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            user.isActive = true;
            _context.SaveChanges();
            return Ok("User reactivated successfully");
        }

        // case 6 — Get all users
        // GET /user/getAll
        [HttpGet("getAll")]

        public IActionResult GetAllUsers()
        {
            var users = _context.Users.ToList();
            return Ok(users);
        }

        // case 7 — Get a user by ID
        [HttpGet("getById")]
        public IActionResult GetUserById(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            return Ok(user);
        }

        // case 8 — Get users by role
        [HttpGet("getByRole")]
        public IActionResult GetUsersByRole(string role)
        {
            var users = _context.Users.Where(u => u.Role == role).ToList();
            return Ok(users);
        }





    }
}
