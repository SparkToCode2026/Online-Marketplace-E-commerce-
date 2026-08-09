using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly ProjectContext _context;
        private readonly IConfiguration _configuration;
        public UserController(ProjectContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Login — verifies credentials and issues a JWT.
        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login(LoginRequest request)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == request.email);

            if (user == null || !PasswordHasher.Verify(request.password, user.PasswordHash))
                return Unauthorized("Invalid email or password");

            if (!user.isActive)
                return Unauthorized("Account is deactivated");

            var token = JwtTokenGenerator.GenerateToken(user, _configuration);

            return Ok(new { token, userId = user.UserId, role = user.Role });
        }

        // Case 01 — Register a new user.
        [AllowAnonymous]
        [HttpPost("register")]
        public IActionResult Register(UserRegister register)
        {
            if (_context.Users.Any(u => u.Email == register.email))
                return BadRequest("Email already registered");

            User user = new User
            {
                Username = register.userName,
                Email = register.email,
                PasswordHash = PasswordHasher.Hash(register.password),
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
            return Ok(user.ToDto());
        }
        // case 3 — Change a User's Role
        [Authorize(Roles = "Admin")]
        [HttpPut("changeRole")]
        public IActionResult ChangeUserRole(int id, string newRole)
        {
            var user = _context.Users.Find(id);

            if (user == null)
                return NotFound("User not found");

            user.Role = newRole;
            _context.SaveChanges();

            return Ok(user.ToDto());
        }

        // case 4 — Deactivate a User
        [Authorize(Roles = "Admin")]
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

        // case 5 — Reactivate a User. Had no route at all before this, so
        // it was unreachable regardless of authorization.
        [Authorize(Roles = "Admin")]
        [HttpPut("reactivate")]
        public IActionResult ReactivateUser(int id)
        {
            var user = _context.Users.Find(id);

            if (user == null)
                return NotFound("User not found");

            user.isActive = true;

            _context.SaveChanges();

            return Ok("User reactivated successfully");
        }

        // case 6 — Get all users, including their vendor profile if any.
        [Authorize(Roles = "Admin")]
        [HttpGet("getAll")]
        public IActionResult GetAllUsers()
        {
            var users = _context.Users.Include(u => u.vendorProfile).ToList();
            return Ok(users.Select(u => u.ToDto()));
        }

        // case 7 — Get a user by ID
        [HttpGet("getById")]
        public IActionResult GetUserById(int id)
        {
            var user = _context.Users.Find(id);
            if (user == null)
                return NotFound("User not found");
            return Ok(user.ToDto());
        }

        // case 8 — Get users by role
        [Authorize(Roles = "Admin")]
        [HttpGet("getByRole")]
        public IActionResult GetUsersByRole(string role)
        {
            var users = _context.Users.Where(u => u.Role == role).ToList();
            return Ok(users.Select(u => u.ToDto()));
        }

        // Aggregate: number of users per role.
        [Authorize(Roles = "Admin")]
        [HttpGet("countByRole")]
        public IActionResult GetUserCountByRole()
        {
            var counts = _context.Users
                .GroupBy(u => u.Role)
                .Select(g => new { role = g.Key, count = g.Count() })
                .ToList();

            return Ok(counts);
        }







    }
}
