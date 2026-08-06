using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;
using static Azure.Core.HttpHeader;

namespace Online_Marketplace__E_commerce_
{
    public class ProjectContext(DbContextOptions dbContext) : DbContext(dbContext)
    {

        // table name Users
        public DbSet<User> Users { get; set; }
        public DbSet<Review> Reviews { get; set; }

        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<Order> Orders { get; set; }

    }
}
