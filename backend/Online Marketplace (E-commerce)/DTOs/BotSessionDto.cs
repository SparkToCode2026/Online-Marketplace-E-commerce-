using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // Sent by the WhatsApp bot to open a shopping session for the person who messaged it.
    public class BotSessionDto
    {
        // The sender's number as WhatsApp gives it, e.g. "96891234567".
        [Required(ErrorMessage = "Phone is required")]
        public string phone { get; set; }

        // The sender's WhatsApp profile name, used as the username of a new customer.
        public string? name { get; set; }
    }
}
