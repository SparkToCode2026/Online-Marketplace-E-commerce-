"""
Daily digest: tech news picked for the owner, plus open trainings/jobs in Oman, found by
the AI with a web search and written like a short newsletter.

WhatsApp lets a business start a conversation only with a template Meta approved, and a
template is too small for the whole digest. So:
  1. cron on the VM runs "python digest.py" at 8:00 Oman time: it writes today's digest and
     sends the short template (TEMPLATE_TEXT) with a "send the digest" button.
  2. The owner taps the button (or asks, e.g. "موجز" or "وين الأخبار"): that opens WhatsApp's 24-hour window,
     and the bot sends the full digest, one message per item (see app.receive_message).
"python digest.py --now" skips the template and sends the full digest straight away.
"""
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

import app  # reuses send() and the OpenAI key

DIGEST_TO = os.getenv("DIGEST_TO")  # who gets the digest, e.g. 968xxxxxxxx
# Who the digest is for, so the AI picks news that matter to them and says why.
DIGEST_PROFILE = os.getenv("DIGEST_PROFILE") or "a junior software developer in Oman"
# A stronger model than the chat's: it runs once a day, and picking good news takes judgement.
DIGEST_MODEL = os.getenv("DIGEST_MODEL") or "gpt-5.4"
SAVED = os.path.expanduser("~/digest.json")  # today's digest, until the owner asks for it

TEMPLATE_NAME = "daily_digest_ready"
TEMPLATE_TEXT = "صباح الخير ☀️ موجزك التقني ليوم {{1}} جاهز: أخبار مختارة لك، وفرص تدريب ووظائف في عُمان."
BUTTON_TEXT = "أرسل الموجز"
BUTTON_PAYLOAD = "send_digest"  # comes back to /webhook when the owner taps the button

ARABIC_DAYS = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
ARABIC_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                 "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]

PROMPT = (
    "Today is {today}. You write a daily tech digest in Arabic, read on WhatsApp, for this reader: {profile}\n"
    "Search the web and pick 5 items:\n"
    "- 3 or 4 of the most important tech news stories of the last 48 hours for this reader "
    "(AI, the frameworks and tools they use, security updates that affect them);\n"
    "- 1 or 2 trainings, internships or junior jobs in IT, software or AI in Oman that are open now.\n"
    "For each item give: emoji (one), title (a short Arabic headline), date (the day it was published, "
    "like 21 أكتوبر), category (2-4 English words), details (2 or 3 short Arabic sentences with the key "
    "facts), why (one Arabic sentence on why it matters to this reader, linked to their own projects), "
    "and url (the exact, complete link of that article or job page, not a home page).\n"
    "Also give intro (one Arabic sentence summing up today's picks) and priorities "
    "(two short Arabic sentences: what the reader should look at first today).\n"
    "Write in Arabic; product, company and technology names stay in English. "
    "Only use real items from your search results; never invent one."
)

ITEM_SCHEMA = {
    "type": "object",
    "properties": {key: {"type": "string"} for key in ("emoji", "title", "date", "category", "details", "why", "url")},
    "required": ["emoji", "title", "date", "category", "details", "why", "url"],
    "additionalProperties": False,
}
DIGEST_SCHEMA = {
    "type": "object",
    "properties": {
        "intro": {"type": "string"},
        "items": {"type": "array", "items": ITEM_SCHEMA},
        "priorities": {"type": "string"},
    },
    "required": ["intro", "items", "priorities"],
    "additionalProperties": False,
}


def oman_today():
    return datetime.now(timezone(timedelta(hours=4))).date()  # Oman is UTC+4 all year


def day_label(day):
    """e.g. "الجمعة 23 أكتوبر"."""
    return f"{ARABIC_DAYS[day.weekday()]} {day.day} {ARABIC_MONTHS[day.month - 1]}"


def fetch_digest():
    """Ask the AI to search the web; returns {"intro", "items": [...], "priorities"}."""
    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {app.OPENAI_API_KEY}"},
        json={
            "model": DIGEST_MODEL,
            "tools": [{"type": "web_search"}],
            "input": PROMPT.format(today=oman_today().strftime("%A %Y-%m-%d"), profile=DIGEST_PROFILE),
            "text": {"format": {"type": "json_schema", "name": "digest", "strict": True, "schema": DIGEST_SCHEMA}},
        },
        timeout=300,  # searching takes a while
    )
    response.raise_for_status()
    return json.loads(app.output_text(response.json()))


def build():
    """Make today's digest and keep it in SAVED until the owner asks for it."""
    digest = fetch_digest()
    digest["day"] = oman_today().isoformat()
    with open(SAVED, "w", encoding="utf-8") as file:
        json.dump(digest, file, ensure_ascii=False)
    return digest


def todays_digest():
    """The digest cron made this morning, or a fresh one if there's none for today."""
    try:
        with open(SAVED, encoding="utf-8") as file:
            digest = json.load(file)
        if digest["day"] == oman_today().isoformat():
            return digest
    except (OSError, ValueError, KeyError):
        pass  # no digest yet (e.g. the container was recreated)
    return build()


def messages(digest):
    """The digest as WhatsApp messages: a header, one message per item, and the priorities."""
    day = day_label(datetime.fromisoformat(digest["day"]))
    texts = [f"☕ *موجزك التقني — {day}* 🇴🇲\n{digest['intro']}"]
    for number, item in enumerate(digest["items"], start=1):
        texts.append(
            f"{number}. {item['emoji']} *{item['title']}*\n"
            f"📅 {item['date']} | {item['category']}\n\n"
            f"{item['details']}\n\n"
            f"🎯 *لماذا يهمك؟* {item['why']}\n\n"
            f"🔗 {item['url']}"
        )
    texts.append(f"🎯 *أولويتك اليوم*\n{digest['priorities']}")
    return texts


def send_full(to):
    """Send today's whole digest. Only allowed within 24 hours of the owner's last message."""
    for text in messages(todays_digest()):
        # preview_url makes WhatsApp show the article's picture and title under the message.
        app.send(to, {"type": "text", "text": {"body": text, "preview_url": True}})
        time.sleep(1)  # so the messages arrive in order


def send_template(to):
    """The short morning message with the "send the digest" button."""
    return app.send(to, {"type": "template", "template": {
        "name": TEMPLATE_NAME,
        "language": {"code": "ar"},
        "components": [
            {"type": "body", "parameters": [{"type": "text", "text": day_label(oman_today())}]},
            {"type": "button", "sub_type": "quick_reply", "index": "0",
             "parameters": [{"type": "payload", "payload": BUTTON_PAYLOAD}]},
        ],
    }})


if __name__ == "__main__":
    if not DIGEST_TO:
        sys.exit("Set DIGEST_TO to the number that gets the digest")
    if "--now" in sys.argv:
        send_full(DIGEST_TO)
        print("Full digest sent", flush=True)
    else:
        print("Digest:", len(build()["items"]), "items", flush=True)
        # Accepted isn't delivered: if WhatsApp drops it later, the bot's log says why.
        print("Template accepted" if send_template(DIGEST_TO) else "Template NOT sent", flush=True)
