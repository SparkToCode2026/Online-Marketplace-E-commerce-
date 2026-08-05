using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_
{
    public class ProjectContext : DbContext
    {
        //Models 
        public DbSet<User> Users { get; set; }
        public DbSet<VendorProfile> VendorProfiles { get; set; }

        //constructor
        public ProjectContext(DbContextOptions<ProjectContext> options) : base(options)
        {
        }

    }
}
