"""Group charges and mail into subscriptions and price rises."""

from __future__ import annotations

import hashlib
from datetime import date, timedelta

from leaklock.names import display_name
from leaklock.store import (
    connect,
    descriptor_map,
    list_charges,
    list_emails,
    replace_subscriptions,
)

_RECENT_DAYS = 45
_AGREE_DAYS = 21


def analyze_leakage_and_hikes() -> list[dict[str, str]]:
    connection = connect()
    try:
        saved = descriptor_map(connection)
        charges = [_named(row, saved) for row in list_charges(connection)]
        emails = [_named(row, saved) for row in list_emails(connection)]
        findings, subscriptions = _group(charges, emails)
        replace_subscriptions(connection, subscriptions)
        return findings
    finally:
        connection.close()


def _named(row: dict[str, object], saved: dict[str, str]) -> dict[str, object]:
    named = dict(row)
    named["shop"] = display_name(str(row["shop_raw"]), saved)
    return named


def _group(
    charges: list[dict[str, object]], emails: list[dict[str, object]]
) -> tuple[list[dict[str, str]], list[dict[str, object]]]:
    buckets: dict[tuple[str, str], list[dict[str, object]]] = {}
    for charge in charges:
        buckets.setdefault((str(charge["shop"]), str(charge["currency"])), []).append(charge)
    findings: list[dict[str, str]] = []
    subscriptions: list[dict[str, object]] = []
    matched_email_ids: set[str] = set()
    for (shop, currency), items in sorted(buckets.items()):
        items.sort(key=lambda item: str(item["charge_date"]))
        related = [item for item in emails if item["shop"] == shop and str(item["currency"]) == currency]
        cycle = _cycle(items)
        agreed = _agrees(items, related)
        repeated = len(items) >= 2
        confidence = "active" if repeated or agreed else "candidate"
        recent = [item for item in related if _near_any(str(item["charge_date"]), items, _RECENT_DAYS)]
        source = "both" if recent else "bank"
        for item in recent:
            matched_email_ids.add(str(item["row_hash"]))
        subscription = _subscription(shop, currency, items, cycle, source, confidence, related)
        subscriptions.append(subscription)
        if repeated or agreed:
            findings.append(
                {
                    "subscription_id": str(subscription["id"]),
                    "kind": "recurring",
                    "reason": _recurring_reason(shop, cycle, confidence),
                }
            )
        if source == "bank":
            if confidence == "candidate":
                reason = f"Only one {shop} charge so far, and there is no email. It stays a candidate, and it is still valid."
            else:
                reason = f"{shop} is on the bank statement with no email. That is still valid."
            findings.append(
                {
                    "subscription_id": str(subscription["id"]),
                    "kind": "bank_only",
                    "reason": reason,
                }
            )
        rise = _price_rise(items, cycle)
        if rise is not None:
            subscription["price_rise"] = True
            subscription["old_amount"] = rise[0]
            subscription["new_amount"] = rise[1]
            subscription["percent"] = rise[2]
            subscription["amount"] = rise[1]
            findings.append(
                {
                    "subscription_id": str(subscription["id"]),
                    "kind": "price_rise",
                    "reason": f"{shop} went from {rise[0]:.2f} to {rise[1]:.2f} {currency} on the same {cycle} cycle.",
                }
            )
    for item in emails:
        if str(item["row_hash"]) in matched_email_ids:
            continue
        if _near_any(str(item["charge_date"]), charges, _RECENT_DAYS) and any(
            charge["shop"] == item["shop"] for charge in charges
        ):
            continue
        subscription = _email_only(item)
        subscriptions.append(subscription)
        findings.append(
            {
                "subscription_id": str(subscription["id"]),
                "kind": "check_email_only",
                "reason": f"{item['shop']} sent billing mail and there is no recent bank charge.",
            }
        )
    return findings, subscriptions


def _subscription(
    shop: str,
    currency: str,
    items: list[dict[str, object]],
    cycle: str | None,
    source: str,
    confidence: str,
    emails: list[dict[str, object]],
) -> dict[str, object]:
    last = str(items[-1]["charge_date"])
    trial = next((str(item["charge_date"]) for item in emails if item["kind"] == "trial"), None)
    return {
        "id": _stable_id(shop, currency, "bank"),
        "merchant_name": shop,
        "amount": items[-1]["amount"],
        "currency": currency,
        "cycle": cycle,
        "source": source,
        "last_charge_date": last,
        "next_predicted_date": _next_date(last, cycle),
        "price_rise": False,
        "old_amount": None,
        "new_amount": None,
        "percent": None,
        "confidence": confidence,
        "status": "trial" if trial else "active",
        "trial_end_date": trial,
        "charge_ids": [str(item["row_hash"]) for item in items],
        "email_ids": [str(item["row_hash"]) for item in emails],
        "dates": [str(item["charge_date"]) for item in items],
    }


def _email_only(item: dict[str, object]) -> dict[str, object]:
    shop = str(item["shop"])
    currency = str(item["currency"])
    when = str(item["charge_date"])
    return {
        "id": _stable_id(shop, currency, "email"),
        "merchant_name": shop,
        "amount": item["amount"],
        "currency": currency,
        "cycle": None,
        "source": "email",
        "last_charge_date": when,
        "next_predicted_date": None,
        "price_rise": False,
        "old_amount": None,
        "new_amount": None,
        "percent": None,
        "confidence": "candidate",
        "status": "trial" if item["kind"] == "trial" else "active",
        "trial_end_date": when if item["kind"] == "trial" else None,
        "charge_ids": [],
        "email_ids": [str(item["row_hash"])],
        "dates": [when],
    }


def _recurring_reason(shop: str, cycle: str | None, confidence: str) -> str:
    if confidence == "candidate":
        return f"Only one {shop} charge so far, so this stays a candidate."
    if cycle:
        return f"{shop} repeats {cycle}, so this subscription is active."
    return f"{shop} shows up more than once, or the bank and email agree, so this subscription is active."


def _cycle(items: list[dict[str, object]]) -> str | None:
    if len(items) < 2:
        return None
    labels = []
    dates = [date.fromisoformat(str(item["charge_date"])) for item in items]
    for earlier, later in zip(dates, dates[1:]):
        gap = (later - earlier).days
        if 5 <= gap <= 9:
            labels.append("weekly")
        elif 25 <= gap <= 35:
            labels.append("monthly")
        elif 300 <= gap <= 400:
            labels.append("annual")
        else:
            return None
    # A price change is only compared when every gap is the same cycle.
    if len(set(labels)) == 1:
        return labels[0]
    return None


def _price_rise(items: list[dict[str, object]], cycle: str | None) -> tuple[float, float, float] | None:
    if cycle is None or len(items) < 2:
        return None
    old = float(items[-2]["amount"])
    new = float(items[-1]["amount"])
    if new <= old or old <= 0:
        return None
    percent = round((new - old) / old * 100, 2)
    return old, new, percent


def _agrees(charges: list[dict[str, object]], emails: list[dict[str, object]]) -> bool:
    for item in emails:
        for charge in charges:
            if not _within(str(item["charge_date"]), str(charge["charge_date"]), _AGREE_DAYS):
                continue
            if item["amount"] is None or abs(float(item["amount"]) - float(charge["amount"])) < 0.02:
                return True
    return False


def _near_any(when: str, charges: list[dict[str, object]], window: int) -> bool:
    return any(_within(when, str(charge["charge_date"]), window) for charge in charges)


def _within(left: str, right: str, window: int) -> bool:
    return abs((date.fromisoformat(left) - date.fromisoformat(right)).days) <= window


def _next_date(last: str, cycle: str | None) -> str | None:
    if cycle is None:
        return None
    start = date.fromisoformat(last)
    days = {"weekly": 7, "monthly": 30, "annual": 365}[cycle]
    return (start + timedelta(days=days)).isoformat()


def _stable_id(shop: str, currency: str, source: str) -> str:
    return hashlib.sha256(f"{shop}|{currency}|{source}".encode()).hexdigest()[:16]
