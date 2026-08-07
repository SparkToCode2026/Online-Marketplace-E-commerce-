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

        //constructor
        public ProjectContext(DbContextOptions<ProjectContext> options) : base(options)
        {
        }
    }

}
