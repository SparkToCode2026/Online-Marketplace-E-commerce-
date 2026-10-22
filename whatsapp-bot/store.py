"""
The bot's tools: everything the AI does in the store goes through the store's own API,
the same endpoints the website uses. The only bot-only endpoint is /Bot/session
(BotController.cs), which logs a customer in by WhatsApp number.
"""
import os

import requests


class StoreError(Exception):
    """The store said no (e.g. "Cart is empty"). The message is the store's own reason."""


def call(method, path, session=None, headers=None, **kwargs):
    """Send one request to the store API and return its answer (JSON, or plain text)."""
    # Locally the API runs on port 5190; in Docker the bot reaches it as http://api:8080/api.
    url = os.getenv("STORE_API_URL", "http://localhost:5190/api") + path
    headers = dict(headers or {})
    if session:
        headers["Authorization"] = f"Bearer {session['token']}"  # act as this customer

    response = requests.request(method, url, headers=headers, timeout=15, **kwargs)
    if not response.ok:
        raise StoreError(response.text)
    try:
        return response.json()
    except ValueError:
        return response.text  # some endpoints answer with a plain sentence


def open_session(phone, name):
    """Log the customer in by WhatsApp number (registering them the first time).

    Returns {"token", "userId", "cartId", "name"}. The token works on every
    customer endpoint, exactly like the token the website gets after login.
    """
    return call("POST", "/Bot/session", headers={"X-Bot-Key": os.getenv("BOT_KEY", "")},
                json={"phone": phone, "name": name})


def search_products(session, search):
    """Active, in-stock products whose name contains the search word (empty = all)."""
    products = call("GET", "/Product/filter", params={"search": search, "isActive": True, "inStock": True})
    return [
        {
            "product_id": p["productId"],
            "name": p["name"],
            "description": p["description"],
            "price": p["price"],
            "in_stock": p["stockQuantity"],
        }
        for p in products[:10]  # a chat message can't show a whole catalogue
    ]


def view_cart(session):
    """What's in the customer's cart, and the total."""
    cart = call("GET", "/Cart/getById", session, params={"id": session["cartId"]})
    items = [
        {
            "cart_item_id": item["cartItemId"],
            "name": item["product"]["name"],
            "quantity": item["quantity"],
            "unit_price": item["product"]["price"],
        }
        for item in cart["cartItems"] or []
    ]
    total = sum(item["quantity"] * item["unit_price"] for item in items)
    return {"items": items, "total": round(total, 3)}


def add_to_cart(session, product_id, quantity):
    """Add a product to the cart (adding it again increases the quantity)."""
    call("POST", "/CartItem/add", session,
         json={"cartId": session["cartId"], "productId": product_id, "quantity": quantity})
    return view_cart(session)


def remove_from_cart(session, cart_item_id):
    """Take one line out of the cart."""
    # The store's remove endpoint doesn't check whose cart an item is in, so we only
    # remove items that are really in this customer's cart.
    if cart_item_id not in [item["cart_item_id"] for item in view_cart(session)["items"]]:
        return {"ok": False, "reason": "That item is not in the customer's cart"}
    call("DELETE", "/CartItem/remove", session, params={"id": cart_item_id})
    return view_cart(session)


def checkout(session, address, city, coupon_code):
    """Turn the cart into an order, paid cash on delivery and shipped to the address."""
    # The store checks the stock and the coupon, prices the order and empties the cart.
    order_id = call("POST", "/Order/checkout", session,
                    params={"userId": session["userId"], "couponCode": coupon_code})
    order = call("GET", "/Order/getById", session, params={"id": order_id})

    # Cash on delivery: the payment starts as Pending. When the driver collects the money,
    # the admin marks it Completed in the dashboard, and that confirms the order.
    call("POST", "/Payment/add", session,
         json={"orderId": order_id, "amount": order["totalAmount"], "method": "Cash", "status": "Pending"})
    call("POST", "/Shipping/add", session, json={"orderId": order_id, "address": address, "city": city})

    return {"ok": True, "order_id": order_id, "total": order["totalAmount"], "payment": "Cash on delivery"}
