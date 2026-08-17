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
            var mutaz = new User { Username = "Mutaz", Email = "mutaz6991@gmail.com", PasswordHash = pwd, Phonenumber = 500000002, Role = "Admin", isActive = true };
            var hanin = new User { Username = "Hanin", Email = "hanin@marketplace.com", PasswordHash = pwd, Phonenumber = 500000003, Role = "Vendor", isActive = true };
            var nawal = new User { Username = "Nawal", Email = "nawal@marketplace.com", PasswordHash = pwd, Phonenumber = 500000004, Role = "Vendor", isActive = true };
            var ali = new User { Username = "Ali", Email = "alijhw3099@gmail.com", PasswordHash = pwd, Phonenumber = 500000005, Role = "Vendor", isActive = true };
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

            var laptop = new Product { name = "Laptop Pro 15", description = "High-performance laptop", price = 45m, stockQuantity = 20, isActive = true, createdAt = DateTime.Now, categoryId = electronics.categoryId, vendorProfileId = nawalProfile.VendorProfileId, productUrl = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400" };
            var headphones = new Product { name = "Wireless Headphones", description = "Noise-cancelling headphones", price = 12m, stockQuantity = 50, isActive = true, createdAt = DateTime.Now, categoryId = electronics.categoryId, vendorProfileId = nawalProfile.VendorProfileId, productUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" };
            var tshirt = new Product { name = "Cotton T-Shirt", description = "Comfortable cotton t-shirt", price = 3m, stockQuantity = 100, isActive = true, createdAt = DateTime.Now, categoryId = clothing.categoryId, vendorProfileId = haninProfile.VendorProfileId, productUrl = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400" };
            var jeans = new Product { name = "Denim Jeans", description = "Classic fit jeans", price = 9m, stockQuantity = 60, isActive = true, createdAt = DateTime.Now, categoryId = clothing.categoryId, vendorProfileId = haninProfile.VendorProfileId, productUrl = "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400" };
            var novel = new Product { name = "The Silent Sea", description = "Bestselling novel", price = 4m, stockQuantity = 40, isActive = true, createdAt = DateTime.Now, categoryId = books.categoryId, vendorProfileId = aliProfile.VendorProfileId, productUrl = "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400" };
            context.Products.AddRange(laptop, headphones, tshirt, jeans, novel);
            context.SaveChanges();

            // 50 more catalog products, each with a distinct real product photo from
            // Unsplash (direct images.unsplash.com URLs, ?w=400 to keep them small).
            // imageId is the Unsplash photo slug; every one is verified to render.
            var catalog = new (string name, string description, decimal price, int stock, int categoryId, int vendorProfileId, string imageId)[]
            {
                // Electronics -> Nawal Electronics
                ("Smartphone Nova 5", "6.5-inch display, 128GB storage, dual rear camera", 40m, 40, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1592890288564-76628a30a657"),
                ("Tablet Air 10", "10-inch tablet with stylus support and all-day battery", 35m, 30, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1623126908029-58cb08a2b272"),
                ("UltraSharp 27\" Monitor", "4K UHD monitor for work and gaming", 30m, 25, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1484788984921-03950022c9ef"),
                ("Mechanical Keyboard RGB", "Backlit mechanical keyboard with blue switches", 6m, 60, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1618384887929-16ec33fab9ef"),
                ("Wireless Optical Mouse", "Ergonomic wireless mouse with silent clicks", 3m, 80, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1615663245857-ac93bb7c39e7"),
                ("Portable Bluetooth Speaker", "Waterproof speaker with 12-hour battery life", 8m, 45, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1608043152269-423dbba4e7e1"),
                ("FitTrack Smartwatch", "Heart-rate and sleep tracking smartwatch", 15m, 35, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1579586337278-3befd40fd17a"),
                ("Mirrorless Digital Camera", "24MP mirrorless camera with kit lens", 50m, 12, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1516035069371-29a1b244cc32"),
                ("NextGen Gaming Console", "1TB gaming console with wireless controller", 45m, 18, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1493711662062-fa541adb3fc8"),
                ("True Wireless Earbuds", "Noise-isolating earbuds with charging case", 7m, 70, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1572569511254-d8f925fe2cbb"),
                ("Portable SSD 1TB", "High-speed external solid state drive", 12m, 40, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1628557118391-56cd62c9f2cb"),
                ("Dual-Band Wi-Fi Router", "AC1200 router for whole-home coverage", 9m, 30, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1606904825846-647eb07f5be2"),
                ("20000mAh Power Bank", "Fast-charging portable power bank", 5m, 90, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1585995603413-eb35b5f4a50b"),
                ("LED Desk Lamp", "Adjustable brightness desk lamp with USB port", 4m, 50, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1519219788971-8d9797e0928e"),
                ("Electric Kettle 1.7L", "Rapid-boil stainless steel kettle", 6m, 55, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1643114786355-ff9e52736eab"),
                ("Robot Vacuum Cleaner", "Smart robot vacuum with app control", 35m, 15, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1686178827149-6d55c72d81df"),
                ("4K Action Camera", "Waterproof action camera with accessories kit", 25m, 25, electronics.categoryId, nawalProfile.VendorProfileId, "photo-1484506399805-c273b8e91dce"),

                // Clothing -> Hanin's Boutique
                ("Men's Denim Jacket", "Classic blue denim jacket, unisex fit", 12m, 40, clothing.categoryId, haninProfile.VendorProfileId, "photo-1611312449408-fcece27cdbb7"),
                ("Women's Summer Dress", "Lightweight floral summer dress", 10m, 45, clothing.categoryId, haninProfile.VendorProfileId, "photo-1496747611176-843222e1e57c"),
                ("Men's Running Shoes", "Breathable running shoes with cushioned sole", 14m, 50, clothing.categoryId, haninProfile.VendorProfileId, "photo-1542291026-7eec264c27ff"),
                ("Leather Bifold Wallet", "Genuine leather wallet with card slots", 5m, 60, clothing.categoryId, haninProfile.VendorProfileId, "photo-1627123424574-724758594e93"),
                ("Merino Wool Sweater", "Soft merino wool crew-neck sweater", 11m, 35, clothing.categoryId, haninProfile.VendorProfileId, "photo-1574201635302-388dd92a4c3f"),
                ("Classic Baseball Cap", "Adjustable cotton baseball cap", 3m, 70, clothing.categoryId, haninProfile.VendorProfileId, "photo-1588850561407-ed78c282e89b"),
                ("Slim-Fit Formal Shirt", "Wrinkle-resistant slim-fit dress shirt", 8m, 55, clothing.categoryId, haninProfile.VendorProfileId, "photo-1603252109303-2751441dd157"),
                ("Women's Yoga Pants", "High-waist stretch yoga leggings", 6m, 50, clothing.categoryId, haninProfile.VendorProfileId, "photo-1606902965551-dce093cda6e7"),
                ("Men's Winter Coat", "Insulated winter coat with hood", 18m, 25, clothing.categoryId, haninProfile.VendorProfileId, "photo-1539533113208-f6df8cc8b543"),
                ("Canvas Travel Backpack", "Durable canvas backpack with laptop sleeve", 10m, 40, clothing.categoryId, haninProfile.VendorProfileId, "photo-1553062407-98eeb64c6a62"),
                ("Silk Printed Scarf", "Lightweight silk scarf with floral print", 4m, 45, clothing.categoryId, haninProfile.VendorProfileId, "photo-1606259458027-54d2a728b6ab"),
                ("Sports Socks (3-Pack)", "Cushioned sports socks, pack of three", 2m, 90, clothing.categoryId, haninProfile.VendorProfileId, "photo-1585499583264-491df5142e83"),
                ("Leather Belt", "Reversible leather belt with metal buckle", 5m, 60, clothing.categoryId, haninProfile.VendorProfileId, "photo-1664286074176-5206ee5dc878"),
                ("Polarized Sunglasses", "UV-protection polarized sunglasses", 6m, 50, clothing.categoryId, haninProfile.VendorProfileId, "photo-1511499767150-a48a237f0083"),
                ("Classic White Sneakers", "Everyday casual sneakers", 12m, 45, clothing.categoryId, haninProfile.VendorProfileId, "photo-1600269452121-4f2416e55c28"),
                ("Pullover Hoodie", "Fleece-lined pullover hoodie", 9m, 55, clothing.categoryId, haninProfile.VendorProfileId, "photo-1620799140188-3b2a02fd9a77"),
                ("Men's Swim Shorts", "Quick-dry swim shorts", 5m, 40, clothing.categoryId, haninProfile.VendorProfileId, "photo-1691315909393-c5c91e22760f"),

                // Books -> Ali Bookstore
                ("Whispers of the Old Harbor", "A mystery novel set in a coastal town", 3m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1532012197267-da84d127e765"),
                ("The Last Cartographer", "An adventure through uncharted lands", 3m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1592496431122-2349e0fbc666"),
                ("Beneath a Copper Sky", "Historical fiction spanning three generations", 4m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1641154748135-8032a61a3f80"),
                ("The Clockmaker's Daughter", "A tale of family secrets and time", 3m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1512820790803-83ca734da794"),
                ("Echoes in the Desert", "A survival story set in the Empty Quarter", 3m, 35, books.categoryId, aliProfile.VendorProfileId, "photo-1629992101753-56d196c8aabb"),
                ("The Art of Simple Cooking", "A beginner-friendly cookbook", 4m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1589829085413-56de8ae18c73"),
                ("Modern Home Design", "Interior design ideas for modern living", 4m, 20, books.categoryId, aliProfile.VendorProfileId, "photo-1528459105426-b9548367069b"),
                ("Mind and Method", "A practical guide to critical thinking", 3m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1537495329792-41ae41ad3bf0"),
                ("Stars Over Muscat", "A coming-of-age story set in Oman", 3m, 35, books.categoryId, aliProfile.VendorProfileId, "photo-1519764340700-3db40311f21e"),
                ("The Silk Road Diaries", "Travel memoir across ancient trade routes", 4m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1621351183012-e2f9972dd9bf"),
                ("Children of the Tide", "A picture book about life by the sea", 2m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1633477189729-9290b3261d0a"),
                ("The Quiet Algorithm", "A techno-thriller about AI and ethics", 4m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1705837861201-dd000d929a31"),
                ("Gardens of Glass", "A poetry collection on nature and memory", 3m, 20, books.categoryId, aliProfile.VendorProfileId, "photo-1521123845560-14093637aa7d"),
                ("The Merchant's Ledger", "A historical drama set in a trading port", 3m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1621827979802-6d778e161b28"),
                ("Learning to Listen", "A self-help guide to better communication", 3m, 30, books.categoryId, aliProfile.VendorProfileId, "photo-1610116306796-6fea9f4fae38"),
                ("Under Two Moons", "A fantasy novel set in a desert kingdom", 4m, 25, books.categoryId, aliProfile.VendorProfileId, "photo-1541963463532-d68292c34b19"),
            };

            foreach (var p in catalog)
            {
                context.Products.Add(new Product
                {
                    name = p.name,
                    description = p.description,
                    price = p.price,
                    stockQuantity = p.stock,
                    isActive = true,
                    createdAt = DateTime.Now,
                    categoryId = p.categoryId,
                    vendorProfileId = p.vendorProfileId,
                    productUrl = $"https://images.unsplash.com/{p.imageId}?w=400"
                });
            }
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
