"""
The owner's front door, opened from WhatsApp (the /door mode, see app.receive_message).

The door is a Raspberry Pi at home with a small API: POST /openDoor opens it, and
POST /tempCode {"code", "seconds"} adds a one-time code for a guest to type on its screen.
The Pi keeps a reverse SSH tunnel open to this server, so DOOR_URL is an address on this
server (http://host.docker.internal:8001 in docker-compose), never a public link.
"""
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import requests

DOOR_URL = os.getenv("DOOR_URL")
DOOR_KEY = os.getenv("DOOR_KEY")  # the same value as DOOR_KEY in the Pi's .env

HELP = (
    "🚪 *وضع الباب*\n"
    "• *افتح*: يفتح الباب\n"
    "• *رمز 1122 دقيقة*: رمز لضيف يكتبه في الشاشة، يشتغل مرة وحدة (بدون رقم أسوي لك رمز)\n"
    "• */ecommer*: ترجع للمتجر"
)

# Only these exact messages open the door, so e.g. "لا تفتح" never does.
OPEN_WORDS = ("افتح", "افتح الباب")
ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
CODE = re.compile(r"(?<!\d)\d{4,8}(?!\d)")  # the guest code: 4 to 8 digits
# How long a guest code lasts: "دقيقة", "5 دقائق", "ساعتين", ... (one minute if not said)
SECONDS = {"ثانية": 1, "ثواني": 1, "دقيقة": 60, "دقيقه": 60, "دقائق": 60, "دقايق": 60,
           "ساعة": 3600, "ساعه": 3600, "ساعات": 3600}
TWO = {"دقيقتين": 120, "ساعتين": 7200}
DURATION = re.compile(r"(\d+)?\s*(" + "|".join([*TWO, *SECONDS]) + ")")


def handle(text):
    """Do what the owner wrote in the /door mode, and return the reply."""
    text = text.translate(ARABIC_DIGITS).strip()
    if text in OPEN_WORDS:
        error = call("/openDoor")
        return f"❌ {error}" if error else "✅ انفتح الباب"
    if "رمز" in text or "كود" in text:
        code = CODE.search(text)
        # Read the duration without the code, so "رمز 1122 دقيقة" isn't 1122 minutes.
        duration = DURATION.search(CODE.sub("", text, count=1))
        seconds = 60
        if duration:
            number, unit = duration.groups()
            seconds = TWO.get(unit) or int(number or 1) * SECONDS[unit]
        return temp_code(code.group() if code else f"{secrets.randbelow(10000):04d}", seconds)
    return HELP


def temp_code(code, seconds):
    """Give the Pi a one-time guest code, and tell the owner until when it works."""
    error = call("/tempCode", {"code": code, "seconds": seconds})
    if error:
        return f"❌ {error}"
    now = datetime.now(timezone(timedelta(hours=4)))  # Oman time
    until = now + timedelta(seconds=seconds)
    day = "" if until.date() == now.date() else "بكرة "
    hour = until.hour % 12 or 12
    return f"✅ الرمز *{code}* شغال لين {day}{hour}:{until.minute:02d} {'ص' if until.hour < 12 else 'م'}، ومرة وحدة بس."


def call(path, payload=None):
    """POST to the Pi. Returns None if it worked, otherwise what went wrong, in Arabic."""
    if not (DOOR_URL and DOOR_KEY):
        return "الباب مو مربوط بعد: DOOR_URL و DOOR_KEY ناقصين في السيرفر."
    try:
        response = requests.post(DOOR_URL + path, json=payload, headers={"X-Door-Key": DOOR_KEY}, timeout=10)
    except requests.RequestException as error:  # the Pi is off, or its tunnel is down
        print(f"Door unreachable: {error}", flush=True)
        return "ما قدرت أوصل للباب: تأكد إن الـ Pi شغال ومتصل بالنت."
    if response.ok:
        return None
    print(f"Door answered {response.status_code}: {response.text[:200]}", flush=True)
    return {
        400: "الرمز لازم 4 إلى 8 أرقام، والمدة من 10 ثواني إلى 24 ساعة.",
        401: "مفتاح الباب (DOOR_KEY) في السيرفر ما يطابق اللي في الـ Pi.",
        503: "الريلاي في وضع المحاكاة، فالباب ما انفتح.",
    }.get(response.status_code, f"الباب رد بخطأ {response.status_code}.")
