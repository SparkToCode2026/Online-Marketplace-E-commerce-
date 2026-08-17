using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
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
        public IActionResult AddCategory(CategoryCreateDto dto)
        {
            if (_context.Categories.Any(c => c.name == dto.name))
                return Conflict("A category with this name already exists");

            var category = new Category
            {
                name = dto.name,
                description = dto.description
            };
            _context.Categories.Add(category);
            _context.SaveChanges();
            return Ok(category.categoryId);
        }

        // Case 2 — Update a category's name/description.
        [HttpPut("update")]
        public IActionResult UpdateCategory(int id, CategoryUpdateDto dto)
        {
            var category = _context.Categories.Find(id);
            if (category == null)
                return NotFound("Category not found");

            category.name = dto.name;
            category.description = dto.description;
            _context.SaveChanges();
            return Ok(category.ToDto());
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
            return Ok(categories.Select(c => c.ToDto()));
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
            return Ok(category.ToDto());
        }

        // Case 7 — Filter categories by name.
        [AllowAnonymous]
        [HttpGet("search")]
        public IActionResult SearchCategories(string name)
        {
            var categories = _context.Categories
                .Where(c => c.name.Contains(name))
                .ToList();
            return Ok(categories.Select(c => c.ToDto()));
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

        // Case 9 — Enable/disable a category without deleting it (and without
        // touching its products). Admin-only.
        [Authorize(Roles = "Admin")]
        [HttpPatch("toggle")]
        public IActionResult ToggleCategory(int id)
        {
            var category = _context.Categories.Find(id);
            if (category == null)
                return NotFound("Category not found");

            category.isActive = !category.isActive;
            _context.SaveChanges();
            return Ok(category.ToDto());
        }

        // Case 10 — Combined Where-filter: active state, "has products", and a
        // name search. All optional, so no arguments returns every category.
        [AllowAnonymous]
        [HttpGet("filter")]
        public IActionResult FilterCategories(
            bool? isActive = null, bool? hasProducts = null, string? search = null)
        {
            var query = _context.Categories.Include(c => c.products).AsQueryable();

            if (isActive.HasValue)
                query = query.Where(c => c.isActive == isActive.Value);

            if (hasProducts.HasValue)
                query = hasProducts.Value
                    ? query.Where(c => c.products!.Any())
                    : query.Where(c => !c.products!.Any());

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c => c.name.Contains(search));

            return Ok(query.ToList().Select(c => c.ToDto()));
        }
    }
}
