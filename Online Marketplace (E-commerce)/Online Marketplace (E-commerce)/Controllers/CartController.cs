using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Online_Marketplace__E_commerce_.Models;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [Route ("cart")]
    [ApiController]
    public  class CartController : ControllerBase
    {
        private readonly ProjectContext context;

        public CartController(ProjectContext context)
        {
            this.context = context;
        }

        [HttpPost("add")]
        public IActionResult AddCart(int userId)
        {
            if (!context.Users.Any(u => u.UserId == userId))
                return BadRequest("User not found");

            if (context.Carts.Any(c => c.UserId == userId))
                return Conflict("User already has a cart");

            Cart cart = new Cart
            {
                UserId = userId,
                CreatedAt = DateTime.Now
            };

            context.Carts.Add(cart);
            context.SaveChanges();

            return Ok(cart.CartId);
        }
        [HttpPut("update")]
        public IActionResult UpdateCart(int cartId)
        {
            Cart cart = context.Carts.FirstOrDefault(c => c.CartId == cartId);

            if (cart == null)
                return NotFound("Cart not found");

            cart.CreatedAt = DateTime.Now;

            context.SaveChanges();

            return Ok("Cart updated successfully");
        }
        [HttpDelete("clear")]
        public IActionResult ClearCart(int cartId)
        {
            Cart cart = context.Carts.FirstOrDefault(c => c.CartId == cartId);

            if (cart == null)
                return NotFound("Cart not found");

            var cartItems = context.CartItems.Where(i => i.CartId == cartId).ToList();

            context.CartItems.RemoveRange(cartItems);
            context.SaveChanges();

            return Ok("Cart cleared successfully");
        }
        [HttpDelete("remove")]
        public IActionResult RemoveCart(int cartId)
        {
            Cart cart = context.Carts.FirstOrDefault(c => c.CartId == cartId);

            if (cart == null)
                return NotFound("Cart not found");

            if (context.CartItems.Any(i => i.CartId == cartId))
                return Conflict("Clear this cart's items first");

            context.Carts.Remove(cart);
            context.SaveChanges();

            return Ok("Cart removed successfully");
        }
        [HttpGet("getAll")]
        public IActionResult GetAllCarts()
        {
            var carts = context.Carts
                .Include(c => c.CartItems)
                .Select(c => new
                {
                    c.CartId,
                    c.UserId,
                    c.CreatedAt,
                    itemCount = c.CartItems.Count(),
                    total = c.CartItems.Sum(i => i.Quantity * i.Product.Price)
                })
                .ToList();

            return Ok(carts);
        }
       [HttpGet("getAll")]
public IActionResult GetAllCarts()
        {
            // TODO: Uncomment after Product model is merged by Developer 2

            /*
            var carts = context.Carts
                .Include(c => c.CartItems)
                .Select(c => new
                {
                    c.CartId,
                    c.UserId,
                    c.CreatedAt,
                    itemCount = c.CartItems.Count(),
                    total = c.CartItems.Sum(i => i.Quantity * i.Product.Price)
                })
                .ToList();

            return Ok(carts);
            */

            return Ok("Waiting for Product model from Developer 2");
        }

    }
}
