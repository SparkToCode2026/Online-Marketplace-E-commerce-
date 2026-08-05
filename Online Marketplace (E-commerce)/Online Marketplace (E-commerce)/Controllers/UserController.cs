using Microsoft.AspNetCore.Mvc;

namespace Online_Marketplace__E_commerce_.Controllers
{
    public class UserController : ControllerBase
    {
        private readonly ProjectContext _context;
        public UserController(ProjectContext context)
        {
            _context = context;
        }


    }
}
