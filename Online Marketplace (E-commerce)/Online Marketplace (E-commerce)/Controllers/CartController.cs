using System;
using System.Collections.Generic;
using System.Text;

namespace Online_Marketplace__E_commerce_.Controllers
{
    [Route ("cart")]
    [ApiContoller]
    public  class CartController : ControllerBase
    {
        private readonly ProjectContext context;

        public CartController(ProjectContext context)
        {
            this.context = context;
        }
    }
}
