using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;
using System.Security.Claims;

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
        // ملاحظة: بفضل [ApiController]، أي مخالفة لشروط الـ DataAnnotations
        // في UserRegister ترجّع 400 تلقائياً قبل ما نوصل لهنا.
        [AllowAnonymous]
        [HttpPost("register")]
        public IActionResult Register(UserRegister register)
        {
            if (_context.Users.Any(u => u.Email == register.email))
                return BadRequest("Email already registered");

            // نحدد الـ role: لو المستخدم ما أرسل شي، يصير "Customer" افتراضياً.
            // نسمح بس بـ Customer و Vendor للتسجيل الذاتي — نمنع "Admin"
            // عشان ما يقدر أي أحد يرفّع نفسه لصلاحية أدمن (ثغرة أمنية).
            var role = string.IsNullOrWhiteSpace(register.role) ? "Customer" : register.role;
            if (role != "Customer" && role != "Vendor")
                return BadRequest("Role must be either 'Customer' or 'Vendor'");

            User user = new User
            {
                Username = register.userName,
                Email = register.email,
                PasswordHash = PasswordHasher.Hash(register.password),
                Phonenumber = 0, // Assuming phone number is optional
                Role = role,
                isActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            // لو سجّل كـ Vendor، ننشئ له VendorProfile تلقائياً.
            // السبب: ميثود AddProduct في ProductController يرفض البائع
            // اللي ما عنده profile (يرجّع Forbid). فبإنشائه هنا، البائع
            // يقدر يضيف منتجات مباشرة بعد التسجيل.
            // المتجر يبدأ غير موثّق (isVerified=false) لين الأدمن يعتمده،
            // والبائع يقدر يعدّل اسم المتجر والعنوان لاحقاً.
            if (user.Role == "Vendor")
            {
                var profile = new VendorProfile
                {
                    UserId = user.UserId,
                    StoreName = user.Username + "'s Store",
                    Address = "",
                    CreatedaAt = DateTime.UtcNow,
                    isVerified = false
                };
                _context.VendorProfiles.Add(profile);
                _context.SaveChanges();
            }

            //(self-study): send activation email
            return Ok(user.UserId);
        }
        // case 02 — Update a User
        [HttpPut("update")]
        public IActionResult UpdateUser(int id, UpdateUserRequest dto)
        {
            var user = _context.Users.Find(id);

            if (user == null)
                return NotFound("User not found");
            //test

            user.Username = dto.username;
            user.Phonenumber = dto.phonenumber;

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

        // Combined Where-filter: role, active state and an email/username search
        // can be mixed freely. Any omitted parameter is skipped, so no arguments
        // returns every user.
        [Authorize(Roles = "Admin")]
        [HttpGet("filter")]
        public IActionResult FilterUsers(string? role = null, bool? isActive = null, string? search = null)
        {
            var query = _context.Users.Include(u => u.vendorProfile).AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role);

            if (isActive.HasValue)
                query = query.Where(u => u.isActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => u.Email.Contains(search) || u.Username.Contains(search));

            return Ok(query.ToList().Select(u => u.ToDto()));
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

        // Dashboard stats: per-role counts, the grand total, and the newest
        // registrations ordered by CreatedAt.
        [Authorize(Roles = "Admin")]
        [HttpGet("stats")]
        public IActionResult GetUserStats()
        {
            var byRole = _context.Users
                .GroupBy(u => u.Role)
                .Select(g => new { role = g.Key, count = g.Count() })
                .ToList();

            var recent = _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .ToList()
                .Select(u => u.ToDto());

            return Ok(new
            {
                total = _context.Users.Count(),
                byRole,
                recent
            });
        }

        // ===== Vendor upgrade flow: Customer يقدّم طلب، Admin يقبل/يرفض =====

        // الكستمر يقدّم طلب يصير Vendor.
        // ناخذ هويته من الـ JWT (مو من الـ body) عشان ما يقدّم باسم غيره.
        // النتيجة: VendorProfile غير موثّق، والـ role يظل Customer لين
        // الأدمن يوافق.
        [Authorize]
        [HttpPost("request-vendor")]
        public IActionResult RequestVendor(VendorRequestDto dto)
        {
            // NameIdentifier = الـ UserId المخزّن داخل التوكن وقت تسجيل الدخول.
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));

            var user = _context.Users.Find(callerId);
            if (user == null)
                return NotFound("User not found");

            // بس الكستمر يقدّم — البائع والأدمن مالهم داعي.
            if (user.Role != "Customer")
                return BadRequest("Only customers can request to become a vendor");

            // لو عنده profile أصلاً (طلب سابق معلّق أو صار بائع)، ما نكرّر.
            if (_context.VendorProfiles.Any(v => v.UserId == callerId))
                return Conflict("You already have a pending or existing vendor profile");

            var profile = new VendorProfile
            {
                UserId = callerId,
                StoreName = dto.StoreName,
                Address = dto.Address,
                CreatedaAt = DateTime.UtcNow,
                isVerified = false // معلّق لين الأدمن يوافق
            };
            _context.VendorProfiles.Add(profile);
            _context.SaveChanges();

            return Ok("Vendor request submitted. Waiting for admin approval.");
        }

        // الأدمن يشوف الطلبات المعلّقة: profile غير موثّق وصاحبه لسه Customer.
        // (نستثني البائعين اللي انسجّلوا Vendor مباشرة وما تحققوا بعد.)
        [Authorize(Roles = "Admin")]
        [HttpGet("vendor-requests")]
        public IActionResult GetVendorRequests()
        {
            var pending = _context.VendorProfiles
                .Include(v => v.Users)
                .Where(v => !v.isVerified && v.Users.Role == "Customer")
                .ToList();

            return Ok(pending.Select(v => v.ToDto()));
        }

        // الأدمن يوافق: نرفّع دور المستخدم إلى Vendor ونوثّق متجره.
        [Authorize(Roles = "Admin")]
        [HttpPut("approve-vendor")]
        public IActionResult ApproveVendor(int userId)
        {
            var user = _context.Users.Find(userId);
            if (user == null)
                return NotFound("User not found");

            var profile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == userId);
            if (profile == null)
                return NotFound("No vendor request found for this user");

            user.Role = "Vendor";     // الترقية الفعلية
            profile.isVerified = true; // اعتماد المتجر

            _context.SaveChanges();
            return Ok("Vendor request approved");
        }

        // الأدمن يرفض: نحذف الـ profile المعلّق (يقدر يعيد التقديم لاحقاً).
        [Authorize(Roles = "Admin")]
        [HttpDelete("reject-vendor")]
        public IActionResult RejectVendor(int userId)
        {
            var profile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == userId);
            if (profile == null)
                return NotFound("No vendor request found for this user");

            // نحذف بس لو لسه معلّق (ما نحذف متجر بائع معتمد بالغلط).
            if (profile.isVerified)
                return BadRequest("This vendor is already approved; cannot reject");

            _context.VendorProfiles.Remove(profile);
            _context.SaveChanges();
            return Ok("Vendor request rejected");
        }




    }
}
