"""
Daily digest: every morning the bot sends the owner the day's top tech news and
open trainings/jobs in Oman, found by the AI with a web search.

cron on the VM runs it at 8:00 Oman time:  docker compose exec -T bot python digest.py

WhatsApp lets a business start a conversation only with a template that Meta approved
(TEMPLATE_TEXT below, saved in Meta as TEMPLATE_NAME). "--now" sends the same text as a
normal message instead, which WhatsApp allows within 24 hours of the person's last message.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

import requests

import app  # reuses send() and the OpenAI key

DIGEST_TO = os.getenv("DIGEST_TO")  # who gets the digest, e.g. 968xxxxxxxx
# A stronger model than the chat's: it runs once a day, and picking good news takes judgement.
DIGEST_MODEL = os.getenv("DIGEST_MODEL", "gpt-5.4")

TEMPLATE_NAME = "daily_tech_digest"
TEMPLATE_TEXT = (
    "صباح الخير ☀️ هذا موجزك اليومي\n\n"
    "📰 أخبار التقنية:\n1. {{1}}\n2. {{2}}\n3. {{3}}\n\n"
    "💼 تدريب ووظائف في عُمان:\n1. {{4}}\n2. {{5}}\n3. {{6}}\n\n"
    "يومك سعيد 🌟"
)
ITEMS = 3  # per section, matching the template's {{1}}..{{6}}

PROMPT = (
    "Today is {today}. Search the web and prepare a daily digest for a junior software developer in Oman.\n"
    "news: the 3 most important technology news stories of the last 24 hours (AI, big tech, software).\n"
    "jobs: 3 trainings, internships or junior jobs in IT, software or AI in Oman that are open now; "
    "say the company.\n"
    "For each item give text: one short line under 90 characters, written in Arabic even when the source "
    "is in English (only product and company names stay in English), and url: the exact, complete link of "
    "that article or job page (not a home page or a news section). "
    "Only use real items from your search results; never invent one."
)

ITEM_SCHEMA = {
    "type": "object",
    "properties": {"text": {"type": "string"}, "url": {"type": "string"}},
    "required": ["text", "url"],
    "additionalProperties": False,
}
DIGEST_SCHEMA = {
    "type": "object",
    "properties": {
        "news": {"type": "array", "items": ITEM_SCHEMA},
        "jobs": {"type": "array", "items": ITEM_SCHEMA},
    },
    "required": ["news", "jobs"],
    "additionalProperties": False,
}


def fetch_digest():
    """Ask the AI to search the web; returns {"news": [{text, url}, ...], "jobs": [...]}."""
    today = datetime.now(timezone(timedelta(hours=4))).strftime("%A %Y-%m-%d")  # Oman time
    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {app.OPENAI_API_KEY}"},
        json={
            "model": DIGEST_MODEL,
            "tools": [{"type": "web_search"}],
            "input": PROMPT.format(today=today),
            "text": {"format": {"type": "json_schema", "name": "digest", "strict": True, "schema": DIGEST_SCHEMA}},
        },
        timeout=300,  # searching takes a while
    )
    response.raise_for_status()
    # The answer is the text part of the "message" item (the others are the searches it made).
    text = next(
        part["text"]
        for item in response.json()["output"] if item["type"] == "message"
        for part in item["content"] if part["type"] == "output_text"
    )
    return json.loads(text)


def line(item):
    """One digest item as one line: template parameters can't contain line breaks."""
    text = " ".join(item["text"].split())[:100]
    with_link = f"{text} {item['url']}".strip()
    # Meta rejects a template whose text gets too long, so a very long link is left out.
    return with_link if len(with_link) <= 140 else text


def build_lines(digest):
    """The 6 lines for {{1}}..{{6}}: 3 news, then 3 jobs ("—" if the AI found fewer)."""
    news = [line(item) for item in digest["news"][:ITEMS]]
    jobs = [line(item) for item in digest["jobs"][:ITEMS]]
    return news + ["—"] * (ITEMS - len(news)) + jobs + ["—"] * (ITEMS - len(jobs))


def send_digest(lines, now=False):
    if now:
        body = TEMPLATE_TEXT
        for number, text in enumerate(lines, start=1):
            body = body.replace("{{%d}}" % number, text)
        return app.send(DIGEST_TO, {"type": "text", "text": {"body": body}})

    return app.send(DIGEST_TO, {"type": "template", "template": {
        "name": TEMPLATE_NAME,
        "language": {"code": "ar"},
        "components": [{"type": "body", "parameters": [{"type": "text", "text": text} for text in lines]}],
    }})


if __name__ == "__main__":
    if not DIGEST_TO:
        sys.exit("Set DIGEST_TO to the number that gets the digest")
    lines = build_lines(fetch_digest())
    print("\n".join(lines), flush=True)
    print("Digest sent" if send_digest(lines, now="--now" in sys.argv) else "Digest NOT sent", flush=True)
