using Microsoft.AspNetCore.Mvc;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {
        [HttpGet]
        public IActionResult Index()
        {
            return Ok("Review Index");
        }
    }
}
