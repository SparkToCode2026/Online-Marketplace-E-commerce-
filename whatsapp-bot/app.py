"""
WhatsApp shopping bot for the marketplace.

The customer chats on WhatsApp; Meta sends each message to /webhook; the AI reads it and
uses the store tools (store.py) to search products, fill the cart and place the order;
then we send the AI's answer back through the WhatsApp API.
"""
import json
import os

import requests
from dotenv import load_dotenv
from flask import Flask, request

import store

# Load variables from the .env file (tokens, keys, ...).
# In Docker there is no .env file: docker-compose passes the same variables instead.
load_dotenv()

# Our WhatsApp credentials (from Meta dashboard > WhatsApp > API Setup).
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
PHONE_NUMBER_ID = os.getenv("PHONE_NUMBER_ID")

# Our OpenAI key (from platform.openai.com > API keys) and the model that answers.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

# The store's website, which the bot sends when a customer asks for the link.
STORE_URL = os.getenv("STORE_URL")

SYSTEM_PROMPT = (
    "You are the WhatsApp sales assistant of an online marketplace in Oman. "
    + (f"The store's website is {STORE_URL}: send this link whenever the customer asks for the website. "
       if STORE_URL else "")
    + "Prices are in Omani Rial (ر.ع. in Arabic, OMR in English). "
    "Use the tools for everything about products, the cart and orders. Never invent products, prices or stock. "
    "To find products, call list_products and pick every product that matches what the customer wants, "
    "including synonyms and other languages: e.g. جوتي or shoes also means sneakers, and سماعات also means earbuds. "
    "Product names are in English. Only products of the kind the customer asked for match. "
    "If none does (e.g. they ask for perfume and the store has none), never call show_products: "
    "just say the store doesn't have it, and name in words two or three kinds of things it does sell. "
    "When there are matching products, show them right away (don't ask first): "
    "call show_products with their product_ids, and the customer gets each one as a card "
    "with a photo, the price and an add-to-cart button. Then reply with one short line only, "
    "without repeating the products' details. "
    "When the customer taps a card's button, you get a message like [Tapped the button: add product 2 to my cart]: "
    "add it with add_to_cart, and reply in the language of the customer's earlier messages. "
    "When adding to the cart, use quantity 1 unless the customer says otherwise, "
    "and confirm with the new cart total. "
    "To check out: show the cart and the total, ask for the delivery address and city, "
    "and wait for the customer to confirm before calling checkout. "
    "Payment is cash on delivery only. Only say the order is placed if checkout returns ok, "
    "then give the order number; otherwise explain the reason. "
    "Always reply in the same language the customer writes in, short and friendly like a chat message, "
    "in plain text without Markdown headings or tables."
)


def send(to, message):
    """Send one WhatsApp message to the phone number "to".

    message is the part that depends on the kind of message,
    e.g. {"type": "text", "text": {"body": "hi"}}.
    """
    url = f"https://graph.facebook.com/v23.0/{PHONE_NUMBER_ID}/messages"
    headers = {"Authorization": f"Bearer {WHATSAPP_TOKEN}"}
    body = {"messaging_product": "whatsapp", "to": to, **message}

    try:
        response = requests.post(url, headers=headers, json=body, timeout=10)
    except requests.RequestException as error:
        # No internet, timeout, ... We print it instead of crashing the webhook.
        print(f"Could not reach WhatsApp: {error}", flush=True)
        return False

    if not response.ok:
        # Common reasons: the token expired, or (test number) the recipient
        # is not in the allowed list in Meta's API Setup page.
        print(f"WhatsApp refused the message: {response.text}", flush=True)
    return response.ok


def send_message(to, text):
    """Send a WhatsApp text message to the phone number "to"."""
    send(to, {"type": "text", "text": {"body": text}})


def is_photo(url):
    """True if the link is a JPEG or PNG image, the only kinds WhatsApp shows in a card."""
    try:
        response = requests.head(url, timeout=5, allow_redirects=True)
    except requests.RequestException:  # no internet, or not a link at all
        return False
    return response.ok and response.headers.get("Content-Type", "").split(";")[0] in ("image/jpeg", "image/png")


def send_product_card(to, product):
    """Send one product as a card: photo, name, price, description and an "add to cart" button."""
    price = f"{product['price']:.3f}".rstrip("0").rstrip(".")  # 25.000 -> 25, 2.500 -> 2.5
    card = {
        "type": "button",
        "body": {"text": f"*{product['name']}*\n{price} ر.ع.\n{product['description'] or ''}"[:1000]},
        # When the customer taps the button, WhatsApp sends us back its id (see receive_message).
        "action": {"buttons": [
            {"type": "reply", "reply": {"id": f"add:{product['productId']}", "title": "أضف للسلة"}},
        ]},
    }
    # Any other kind of link (e.g. an SVG placeholder) would make WhatsApp drop the whole
    # message, so those products are sent without a photo.
    if is_photo(product["productUrl"]):
        card["header"] = {"type": "image", "image": {"link": product["productUrl"]}}
    send(to, {"type": "interactive", "interactive": card})


def show_products(session, product_ids):
    """The show_products tool: send the customer a card for each product."""
    shown = []
    for product_id in product_ids[:5]:  # more cards than that would flood the chat
        try:
            product = store.call("GET", "/Product/getById", params={"id": product_id})
        except store.StoreError:
            continue  # an id the AI made up, or a product that was just deleted
        send_product_card(session["phone"], product)
        shown.append(product["name"])
    return {"ok": True, "shown": shown}


def tool(name, description, **properties):
    """One tool definition in the shape OpenAI expects. Every property is required."""
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": list(properties),
                "additionalProperties": False,
            },
        },
    }


# The tools the AI is allowed to use. OpenAI reads these descriptions to decide
# when to call them; our code (ask_ai below) actually runs them, in store.py.
TOOLS = [
    tool("list_products", "List every product the store has in stock, to pick the ones the customer wants."),
    tool("show_products", "Send the customer product cards with a photo, the price and an add-to-cart button.",
         product_ids={"type": "array", "items": {"type": "integer"}, "description": "At most 5"}),
    tool("view_cart", "Show the customer's cart and its total."),
    tool("add_to_cart", "Add a product to the customer's cart.",
         product_id={"type": "integer"},
         quantity={"type": "integer", "description": "How many, at least 1"}),
    tool("remove_from_cart", "Remove one line from the customer's cart.",
         cart_item_id={"type": "integer", "description": "The cart_item_id from view_cart"}),
    tool("checkout", "Place the order for everything in the cart, paid cash on delivery.",
         address={"type": "string", "description": "Delivery address"},
         city={"type": "string"},
         coupon_code={"type": ["string", "null"], "description": "A discount code, or null"}),
]
TOOL_FUNCTIONS = {
    "list_products": store.list_products,
    "show_products": show_products,
    "view_cart": store.view_cart,
    "add_to_cart": store.add_to_cart,
    "remove_from_cart": store.remove_from_cart,
    "checkout": store.checkout,
}

# Meta may send the same message twice (for example when the AI takes long to answer).
# We remember the IDs we already handled, so we never reply twice to one message.
# ponytail: kept in memory, so it resets on restart and isn't shared between workers;
# move it to a database if duplicate replies show up.
handled_message_ids = set()

# Each person's recent messages, so the AI understands follow-ups like "add it to my cart".
# Key = phone number, value = list of messages.
# ponytail: kept in memory, so it resets on restart; move it to a database if
# conversations need to survive restarts.
conversations = {}
MAX_HISTORY = 10  # messages kept per person (5 questions + 5 answers)

# gunicorn looks for a variable named "app" inside app.py to start the server.
app = Flask(__name__)


def ask_ai(history, session):
    """Send the conversation so far to OpenAI and return the AI's next answer.

    history is a list like [{"role": "user", "content": "hi"}, {"role": "assistant", ...}, ...]
    session is the customer's store login (see store.open_session); the tools act as this customer.
    """
    # The instructions first, then the conversation, so the AI sees the whole context.
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history

    try:
        # The AI may need a few rounds: search, add to the cart, then write the answer.
        for _ in range(6):
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": OPENAI_MODEL, "messages": messages, "tools": TOOLS},
                timeout=60,
            )
            response.raise_for_status()  # turns an error answer (wrong key, no credit, ...) into an exception
            answer = response.json()["choices"][0]["message"]

            if not answer.get("tool_calls"):
                return answer["content"]  # a normal text answer: we're done

            # The AI asked to use one or more tools: run them and give it the results.
            messages.append(answer)
            for call in answer["tool_calls"]:
                name = call["function"]["name"]
                args = json.loads(call["function"]["arguments"])
                try:
                    result = TOOL_FUNCTIONS[name](session, **args)
                except Exception as error:  # e.g. the store says "Cart is empty" or "Not enough stock"
                    result = {"ok": False, "reason": str(error)}
                print(f"Tool {name}({args}) -> {result}", flush=True)
                messages.append({
                    "role": "tool",
                    "tool_call_id": call["id"],
                    "content": json.dumps(result, ensure_ascii=False),
                })
    except requests.RequestException as error:
        # Print the real reason for us, and send the customer a polite message instead.
        reason = error.response.text if error.response is not None else error
        print(f"OpenAI error: {reason}", flush=True)

    return "Sorry, I can't answer right now. Please try again in a moment."


@app.get("/")
def health():
    # Health check: open http://localhost:8000 in the browser and you should see this text.
    return "WhatsApp shopping bot is running"


@app.get("/webhook")
def verify_webhook():
    # Meta calls this once, when you click "Verify and save" in the dashboard.
    # It sends a "challenge" number; we send it back and Meta saves the webhook.
    # We don't check the "Verify token" field, so you can type anything there.
    mode = request.args.get("hub.mode")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe":
        return challenge, 200
    return "Verification failed", 403


@app.post("/webhook")
def receive_message():
    # Meta calls this every time something happens on our number:
    # a new message, or a status update (sent / delivered / read).
    data = request.get_json(silent=True) or {}

    # The JSON is nested: entry -> changes -> value -> messages.
    # Status updates have no "messages" list, so the loop simply skips them.
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            # The sender's WhatsApp profile name, used as their name in the store.
            contacts = value.get("contacts") or [{}]
            name = contacts[0].get("profile", {}).get("name")

            for message in value.get("messages", []):
                if message["id"] in handled_message_ids:
                    continue  # already answered this one
                handled_message_ids.add(message["id"])

                sender = message["from"]  # the sender's phone number, e.g. "968xxxxxxxx"

                if message["type"] == "text":
                    text = message["text"]["body"]
                elif message["type"] == "interactive" and message["interactive"]["type"] == "button_reply":
                    # The customer tapped "add to cart" under a product card. The button's id
                    # is "add:<productId>"; we hand the tap to the AI like a message.
                    product_id = message["interactive"]["button_reply"]["id"].removeprefix("add:")
                    text = f"[Tapped the button: add product {product_id} to my cart]"
                else:
                    # Images, voice notes, stickers, ... The AI only reads text for now.
                    print(f"Message from {sender}: <{message['type']} message>", flush=True)
                    send_message(sender, "Sorry, I can only read text messages for now.")
                    continue

                # flush=True makes the line show up right away (also in the Docker logs).
                print(f"Message from {sender}: {text}", flush=True)

                # Log the customer in to the store, so the tools can use their cart.
                try:
                    session = store.open_session(sender, name)
                except (store.StoreError, requests.RequestException) as error:
                    print(f"Store session failed: {error}", flush=True)
                    send_message(sender, "Sorry, the shop isn't available right now. Please try again later.")
                    continue
                session["phone"] = sender  # where show_products sends the cards

                # Add the new message to this person's conversation, ask the AI,
                # then save the answer too and forget the oldest messages.
                history = conversations.setdefault(sender, [])
                history.append({"role": "user", "content": text})
                reply = ask_ai(history, session)
                history.append({"role": "assistant", "content": reply})
                del history[:-MAX_HISTORY]

                send_message(sender, reply)

    # Always answer 200 quickly. Otherwise Meta thinks we failed and keeps resending the event.
    return "OK", 200


if __name__ == "__main__":
    # This block only runs locally with "python app.py".
    # In Docker, gunicorn imports "app" directly, so this part is skipped.
    port = int(os.getenv("PORT", 8000))
    app.run(port=port, debug=True)
