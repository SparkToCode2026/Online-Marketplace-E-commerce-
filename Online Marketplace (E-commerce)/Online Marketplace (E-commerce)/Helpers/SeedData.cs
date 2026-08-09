using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Helpers
{
    public static class SeedData
    {
        private const string SeedPassword = "Passw0rd!23";

        // Gate on Khaled's email specifically, not "any users exist" --
        // this DB already has random test accounts from live testing, and
        // seeding must not skip because of those, or duplicate on rerun.
        public static void Initialize(ProjectContext context)
        {
            if (context.Users.Any(u => u.Email == "khaild.alhadi2021@gmail.com"))
                return;

            var pwd = PasswordHasher.Hash(SeedPassword);

            var khalid = new User { Username = "Khalid", Email = "khaild.alhadi2021@gmail.com", PasswordHash = pwd, Phonenumber = 500000001, Role = "Admin", isActive = true };
            var mutaz = new User { Username = "Mutaz", Email = "mutaz@marketplace.com", PasswordHash = pwd, Phonenumber = 500000002, Role = "Admin", isActive = true };
            var hanin = new User { Username = "Hanin", Email = "hanin@marketplace.com", PasswordHash = pwd, Phonenumber = 500000003, Role = "Vendor", isActive = true };
            var nawal = new User { Username = "Nawal", Email = "nawal@marketplace.com", PasswordHash = pwd, Phonenumber = 500000004, Role = "Vendor", isActive = true };
            var ali = new User { Username = "Ali", Email = "ali@marketplace.com", PasswordHash = pwd, Phonenumber = 500000005, Role = "Vendor", isActive = true };
            var layla = new User { Username = "Layla", Email = "layla@marketplace.com", PasswordHash = pwd, Phonenumber = 500000006, Role = "Customer", isActive = true };
            var yousef = new User { Username = "Yousef", Email = "yousef@marketplace.com", PasswordHash = pwd, Phonenumber = 500000007, Role = "Customer", isActive = true };

            context.Users.AddRange(khalid, mutaz, hanin, nawal, ali, layla, yousef);
            context.SaveChanges();

            var haninProfile = new VendorProfile { UserId = hanin.UserId, StoreName = "Hanin's Boutique", Address = "Jeddah, KSA", CreatedaAt = DateTime.Now, isVerified = true };
            var nawalProfile = new VendorProfile { UserId = nawal.UserId, StoreName = "Nawal Electronics", Address = "Riyadh, KSA", CreatedaAt = DateTime.Now, isVerified = true };
            var aliProfile = new VendorProfile { UserId = ali.UserId, StoreName = "Ali Bookstore", Address = "Dammam, KSA", CreatedaAt = DateTime.Now, isVerified = true };
            context.VendorProfiles.AddRange(haninProfile, nawalProfile, aliProfile);
            context.SaveChanges();

            var electronics = new Category { name = "Electronics", description = "Gadgets and devices" };
            var clothing = new Category { name = "Clothing", description = "Apparel and accessories" };
            var books = new Category { name = "Books", description = "Fiction and non-fiction" };
            context.Categories.AddRange(electronics, clothing, books);
            context.SaveChanges();

            var laptop = new Product { name = "Laptop Pro 15", description = "High-performance laptop", price = 4500m, stockQuantity = 20, isActive = true, createdAt = DateTime.Now, categoryId = electronics.categoryId, vendorProfileId = nawalProfile.VendorProfileId };
            var headphones = new Product { name = "Wireless Headphones", description = "Noise-cancelling headphones", price = 350m, stockQuantity = 50, isActive = true, createdAt = DateTime.Now, categoryId = electronics.categoryId, vendorProfileId = nawalProfile.VendorProfileId };
            var tshirt = new Product { name = "Cotton T-Shirt", description = "Comfortable cotton t-shirt", price = 80m, stockQuantity = 100, isActive = true, createdAt = DateTime.Now, categoryId = clothing.categoryId, vendorProfileId = haninProfile.VendorProfileId };
            var jeans = new Product { name = "Denim Jeans", description = "Classic fit jeans", price = 180m, stockQuantity = 60, isActive = true, createdAt = DateTime.Now, categoryId = clothing.categoryId, vendorProfileId = haninProfile.VendorProfileId };
            var novel = new Product { name = "The Silent Sea", description = "Bestselling novel", price = 60m, stockQuantity = 40, isActive = true, createdAt = DateTime.Now, categoryId = books.categoryId, vendorProfileId = aliProfile.VendorProfileId };
            context.Products.AddRange(laptop, headphones, tshirt, jeans, novel);
            context.SaveChanges();

            var welcome10 = new Coupon { code = "WELCOME10", discountPercent = 10, expiryDate = DateTime.Now.AddMonths(6) };
            var summer20 = new Coupon { code = "SUMMER20", discountPercent = 20, expiryDate = DateTime.Now.AddMonths(3) };
            context.Coupons.AddRange(welcome10, summer20);
            context.SaveChanges();

            // Layla: a completed, paid, delivered order -- eligible for reviews.
            var laylaOrder = new Order
            {
                userId = layla.UserId,
                couponId = welcome10.couponId,
                status = "Completed",
                orderDate = DateTime.Now.AddDays(-10),
                totalAmount = (laptop.price + headphones.price) * 0.9m,
                orderItems = new List<OrderItem>
                {
                    new OrderItem { productId = laptop.productId, quantity = 1, unitPrice = laptop.price },
                    new OrderItem { productId = headphones.productId, quantity = 1, unitPrice = headphones.price }
                }
            };
            context.Orders.Add(laylaOrder);
            context.SaveChanges();

            context.Payments.Add(new Payment { orderId = laylaOrder.orderId, amount = laylaOrder.totalAmount, method = "Card", status = "Completed", paidAt = DateTime.Now.AddDays(-10) });
            context.Shippings.Add(new Shipping { orderId = laylaOrder.orderId, address = "Layla's address, Riyadh", status = "Delivered", shippedAt = DateTime.Now.AddDays(-9), deliveredAt = DateTime.Now.AddDays(-7) });

            // Yousef: a still-pending order, unpaid and unshipped.
            var yousefOrder = new Order
            {
                userId = yousef.UserId,
                status = "Pending",
                orderDate = DateTime.Now.AddDays(-1),
                totalAmount = tshirt.price + jeans.price,
                orderItems = new List<OrderItem>
                {
                    new OrderItem { productId = tshirt.productId, quantity = 1, unitPrice = tshirt.price },
                    new OrderItem { productId = jeans.productId, quantity = 1, unitPrice = jeans.price }
                }
            };
            context.Orders.Add(yousefOrder);
            context.SaveChanges();

            context.Reviews.Add(new Review { userId = layla.UserId, productId = laptop.productId, rating = 5, comment = "Excellent laptop, very fast!", createdAt = DateTime.Now.AddDays(-5) });
            context.Reviews.Add(new Review { userId = layla.UserId, productId = headphones.productId, rating = 4, comment = "Great sound quality.", createdAt = DateTime.Now.AddDays(-5) });

            // Active carts still being shopped -- not checked out.
            context.Carts.Add(new Cart
            {
                userId = layla.UserId,
                createdAt = DateTime.Now,
                cartItems = new List<CartItem> { new CartItem { productId = novel.productId, quantity = 1 } }
            });
            context.Carts.Add(new Cart
            {
                userId = yousef.UserId,
                createdAt = DateTime.Now,
                cartItems = new List<CartItem> { new CartItem { productId = novel.productId, quantity = 2 } }
            });

            context.SaveChanges();
        }
    }
}
