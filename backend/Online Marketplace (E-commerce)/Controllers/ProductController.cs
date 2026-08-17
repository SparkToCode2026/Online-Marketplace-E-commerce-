using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Online_Marketplace__E_commerce_.DTOs;
using Online_Marketplace__E_commerce_.Helpers;
using Online_Marketplace__E_commerce_.Models;
using System.Security.Claims;

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
        [Authorize(Roles = "Admin,Vendor")]
        [HttpPost("add")]
        public IActionResult AddProduct(ProductCreateDto dto)
        {
            if (!_context.Categories.Any(c => c.categoryId == dto.categoryId))
                return NotFound("Category not found");

            if (!_context.VendorProfiles.Any(v => v.VendorProfileId == dto.vendorProfileId))
                return NotFound("Vendor profile not found");

            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role == "Vendor")
            {
                var myVendorProfile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == callerId);
                if (myVendorProfile == null || myVendorProfile.VendorProfileId != dto.vendorProfileId)
                    return Forbid();
            }

            var product = new Product
            {
                name = dto.name,
                description = dto.description,
                productUrl = dto.productUrl,
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
        [Authorize(Roles = "Admin,Vendor")]
        [HttpPut("update")]
        public IActionResult UpdateProduct(int id, ProductUpdateDto dto)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role == "Vendor")
            {
                var myVendorProfile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == callerId);
                if (myVendorProfile == null || myVendorProfile.VendorProfileId != product.vendorProfileId)
                    return Forbid();
            }

            product.name = dto.name;
            product.description = dto.description;
            product.price = dto.price;
            product.stockQuantity = dto.stockQuantity;
            _context.SaveChanges();
            return Ok(product.ToDto());
        }

        // Case 3 — Activate/deactivate a product without deleting it.
        [Authorize(Roles = "Admin,Vendor")]
        [HttpPatch("setActive")]
        public IActionResult SetProductActive(int id, bool isActive)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role == "Vendor")
            {
                var myVendorProfile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == callerId);
                if (myVendorProfile == null || myVendorProfile.VendorProfileId != product.vendorProfileId)
                    return Forbid();
            }

            product.isActive = isActive;
            _context.SaveChanges();
            return Ok(product.ToDto());
        }

        // Case 4 — Delete a product. Blocked if it has order/cart/review history; deactivate (case 3) instead.
        [Authorize(Roles = "Admin")]
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

        // Case 9 — Combined Where-filter: category, price range, in-stock and
        // active state can be mixed freely. Any omitted parameter is skipped,
        // so no arguments returns every product.
        [AllowAnonymous]
        [HttpGet("filter")]
        public IActionResult FilterProducts(
            int? categoryId = null, decimal? minPrice = null, decimal? maxPrice = null,
            bool? inStock = null, bool? isActive = null, string? search = null)
        {
            var query = _context.Products
                .Include(p => p.category)
                .Include(p => p.vendorProfile)
                .AsQueryable();

            if (categoryId.HasValue)
                query = query.Where(p => p.categoryId == categoryId.Value);

            if (minPrice.HasValue)
                query = query.Where(p => p.price >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(p => p.price <= maxPrice.Value);

            if (inStock.HasValue)
                query = inStock.Value
                    ? query.Where(p => p.stockQuantity > 0)
                    : query.Where(p => p.stockQuantity == 0);

            if (isActive.HasValue)
                query = query.Where(p => p.isActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(p => p.name.Contains(search));

            return Ok(query.ToList().Select(p => p.ToDto()));
        }

        // Case 10 — Sorting/aggregate view.
        //   by=price    (default) -> products ordered by price
        //   by=category          -> average price per category (GroupBy + Average)
        [AllowAnonymous]
        [HttpGet("sorted")]
        public IActionResult GetSortedProducts(string by = "price", bool descending = false)
        {
            if (by?.ToLower() == "category")
            {
                var perCategory = _context.Products
                    .GroupBy(p => p.categoryId)
                    .Select(g => new
                    {
                        categoryId = g.Key,
                        productCount = g.Count(),
                        averagePrice = g.Average(p => p.price),
                        minPrice = g.Min(p => p.price),
                        maxPrice = g.Max(p => p.price)
                    })
                    .ToList();
                return Ok(perCategory);
            }

            var query = _context.Products
                .Include(p => p.category)
                .Include(p => p.vendorProfile)
                .AsQueryable();

            query = descending
                ? query.OrderByDescending(p => p.price)
                : query.OrderBy(p => p.price);

            return Ok(query.ToList().Select(p => p.ToDto()));
        }

        // Case 11 — Adjust stock by a delta (restock with a positive number,
        // correct an over-count with a negative one). Vendors may only touch
        // their own products, same ownership rule as update/setActive.
        [Authorize(Roles = "Admin,Vendor")]
        [HttpPatch("stock")]
        public IActionResult UpdateStock(int id, int delta)
        {
            var product = _context.Products.Find(id);
            if (product == null)
                return NotFound("Product not found");

            var role = User.FindFirstValue(ClaimTypes.Role);
            var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier));
            if (role == "Vendor")
            {
                var myVendorProfile = _context.VendorProfiles.FirstOrDefault(v => v.UserId == callerId);
                if (myVendorProfile == null || myVendorProfile.VendorProfileId != product.vendorProfileId)
                    return Forbid();
            }

            if (product.stockQuantity + delta < 0)
                return BadRequest("Stock cannot go below zero");

            product.stockQuantity += delta;
            _context.SaveChanges();
            return Ok(product.ToDto());
        }
    }
}
