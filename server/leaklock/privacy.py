"""One statement line in, one shop charge out, or nothing."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date

_BALANCE = re.compile(r"\bbalance\b", re.IGNORECASE)
_PEER = re.compile(
    r"\b(?:venmo|zelle|cash\s*app|square\s*cash|apple\s*cash|popmoney|p2p|"
    r"peer(?:\s|-)?to(?:\s|-)?peer|peer\s+transfer)\b",
    re.IGNORECASE,
)
_GROCERY = re.compile(
    r"\b(?:grocery|groceries|grocer|supermarket|whole\s*foods|trader\s*joe'?s?|"
    r"kroger|safeway|aldi|publix|wegmans|food\s*lion|albertsons|sprouts|lidl|"
    r"instacart|heb|shoprite|vons|ralphs)\b",
    re.IGNORECASE,
)
_INCOMING_PHRASE = re.compile(
    r"\b(?:direct deposit|payroll|ach credit|interest credit|payment received|refund)\b",
    re.IGNORECASE,
)
_ACCOUNT = re.compile(
    r"\b(?:account(?:\s+number)?|acct\.?|a/c|iban|routing)\b[:\s#.-]*(?:\d[ -]?){8,}",
    re.IGNORECASE,
)
_CARD_LABEL = re.compile(
    r"\b(?:card(?:\s+number)?|pan)\b[:\s#.-]*(?:\d[ -]?){12,}",
    re.IGNORECASE,
)
_CARD_GROUPS = re.compile(r"\b\d{4}(?:[ -]\d{4}){2,}\b")
_LONG_RUN = re.compile(r"\b\d{8,}\b")
_AMOUNT = re.compile(r"^\$?\s*([+-]?\d+(?:\.\d+)?)$")

_INCOMING = {"in", "credit", "cr"}
_OUTGOING = {"out", "debit", "dr"}


@dataclass(frozen=True)
class Charge:
    shop: str
    amount: float
    currency: str
    date: str


def filter_statement_line(line: str) -> Charge | None:
    """Keep one outgoing shop charge from `date | shop | amount | CURRENCY`.

    An optional direction word may follow. Balances, incoming credits, peer
    transfers, and groceries are dropped. Account numbers and long card numbers
    are removed from the shop text before it can come back.
    """
    parts = [part.strip() for part in line.split("|")]
    if len(parts) not in (4, 5):
        return None
    raw_date, shop, amount_text, currency = parts[:4]
    direction = parts[4].lower() if len(parts) == 5 else None
    if not _is_iso_date(raw_date) or not shop:
        return None
    amount_match = _AMOUNT.fullmatch(amount_text)
    if amount_match is None or not re.fullmatch(r"[A-Z]{3}", currency):
        return None
    amount = float(amount_match.group(1))
    if direction is not None and direction not in _INCOMING and direction not in _OUTGOING:
        return None
    incoming = amount < 0 or direction in _INCOMING or _INCOMING_PHRASE.search(shop)
    if incoming or _BALANCE.search(shop) or _PEER.search(shop) or _GROCERY.search(shop):
        return None
    cleaned = _strip_secrets(shop)
    if not cleaned:
        return None
    return Charge(shop=cleaned, amount=abs(amount), currency=currency, date=raw_date)


def _is_iso_date(value: str) -> bool:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    year, month, day = (int(part) for part in value.split("-"))
    try:
        found = date(year, month, day)
    except ValueError:
        return False
    return found.isoformat() == value


def _strip_secrets(shop: str) -> str:
    # A short store number can stay. A long account or card run cannot.
    cleaned = _ACCOUNT.sub(" ", shop)
    cleaned = _CARD_LABEL.sub(" ", cleaned)
    cleaned = _CARD_GROUPS.sub(" ", cleaned)
    cleaned = _LONG_RUN.sub(" ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()
