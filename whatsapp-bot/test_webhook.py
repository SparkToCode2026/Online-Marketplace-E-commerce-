"""
Quick check for the webhook, without Meta, OpenAI or the store.
Run it with:  python test_webhook.py
"""
import io
from contextlib import redirect_stdout

import app as bot
import store

# Replace everything that talks to the outside world with fakes.
# This way the test never sends a real WhatsApp message, never calls OpenAI
# and never touches the store's database.
sent = []
bot.send_message = lambda to, text: sent.append((to, text))

sessions = []
def fake_session(phone, name):
    sessions.append((phone, name))
    return {"token": "t", "userId": 1, "cartId": 1, "name": name}
store.open_session = fake_session

# The fake AI answers the last message, and remembers what it was given.
ai_calls = []
def fake_ai(history, session):
    ai_calls.append((len(history), session))
    return f"AI answer to: {history[-1]['content']}"
bot.ask_ai = fake_ai

client = bot.app.test_client()


def text_event(message_id, body, name="Layla"):
    # Shaped like the JSON Meta really sends.
    return {"entry": [{"changes": [{"field": "messages", "value": {
        "contacts": [{"profile": {"name": name}, "wa_id": "96891234567"}],
        "messages": [{"id": message_id, "from": "96891234567", "type": "text", "text": {"body": body}}],
    }}]}]}


# 1. Meta's verification (any verify token) -> we must echo the challenge.
r = client.get("/webhook?hub.mode=subscribe&hub.verify_token=anything&hub.challenge=12345")
assert r.status_code == 200 and r.get_data(as_text=True) == "12345"
assert client.get("/webhook?hub.challenge=12345").status_code == 403

# 2. A text message -> the customer is logged in to the store with their number and
#    WhatsApp name, and the AI's answer is sent back.
output = io.StringIO()
with redirect_stdout(output):
    r = client.post("/webhook", json=text_event("wamid.1", "I want headphones"))
assert r.status_code == 200
assert "Message from 96891234567: I want headphones" in output.getvalue()
assert sessions == [("96891234567", "Layla")]
assert ai_calls[-1] == (1, {"token": "t", "userId": 1, "cartId": 1, "name": "Layla", "phone": "96891234567"})
assert sent == [("96891234567", "AI answer to: I want headphones")]

# 3. Meta sends the same message again -> no second reply.
client.post("/webhook", json=text_event("wamid.1", "I want headphones"))
assert len(sent) == 1

# 4. A status update (no "messages" list) -> still 200, and no reply sent.
status_event = {"entry": [{"changes": [{"value": {"statuses": [{"status": "read"}]}}]}]}
assert client.post("/webhook", json=status_event).status_code == 200
assert len(sent) == 1

# 5. An image -> a polite "text only" reply, without calling the AI or the store.
image_event = {"entry": [{"changes": [{"value": {
    "messages": [{"id": "wamid.2", "from": "96891234567", "type": "image", "image": {}}],
}}]}]}
client.post("/webhook", json=image_event)
assert sent[-1] == ("96891234567", "Sorry, I can only read text messages for now.")
assert len(sessions) == 1

# 6. Memory: a follow-up is sent to the AI together with the earlier conversation.
client.post("/webhook", json=text_event("wamid.3", "add it to my cart"))
assert ai_calls[-1][0] == 3  # the first question, the AI's answer, the follow-up

# 7. Only the last MAX_HISTORY messages are kept.
for i in range(10):
    client.post("/webhook", json=text_event(f"wamid.more{i}", f"message {i}"))
assert len(bot.conversations["96891234567"]) == bot.MAX_HISTORY

# 8. Tapping "add to cart" under a product card -> the AI is told which product.
button_event = {"entry": [{"changes": [{"value": {"messages": [{
    "id": "wamid.5", "from": "96891234567", "type": "interactive",
    "interactive": {"type": "button_reply", "button_reply": {"id": "add:2", "title": "أضف للسلة"}},
}]}}]}]}
client.post("/webhook", json=button_event)
assert bot.conversations["96891234567"][-2]["content"] == "[Tapped the button: add product 2 to my cart]"

# 9. show_products sends one card per product: photo, name, price and the button.
cards = []
bot.send = lambda to, message: cards.append((to, message["interactive"]))
products = {
    2: {"productId": 2, "name": "Wireless Headphones", "price": 25.0, "description": "Noise-cancelling",
        "productUrl": "https://example.com/headphones.jpg"},
    3: {"productId": 3, "name": "Cotton T-Shirt", "price": 2.5, "description": None,
        "productUrl": "https://placehold.co/400x300?text=Product"},
}
real_call = store.call
def fake_call(method, path, session=None, **kwargs):
    if kwargs["params"]["id"] not in products:
        raise store.StoreError("Product not found")
    return products[kwargs["params"]["id"]]
store.call = fake_call
bot.is_photo = lambda url: url.endswith(".jpg")  # the placeholder is an SVG

result = bot.show_products({"phone": "96891234567"}, [2, 3, 999])
assert result == {"ok": True, "shown": ["Wireless Headphones", "Cotton T-Shirt"]}  # 999 doesn't exist
assert [to for to, _ in cards] == ["96891234567", "96891234567"]
headphones, tshirt = cards[0][1], cards[1][1]
assert headphones["header"] == {"type": "image", "image": {"link": "https://example.com/headphones.jpg"}}
assert headphones["body"]["text"] == "*Wireless Headphones*\n25 ر.ع.\nNoise-cancelling"
assert headphones["action"]["buttons"][0]["reply"] == {"id": "add:2", "title": "أضف للسلة"}
assert "header" not in tshirt  # not a JPEG/PNG -> sent without a photo
assert tshirt["body"]["text"] == "*Cotton T-Shirt*\n2.5 ر.ع.\n"
store.call = real_call

# 10. The store is down -> a polite reply, and the AI isn't called.
def store_down(phone, name):
    raise store.StoreError("connection refused")
store.open_session = store_down
calls_before = len(ai_calls)
with redirect_stdout(io.StringIO()):
    client.post("/webhook", json=text_event("wamid.4", "hello"))
assert sent[-1] == ("96891234567", "Sorry, the shop isn't available right now. Please try again later.")
assert len(ai_calls) == calls_before

# 11. remove_from_cart refuses an item that isn't in this customer's cart,
#    because the store's own remove endpoint doesn't check the owner.
store.view_cart = lambda session: {"items": [{"cart_item_id": 7}], "total": 5}
removed = []
store.call = lambda method, path, session=None, **kwargs: removed.append(kwargs["params"]["id"])
assert store.remove_from_cart({"cartId": 1}, 99)["ok"] is False
assert removed == []

print("All webhook checks passed")
