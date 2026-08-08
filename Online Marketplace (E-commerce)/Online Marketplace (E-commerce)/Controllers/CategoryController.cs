using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CategoryController : ControllerBase
    {
        private readonly ProjectContext _context;
        public CategoryController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a category.
        [HttpPost("add")]
        public IActionResult AddCategory(Category category)
        {
            if (_context.Categories.Any(c => c.name == category.name))
                return Conflict("A category with this name already exists");

            _context.Categories.Add(category);
            _context.SaveChanges();
            return Ok(category.categoryId);
        }

        // Case 2 — Update a category's name/description.
        [HttpPut("update")]
        public IActionResult UpdateCategory(int id, Category updatedCategory)
        {
            var category = _context.Categories.Find(id);
            if (category == null)
                return NotFound("Category not found");

            category.name = updatedCategory.name;
            category.description = updatedCategory.description;
            _context.SaveChanges();
            return Ok(category);
        }

        // Case 3 — Move every product out of this category into another one.
        [HttpPatch("reassignProducts")]
        public IActionResult ReassignProducts(int id, int targetCategoryId)
        {
            if (!_context.Categories.Any(c => c.categoryId == id))
                return NotFound("Category not found");

            if (!_context.Categories.Any(c => c.categoryId == targetCategoryId))
                return NotFound("Target category not found");

            int movedCount = _context.Products
                .Where(p => p.categoryId == id)
                .ExecuteUpdate(setters => setters.SetProperty(p => p.categoryId, targetCategoryId));

            return Ok($"{movedCount} product(s) moved");
        }

        // Case 4 — Delete a category. Blocked while it still owns products.
        [HttpDelete("delete")]
        public IActionResult DeleteCategory(int id)
        {
            var category = _context.Categories.Find(id);
            if (category == null)
                return NotFound("Category not found");

            if (_context.Products.Any(p => p.categoryId == id))
                return Conflict("Category still has products. Reassign or delete them first.");

            _context.Categories.Remove(category);
            _context.SaveChanges();
            return Ok("Category deleted successfully");
        }

        // Case 5 — Get all categories, including their products.
        [AllowAnonymous]
        [HttpGet("all")]
        public IActionResult GetAllCategories()
        {
            var categories = _context.Categories.Include(c => c.products).ToList();
            return Ok(categories);
        }

        // Case 6 — Get a single category by id.
        [AllowAnonymous]
        [HttpGet("getById")]
        public IActionResult GetCategoryById(int id)
        {
            var category = _context.Categories
                .Include(c => c.products)
                .FirstOrDefault(c => c.categoryId == id);
            if (category == null)
                return NotFound("Category not found");
            return Ok(category);
        }

        // Case 7 — Filter categories by name.
        [AllowAnonymous]
        [HttpGet("search")]
        public IActionResult SearchCategories(string name)
        {
            var categories = _context.Categories
                .Where(c => c.name.Contains(name))
                .ToList();
            return Ok(categories);
        }

        // Case 8 — Sort categories by how many products they hold.
        [AllowAnonymous]
        [HttpGet("byProductCount")]
        public IActionResult GetCategoriesByProductCount()
        {
            var result = _context.Categories
                .Select(c => new
                {
                    c.categoryId,
                    c.name,
                    productCount = c.products.Count()
                })
                .OrderByDescending(c => c.productCount)
                .ToList();
            return Ok(result);
        }
    }
}
