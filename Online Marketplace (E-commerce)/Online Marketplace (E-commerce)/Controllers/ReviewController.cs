using Microsoft.AspNetCore.Mvc;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewController : ControllerBase
    {

        private readonly ProjectContext _projectContext;
        public ReviewController(ProjectContext projectContext)
        {
            _projectContext = projectContext;
        }

        [HttpGet]
        public IActionResult GetAllReview()
        {
            var allReviews = _projectContext.Reviews.ToList();

            return Ok(allReviews);
        }
    }
}
