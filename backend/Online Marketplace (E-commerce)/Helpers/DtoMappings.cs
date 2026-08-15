using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Helpers
{
    // Central place that maps entities to their response DTOs.
    //
    // Each entity has two mappers:
    //   ToDto()     - maps scalar fields plus any navigation the endpoints load.
    //   ToDtoFlat() - maps scalar fields only, used when the entity is nested
    //                 inside another DTO. Keeping the nested form flat is what
    //                 prevents the reference cycles that [JsonIgnore] used to
    //                 break (e.g. Category -> Products -> Category -> ...).
    public static class DtoMappings
    {
        // ---------- User ----------
        public static UserDto ToDto(this User u) => new()
        {
            UserId = u.UserId,
            Username = u.Username,
            Email = u.Email,
            Phonenumber = u.Phonenumber,
            Role = u.Role,
            isActive = u.isActive,
            vendorProfile = u.vendorProfile?.ToDtoFlat()
        };

        public static UserDto ToDtoFlat(this User u) => new()
        {
            UserId = u.UserId,
            Username = u.Username,
            Email = u.Email,
            Phonenumber = u.Phonenumber,
            Role = u.Role,
            isActive = u.isActive
        };

        // ---------- VendorProfile ----------
        public static VendorProfileDto ToDto(this VendorProfile v) => new()
        {
            VendorProfileId = v.VendorProfileId,
            StoreName = v.StoreName,
            Address = v.Address,
            CreatedaAt = v.CreatedaAt,
            UserId = v.UserId,
            isVerified = v.isVerified,
            Users = v.Users?.ToDtoFlat()
        };

        public static VendorProfileDto ToDtoFlat(this VendorProfile v) => new()
        {
            VendorProfileId = v.VendorProfileId,
            StoreName = v.StoreName,
            Address = v.Address,
            CreatedaAt = v.CreatedaAt,
            UserId = v.UserId,
            isVerified = v.isVerified
        };

        // ---------- Product ----------
        public static ProductDto ToDto(this Product p) => new()
        {
            productId = p.productId,
            name = p.name,
            description = p.description,
            productUrl = p.productUrl,
            price = p.price,
            stockQuantity = p.stockQuantity,
            isActive = p.isActive,
            createdAt = p.createdAt,
            categoryId = p.categoryId,
            category = p.category?.ToDtoFlat(),
            vendorProfileId = p.vendorProfileId,
            vendorProfile = p.vendorProfile?.ToDtoFlat()
        };

        public static ProductDto ToDtoFlat(this Product p) => new()
        {
            productId = p.productId,
            name = p.name,
            description = p.description,
            productUrl = p.productUrl,
            price = p.price,
            stockQuantity = p.stockQuantity,
            isActive = p.isActive,
            createdAt = p.createdAt,
            categoryId = p.categoryId,
            vendorProfileId = p.vendorProfileId
        };

        // ---------- Category ----------
        public static CategoryDto ToDto(this Category c) => new()
        {
            categoryId = c.categoryId,
            name = c.name,
            description = c.description,
            products = c.products?.Select(p => p.ToDtoFlat()).ToList()
        };

        public static CategoryDto ToDtoFlat(this Category c) => new()
        {
            categoryId = c.categoryId,
            name = c.name,
            description = c.description
        };

        // ---------- Cart ----------
        public static CartDto ToDto(this Cart c) => new()
        {
            cartId = c.cartId,
            userId = c.userId,
            createdAt = c.createdAt,
            user = c.user?.ToDtoFlat(),
            cartItems = c.cartItems?.Select(ci => ci.ToDto()).ToList()
        };

        public static CartDto ToDtoFlat(this Cart c) => new()
        {
            cartId = c.cartId,
            userId = c.userId,
            createdAt = c.createdAt
        };

        // ---------- CartItem ----------
        public static CartItemDto ToDto(this CartItem ci) => new()
        {
            cartItemId = ci.cartItemId,
            cartId = ci.cartId,
            productId = ci.productId,
            quantity = ci.quantity,
            product = ci.product?.ToDtoFlat(),
            cart = ci.cart?.ToDtoFlat()
        };

        // ---------- Coupon ----------
        public static CouponDto ToDto(this Coupon c) => new()
        {
            couponId = c.couponId,
            code = c.code,
            discountPercent = c.discountPercent,
            expiryDate = c.expiryDate,
            orders = c.orders?.Select(o => o.ToDtoFlat()).ToList()
        };

        public static CouponDto ToDtoFlat(this Coupon c) => new()
        {
            couponId = c.couponId,
            code = c.code,
            discountPercent = c.discountPercent,
            expiryDate = c.expiryDate
        };

        // ---------- Order ----------
        public static OrderDto ToDto(this Order o) => new()
        {
            orderId = o.orderId,
            userId = o.userId,
            couponId = o.couponId,
            status = o.status,
            orderDate = o.orderDate,
            totalAmount = o.totalAmount,
            orderItems = o.orderItems?.Select(oi => oi.ToDtoFlat()).ToList(),
            coupon = o.coupon?.ToDtoFlat(),
            payment = o.payment?.ToDtoFlat(),
            shipping = o.shipping?.ToDtoFlat()
        };

        public static OrderDto ToDtoFlat(this Order o) => new()
        {
            orderId = o.orderId,
            userId = o.userId,
            couponId = o.couponId,
            status = o.status,
            orderDate = o.orderDate,
            totalAmount = o.totalAmount
        };

        // ---------- OrderItem ----------
        public static OrderItemDto ToDto(this OrderItem oi) => new()
        {
            orderItemId = oi.orderItemId,
            orderId = oi.orderId,
            productId = oi.productId,
            quantity = oi.quantity,
            unitPrice = oi.unitPrice,
            product = oi.product?.ToDtoFlat(),
            order = oi.order?.ToDtoFlat()
        };

        public static OrderItemDto ToDtoFlat(this OrderItem oi) => new()
        {
            orderItemId = oi.orderItemId,
            orderId = oi.orderId,
            productId = oi.productId,
            quantity = oi.quantity,
            unitPrice = oi.unitPrice
        };

        // ---------- Payment ----------
        public static PaymentDto ToDto(this Payment p) => new()
        {
            paymentId = p.paymentId,
            orderId = p.orderId,
            amount = p.amount,
            method = p.method,
            status = p.status,
            paidAt = p.paidAt,
            order = p.order?.ToDtoFlat()
        };

        public static PaymentDto ToDtoFlat(this Payment p) => new()
        {
            paymentId = p.paymentId,
            orderId = p.orderId,
            amount = p.amount,
            method = p.method,
            status = p.status,
            paidAt = p.paidAt
        };

        // ---------- Shipping ----------
        public static ShippingDto ToDto(this Shipping s) => new()
        {
            shippingId = s.shippingId,
            orderId = s.orderId,
            address = s.address,
            status = s.status,
            shippedAt = s.shippedAt,
            deliveredAt = s.deliveredAt,
            order = s.order?.ToDtoFlat()
        };

        public static ShippingDto ToDtoFlat(this Shipping s) => new()
        {
            shippingId = s.shippingId,
            orderId = s.orderId,
            address = s.address,
            status = s.status,
            shippedAt = s.shippedAt,
            deliveredAt = s.deliveredAt
        };

        // ---------- Review ----------
        public static ReviewDto ToDto(this Review r) => new()
        {
            reviewId = r.reviewId,
            userId = r.userId,
            productId = r.productId,
            rating = r.rating,
            comment = r.comment,
            createdAt = r.createdAt,
            user = r.user?.ToDtoFlat(),
            product = r.product?.ToDtoFlat()
        };
    }
}
