using System.ComponentModel.DataAnnotations;

namespace Online_Marketplace__E_commerce_.DTOs
{
    // طلب الكستمر عشان يصير Vendor.
    // ملاحظة أمان: ما فيه UserId — ناخذ هوية المُقدِّم من الـ JWT داخل
    // الكنترولر، عشان ما يقدر أحد يقدّم طلب باسم مستخدم ثاني.
    public class VendorRequestDto
    {
        [Required(ErrorMessage = "Store name is required")]
        public string StoreName { get; set; }

        [Required(ErrorMessage = "Address is required")]
        public string Address { get; set; }
    }
}
