using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    // Endpoints for the WhatsApp shopping bot. The bot isn't a logged-in user,
    // so instead of a JWT it proves who it is with a shared secret (Bot:Key)
    // sent in the X-Bot-Key header.
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class BotController : ControllerBase
    {
        private readonly ProjectContext _context;
        private readonly IConfiguration _configuration;
        public BotController(ProjectContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // Opens a shopping session for the person who messaged the bot.
        // Finds the customer with this phone number (or registers one, with a cart)
        // and returns a JWT for them, so the bot can call the normal
        // Cart/Order/Payment endpoints exactly like the website does.
        [HttpPost("session")]
        public IActionResult Session(BotSessionDto dto)
        {
            if (!HasValidKey())
                return Unauthorized("Invalid bot key");

            // WhatsApp sends Omani numbers as 968 + 8 digits; the store saves the 8 digits.
            // ponytail: Phonenumber is an int, so only Omani numbers fit; change the column
            // to a string if customers from other countries need to order.
            var digits = new string(dto.phone.Where(char.IsDigit).ToArray());
            if (digits.Length == 11 && digits.StartsWith("968"))
                digits = digits[3..];
            // Omani numbers never start with 0. Website users without a number are saved
            // as 0, so this also stops "00000000" from matching one of them.
            if (digits.Length != 8 || digits[0] == '0')
                return BadRequest("Only Omani phone numbers are supported");
            var phone = int.Parse(digits);

            var user = _context.Users
                .Include(u => u.cart)
                .FirstOrDefault(u => u.Phonenumber == phone);

            if (user == null)
            {
                user = new User
                {
                    Username = string.IsNullOrWhiteSpace(dto.name) ? "WhatsApp " + digits : dto.name,
                    // The model needs an email and a password, but this customer only shops
                    // on WhatsApp: a placeholder email and a random password nobody ever sees
                    // mean the account can't be used to log in to the website.
                    Email = digits + "@whatsapp.local",
                    PasswordHash = PasswordHasher.Hash(Convert.ToHexString(RandomNumberGenerator.GetBytes(32))),
                    Phonenumber = phone,
                    Role = "Customer",
                    isActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
            }

            // Same rules as the website: only active customers can shop.
            if (user.Role != "Customer")
                return BadRequest("This number belongs to a staff account");
            if (!user.isActive)
                return Unauthorized("Account is deactivated");

            user.cart ??= new Cart { createdAt = DateTime.Now };
            _context.SaveChanges();

            return Ok(new
            {
                token = JwtTokenGenerator.GenerateToken(user, _configuration),
                userId = user.UserId,
                cartId = user.cart.cartId,
                name = user.Username
            });
        }

        // Compares the X-Bot-Key header with Bot:Key in constant time, so the key can't
        // be guessed by measuring response times. With no Bot:Key set, the bot is switched off.
        private bool HasValidKey()
        {
            var key = _configuration["Bot:Key"];
            var sent = Request.Headers["X-Bot-Key"].ToString();
            return !string.IsNullOrEmpty(key)
                && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sent), Encoding.UTF8.GetBytes(key));
        }
    }
}
