using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_
{
    public class ProjectContext : DbContext
    {
        //Models 
        public DbSet<User> Users { get; set; }
        public DbSet<VendorProfile> VendorProfiles { get; set; }
        public DbSet<Review> Reviews { get; set; }

        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Shipping> Shippings { get; set; }

        //constructor
        public ProjectContext(DbContextOptions<ProjectContext> options) : base(options)
        {
        }

        // Relationship mapping lives here (Fluent API), not as
        // [ForeignKey]/[InverseProperty] attributes on the models.
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // One VendorProfile per User.
            modelBuilder.Entity<VendorProfile>()
                .HasOne(v => v.Users)
                .WithOne(u => u.vendorProfile)
                .HasForeignKey<VendorProfile>(v => v.UserId);

            // An order belongs to one user. No inverse collection on User.
            modelBuilder.Entity<Order>()
                .HasOne(o => o.user)
                .WithMany()
                .HasForeignKey(o => o.userId);

            // A coupon is optional on an order, and one coupon can be reused
            // across many orders.
            modelBuilder.Entity<Order>()
                .HasOne(o => o.coupon)
                .WithMany(c => c.orders)
                .HasForeignKey(o => o.couponId);

            // An order can have many line items.
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.order)
                .WithMany(o => o.orderItems)
                .HasForeignKey(oi => oi.orderId);

            // Restrict, not cascade: deleting a product must never erase
            // order history, and Cascade here hits SQL Server's multi-cascade-path limit.
            modelBuilder.Entity<OrderItem>()
                .HasOne(oi => oi.product)
                .WithMany()
                .HasForeignKey(oi => oi.productId)
                .OnDelete(DeleteBehavior.Restrict);

            // Restrict: a category with live products shouldn't be
            // deletable until they're reassigned or removed.
            modelBuilder.Entity<Product>()
                .HasOne(p => p.category)
                .WithMany(c => c.products)
                .HasForeignKey(p => p.categoryId)
                .OnDelete(DeleteBehavior.Restrict);

            // A vendor can list many products.
            modelBuilder.Entity<Product>()
                .HasOne(p => p.vendorProfile)
                .WithMany(v => v.Products)
                .HasForeignKey(p => p.vendorProfileId);

            // One Cart per User.
            modelBuilder.Entity<Cart>()
                .HasOne(c => c.user)
                .WithOne(u => u.cart)
                .HasForeignKey<Cart>(c => c.userId);

            // A cart can hold many line items.
            modelBuilder.Entity<CartItem>()
                .HasOne(ci => ci.cart)
                .WithMany(c => c.cartItems)
                .HasForeignKey(ci => ci.cartId);

            // Same reasoning as OrderItem -> Product above.
            modelBuilder.Entity<CartItem>()
                .HasOne(ci => ci.product)
                .WithMany()
                .HasForeignKey(ci => ci.productId)
                .OnDelete(DeleteBehavior.Restrict);

            // One Payment per Order.
            modelBuilder.Entity<Payment>()
                .HasOne(p => p.order)
                .WithOne(o => o.payment)
                .HasForeignKey<Payment>(p => p.orderId);

            // One Shipping record per Order.
            modelBuilder.Entity<Shipping>()
                .HasOne(s => s.order)
                .WithOne(o => o.shipping)
                .HasForeignKey<Shipping>(s => s.orderId);

            // A review is written by one user about one product.
            modelBuilder.Entity<Review>()
                .HasOne(r => r.user)
                .WithMany()
                .HasForeignKey(r => r.userId);

            // Same reasoning as OrderItem/CartItem -> Product above.
            modelBuilder.Entity<Review>()
                .HasOne(r => r.product)
                .WithMany()
                .HasForeignKey(r => r.productId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

}
