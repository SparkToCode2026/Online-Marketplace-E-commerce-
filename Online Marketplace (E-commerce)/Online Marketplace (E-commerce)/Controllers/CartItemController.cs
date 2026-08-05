using System;
using System.Collections.Generic;
using System.Text;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [Route("cartitem")]
    [ApiController]
    public class CartItemController : ControllerBase
    {
        private readonly ProjectContext context;

        public CartItemController(ProjectContext context)
        {
            this.context = context;
        }
    }
    }
