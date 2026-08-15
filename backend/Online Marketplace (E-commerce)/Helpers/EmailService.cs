using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Online_Marketplace__E_commerce_.Helpers
{
    public static class EmailService
    {
        // Swallows send failures on purpose: a broken SMTP connection must
        // never fail the checkout or shipping-update request that triggered it.
        public static void Send(string toEmail, string subject, string body, IConfiguration config)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(config["Smtp:FromName"], config["Smtp:FromEmail"]));
                message.To.Add(MailboxAddress.Parse(toEmail));
                message.Subject = subject;
                message.Body = new TextPart("plain") { Text = body };

                using var client = new SmtpClient();
                client.Connect(config["Smtp:Host"], int.Parse(config["Smtp:Port"]!), SecureSocketOptions.StartTls);
                client.Authenticate(config["Smtp:Username"], config["Smtp:Password"]);
                client.Send(message);
                client.Disconnect(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email to {toEmail} failed: {ex.Message}");
            }
        }
    }
}
