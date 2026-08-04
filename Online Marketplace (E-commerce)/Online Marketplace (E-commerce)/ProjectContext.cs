using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_
{
    public class ProjectContext : DbContext
    {
        //Models 
        public DbSet<User> Users { get; set; }
        public DbSet<VendorProfile> VendorProfiles { get; set; }

        // conect to database
        protected override void OnConfiguring(DbContextOptionsBuilder options)
        {
            options.UseSqlServer(
                "Server=localhost\\SQLEXPRESS;Database=EcommerceDB;Trusted_Connection=True;TrustServerCertificate=True;"
            );
        }
    }
}
