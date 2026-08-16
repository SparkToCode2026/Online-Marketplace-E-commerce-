using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.Models
{
    // DTO لتسجيل مستخدم جديد.
    // ملاحظة مهمة: الكنترولر عليه [ApiController]، ومعناها إن ASP.NET
    // يفحص هذي الـ DataAnnotations تلقائياً قبل ما يدخل كود الميثود.
    // لو أي حقل خالف الشرط، يرجّع 400 Bad Request بنفسه — بدون ما نكتب أي if.
    public class UserRegister
    {
        // [Required] يمنع القيمة الفاضية أو null.
        [Required(ErrorMessage = "Username is required")]
        public string userName { get; set; }

        // [EmailAddress] يتأكد إن الصيغة إيميل صحيح (فيه @ ونطاق).
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string email { get; set; }

        // نفرض حد أدنى لطول الباسورد عشان الأمان.
        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string password { get; set; }

        // الـ role اختياري: لو تركه المستخدم فاضي، بنعطيه "Customer" افتراضياً
        // داخل الكنترولر. الفحص الفعلي لقيمة الـ role يصير بالكنترولر
        // (نسمح بس بـ Customer/Vendor) عشان نمنع أحد يسجّل نفسه Admin.
        public string? role { get; set; }
    }
}
