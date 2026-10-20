"""Read billing mail from a local folder or from a mailbox named in the secret file."""

from __future__ import annotations

import email
import imaplib
import json
import os
import re
from datetime import date, datetime, timedelta
from email.header import decode_header
from email.message import Message
from email.utils import parsedate_to_datetime
from pathlib import Path

from leaklock.store import add_email, connect

_TRIAL = re.compile(r"trial (?:is )?end|trial ending|trial ends|free trial", re.IGNORECASE)
_HIKE = re.compile(r"price (?:increase|rise|is going up)|raising your price|new price", re.IGNORECASE)
_BILL = re.compile(r"invoice|receipt|billed|payment|subscription|renew", re.IGNORECASE)
_MONEY = re.compile(
    r"(?:₹|Rs\.?|INR|USD|EUR|GBP)\s*([0-9,]+(?:\.[0-9]{1,2})?)|\$\s*([0-9,]+(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)
_CURRENCY = re.compile(r"\b(USD|EUR|GBP)\b")


def secrets_path() -> Path:
    override = os.environ.get("LEAKLOCK_SECRETS")
    path = Path(override) if override else Path.cwd() / "leaklock.secrets.json"
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def sync_billing_communications(provider: str, days_back: int) -> dict[str, object]:
    """Keep billing, trial, and price-rise notes. The message body is not stored."""
    path = secrets_path()
    if not path.is_file():
        raise ValueError(
            "No local secret file. Add leaklock.secrets.json on this computer. This tool does not take an auth token."
        )
    secrets = json.loads(path.read_text(encoding="utf-8"))
    messages = _load_messages(provider, secrets, days_back)
    connection = connect()
    try:
        kept_dates: list[str] = []
        kept = 0
        for item in messages:
            if item["kind"] is None or item["charge_date"] is None:
                continue
            add_email(
                connection,
                shop_raw=str(item["shop"]),
                charge_date=str(item["charge_date"]),
                amount=item["amount"],
                currency=str(item["currency"]),
                subject=str(item["subject"]),
                kind=str(item["kind"]),
            )
            kept += 1
            kept_dates.append(str(item["charge_date"]))
    finally:
        connection.close()
    kept_dates.sort()
    return {
        "messages_scanned": len(messages),
        "billing_messages_kept": kept,
        "earliest_date": kept_dates[0] if kept_dates else "",
        "latest_date": kept_dates[-1] if kept_dates else "",
    }


def _load_messages(provider: str, secrets: dict[str, object], days_back: int) -> list[dict[str, object]]:
    eml_dir = secrets.get("eml_dir")
    if isinstance(eml_dir, str) and eml_dir.strip():
        # A folder of .eml files is enough for tests and for mail already saved on disk.
        return _from_folder(Path(eml_dir).expanduser(), days_back)
    mailbox = _mailbox_settings(provider, secrets)
    if mailbox is None:
        raise ValueError(f"The secret file has no mailbox settings for {provider}.")
    return _from_imap(mailbox, days_back)


def _mailbox_settings(provider: str, secrets: dict[str, object]) -> dict[str, str] | None:
    block = secrets.get(provider)
    if not isinstance(block, dict):
        return None
    host = str(block.get("host") or ("imap.gmail.com" if provider == "gmail" else ""))
    username = str(block.get("username") or "")
    password = str(block.get("password") or "")
    if not host or not username or not password:
        return None
    return {"host": host, "username": username, "password": password}


def _from_folder(folder: Path, days_back: int) -> list[dict[str, object]]:
    if not folder.is_dir():
        raise ValueError(f"The secret file points at {folder}, and that folder is not there.")
    messages = []
    for path in sorted(folder.glob("*.eml")):
        parsed = _parse_message(path.read_bytes(), days_back)
        if parsed is not None:
            messages.append(parsed)
    return messages


def _from_imap(mailbox: dict[str, str], days_back: int) -> list[dict[str, object]]:
    since = (date.today() - timedelta(days=days_back)).strftime("%d-%b-%Y")
    try:
        client = imaplib.IMAP4_SSL(mailbox["host"])
        client.login(mailbox["username"], mailbox["password"])
        client.select("INBOX")
        status, data = client.search(None, f"(SINCE {since})")
        if status != "OK" or not data or data[0] is None:
            client.logout()
            return []
        messages = []
        for number in data[0].split():
            fetched = client.fetch(number, "(RFC822)")
            if fetched[0] != "OK" or not fetched[1] or not isinstance(fetched[1][0], tuple):
                continue
            raw = fetched[1][0][1]
            if isinstance(raw, bytes):
                parsed = _parse_message(raw, days_back)
                if parsed is not None:
                    messages.append(parsed)
        client.logout()
    except imaplib.IMAP4.error as exc:
        raise ValueError("The mailbox refused the login in the local secret file.") from exc
    return messages


def _parse_message(raw: bytes, days_back: int) -> dict[str, object] | None:
    message = email.message_from_bytes(raw)
    subject = _header(message, "Subject")[:140]
    shop = _shop_from(message) or subject
    when = _message_date(message)
    body = _body_text(message)
    kind = _kind(subject, body)
    amount, currency = _money(subject + "\n" + body)
    charge_date = when.date().isoformat() if when else None
    if when is not None and when.date() < date.today() - timedelta(days=days_back):
        kind = None
    return {
        "shop": shop,
        "subject": subject,
        "kind": kind,
        "amount": amount,
        "currency": currency,
        "charge_date": charge_date,
    }


def _kind(subject: str, body: str) -> str | None:
    text = f"{subject}\n{body}"
    if _TRIAL.search(text):
        return "trial"
    if _HIKE.search(text):
        return "price_rise"
    if _BILL.search(text):
        return "billing"
    return None


def _money(text: str) -> tuple[float | None, str]:
    match = _MONEY.search(text)
    if match is None:
        return None, "INR"
    number = (match.group(1) or match.group(2)).replace(",", "")
    raw = match.group(0).upper()
    if "$" in match.group(0) or "USD" in raw:
        currency = "USD"
    elif "EUR" in raw:
        currency = "EUR"
    elif "GBP" in raw:
        currency = "GBP"
    else:
        currency = "INR"
    return float(number), currency


def _shop_from(message: Message) -> str:
    sender = _header(message, "From")
    name = sender.split("<", 1)[0].strip().strip('"')
    return name or sender


def _message_date(message: Message) -> datetime | None:
    raw = message.get("Date")
    if not raw:
        return None
    try:
        return parsedate_to_datetime(raw)
    except (TypeError, ValueError, IndexError):
        return None


def _header(message: Message, name: str) -> str:
    raw = message.get(name, "")
    parts = decode_header(raw)
    chunks: list[str] = []
    for text, encoding in parts:
        if isinstance(text, bytes):
            chunks.append(text.decode(encoding or "utf-8", errors="replace"))
        else:
            chunks.append(text)
    return "".join(chunks).strip()


def _body_text(message: Message) -> str:
    if message.is_multipart():
        chunks = []
        for part in message.walk():
            if part.get_content_type() != "text/plain":
                continue
            payload = part.get_payload(decode=True)
            if isinstance(payload, bytes):
                chunks.append(payload.decode(part.get_content_charset() or "utf-8", errors="replace"))
        return "\n".join(chunks)
    payload = message.get_payload(decode=True)
    if isinstance(payload, bytes):
        return payload.decode(message.get_content_charset() or "utf-8", errors="replace")
    return str(payload or "")
