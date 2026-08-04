using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;
namespace Online_Marketplace__E_commerce_
{
    public class ProjectContext
    {
        public DbSet <User> Users { get; set; }
        public DbSet<VendorProfile> VendorProfiles { get; set; }


    }
}
