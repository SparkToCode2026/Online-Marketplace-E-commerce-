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
    public class ProductController : ControllerBase
    {
        private readonly ProjectContext _context;
        public ProductController(ProjectContext context)
        {
            _context = context;
        }

        // Case 1 — Create a product.
        [HttpPost("add")]
        public IActionResult AddProduct(ProductCreateDto dto)
        {
            if (!_context.Categories.Any(c => c.categoryId == dto.categoryId))
                return NotFound("Category not found");

            if (!_context.VendorProfiles.Any(v => v.VendorProfileId == dto.vendorProfileId))
                return NotFound("Vendor profile not found");

            var product = new Product
            {
                name = dto.name,
                description = dto.description,
                price = dto.price,
                stockQuantity = dto.stockQuantity,
                categoryId = dto.categoryId,
                vendorProfileId = dto.vendorProfileId,
                createdAt = DateTime.Now,
                isActive = true
            };
            _context.Products.Add(product);
            _context.SaveChanges();
            return Ok(product.productId);
        }

        // Case 2 — Update a product's core details.
        [HttpPut("update")]
        public IActionResult UpdateProduct(int id, ProductUpdateDto dto)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            product.name = dto.name;
            product.description = dto.description;
            product.price = dto.price;
            product.stockQuantity = dto.stockQuantity;
            _context.SaveChanges();
            return Ok(product.ToDto());
        }

        // Case 3 — Activate/deactivate a product without deleting it.
        [HttpPatch("setActive")]
        public IActionResult SetProductActive(int id, bool isActive)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            product.isActive = isActive;
            _context.SaveChanges();
            return Ok(product.ToDto());
        }

        // Case 4 — Delete a product. Blocked if it has order/cart/review history; deactivate (case 3) instead.
        [HttpDelete("delete")]
        public IActionResult DeleteProduct(int id)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            bool hasHistory = _context.OrderItems.Any(oi => oi.productId == id)
                || _context.CartItems.Any(ci => ci.productId == id) 
                || _context.Reviews.Any(r => r.productId == id);

            if (hasHistory)
                return Conflict("Product has related order items, cart items, or reviews. Deactivate it instead.");

            _context.Products.Remove(product);
            _context.SaveChanges();
            return Ok("Product deleted successfully");
        }

        // Case 5 — Get all products, including their category and vendor.
        [AllowAnonymous]
        [HttpGet("all")]
        public IActionResult GetAllProducts()
        {
            var products = _context.Products
                .Include(p => p.category)
                .Include(p => p.vendorProfile)
                .ToList();
            return Ok(products.Select(p => p.ToDto()));
        }

        // Case 6 — Get a single product by id.
        [AllowAnonymous]
        [HttpGet("getById")]
        public IActionResult GetProductById(int id)
        {
            var product = _context.Products
                .Include(p => p.category)
                .Include(p => p.vendorProfile)
                .FirstOrDefault(p => p.productId == id);
            if (product == null)
                return NotFound("Product not found");
            return Ok(product.ToDto());
        }

        // Case 7 — Filter active products by category.
        [AllowAnonymous]
        [HttpGet("byCategory")]
        public IActionResult GetProductsByCategory(int categoryId)
        {
            var products = _context.Products
                .Where(p => p.categoryId == categoryId && p.isActive)
                .Include(p => p.vendorProfile)
                .ToList();
            return Ok(products.Select(p => p.ToDto()));
        }

        // Case 8 — Top 10 best sellers by quantity sold.
        // Looks up names after aggregating, rather than one combined GroupBy+Join query.
        [AllowAnonymous]
        [HttpGet("bestSellers")]
        public IActionResult GetBestSellers()
        {
            var topSales = _context.OrderItems
                .GroupBy(oi => oi.productId)
                .Select(g => new { productId = g.Key, totalSold = g.Sum(oi => oi.quantity) })
                .OrderByDescending(x => x.totalSold)
                .Take(10)
                .ToList();

            var productIds = topSales.Select(t => t.productId).ToList();
            var products = _context.Products
                .Where(p => productIds.Contains(p.productId))
                .ToDictionary(p => p.productId);

            var result = topSales
                .Select(t => new
                {
                    productId = t.productId,
                    name = products[t.productId].name,
                    price = products[t.productId].price,
                    totalSold = t.totalSold
                })
                .ToList();

            return Ok(result);
        }
    }
}
