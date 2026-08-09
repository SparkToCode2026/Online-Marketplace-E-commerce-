using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReviewController : ControllerBase
    {
        private readonly ProjectContext _context;
        public ReviewController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a review, only for a product the user has
        // actually ordered.
        [HttpPost("add")]
        public IActionResult AddReview(Review review)
        {
            if (!_context.Users.Any(u => u.UserId == review.userId))
                return NotFound("User not found");

            if (!_context.Products.Any(p => p.productId == review.productId))
                return NotFound("Product not found");

            bool hasPurchased = _context.OrderItems
                .Any(oi => oi.productId == review.productId && oi.order.userId == review.userId);
            if (!hasPurchased)
                return BadRequest("You can only review products you have purchased");

            review.createdAt = DateTime.Now;

            _context.Reviews.Add(review);
            _context.SaveChanges();

            return Ok(review.reviewId);
        }

        // Case 2 — Update a review's rating/comment.
        [HttpPut("update")]
        public IActionResult UpdateReview(int id, Review updatedReview)
        {
            var review = _context.Reviews.Find(id);
            if (review == null)
                return NotFound("Review not found");

            review.rating = updatedReview.rating;
            review.comment = updatedReview.comment;

            _context.SaveChanges();

            return Ok(review.ToDto());
        }

        // Case 3 — Reassign a review to a different product (moderation
        // correction), updating via a related entity's FK.
        [HttpPatch("changeProduct")]
        public IActionResult ChangeReviewProduct(int id, int newProductId)
        {
            var review = _context.Reviews.Find(id);
            if (review == null)
                return NotFound("Review not found");

            if (!_context.Products.Any(p => p.productId == newProductId))
                return NotFound("Product not found");

            review.productId = newProductId;
            _context.SaveChanges();
            return Ok(review.ToDto());
        }

        // Case 4 — Delete a review.
        [HttpDelete("delete")]
        public IActionResult DeleteReview(int id)
        {
            var review = _context.Reviews.Find(id);
            if (review == null)
                return NotFound("Review not found");

            _context.Reviews.Remove(review);
            _context.SaveChanges();
            return Ok("Review deleted successfully");
        }

        // Case 5 — Get all reviews, including the reviewer and the product.
        [AllowAnonymous]
        [HttpGet("all")]
        public IActionResult GetAllReviews()
        {
            var reviews = _context.Reviews
                .Include(r => r.user)
                .Include(r => r.product)
                .ToList();
            return Ok(reviews.Select(r => r.ToDto()));
        }

        // Case 6 — Get a single review by id.
        [AllowAnonymous]
        [HttpGet("getById")]
        public IActionResult GetReviewById(int id)
        {
            var review = _context.Reviews
                .Include(r => r.user)
                .Include(r => r.product)
                .FirstOrDefault(r => r.reviewId == id);
            if (review == null)
                return NotFound("Review not found");
            return Ok(review.ToDto());
        }

        // Case 7 — Filter reviews by the category of the product reviewed.
        [AllowAnonymous]
        [HttpGet("byCategory")]
        public IActionResult GetReviewsByCategory(int categoryId)
        {
            var reviews = _context.Reviews
                .Include(r => r.product)
                .Where(r => r.product.categoryId == categoryId)
                .ToList();
            return Ok(reviews.Select(r => r.ToDto()));
        }

        // Case 8 — Aggregate: average rating for a product.
        [AllowAnonymous]
        [HttpGet("averageRating")]
        public IActionResult GetAverageRating(int productId)
        {
            var productReviews = _context.Reviews.Where(r => r.productId == productId);
            if (!productReviews.Any())
                return NotFound("No reviews for this product yet");

            var average = productReviews.Average(r => r.rating);
            return Ok(new { productId, averageRating = average });
        }
    }
}
