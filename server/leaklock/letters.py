"""Write a cancel or dispute letter on disk. Nothing is sent."""

from __future__ import annotations

import re
from pathlib import Path

from leaklock.names import display_name
from leaklock.store import account_number, connect, descriptor_map, list_subscriptions


def generate_advocacy_action(merchant_name: str, action_type: str) -> dict[str, object]:
    connection = connect()
    try:
        saved = descriptor_map(connection)
        shop = display_name(merchant_name, saved)
        chosen = _choose(list_subscriptions(connection), shop, merchant_name)
        stored_account = account_number(connection)
    finally:
        connection.close()
    amount = None if chosen is None else chosen.get("amount")
    dates = [] if chosen is None else [str(item) for item in chosen.get("dates", []) if item]
    folder = Path.cwd() / "letters"
    folder.mkdir(exist_ok=True)
    path = folder / f"{action_type}-{_slug(shop)}.md"
    path.write_text(_letter(shop, action_type, amount, dates, stored_account), encoding="utf-8")
    # The account number, if we have one, stays in the file and out of this result.
    return {
        "file_path": str(path),
        "preview": {"shop": shop, "amount": amount, "dates": dates},
    }


def _choose(subscriptions: list[dict[str, object]], shop: str, merchant_name: str) -> dict[str, object] | None:
    wanted = {shop.casefold(), merchant_name.casefold()}
    matches = [item for item in subscriptions if str(item.get("merchant_name", "")).casefold() in wanted]
    if not matches:
        return None
    return sorted(matches, key=lambda item: str(item.get("last_charge_date") or ""))[-1]


def _letter(
    shop: str,
    action_type: str,
    amount: object,
    dates: list[str],
    stored_account: str | None,
) -> str:
    title = "Please cancel this subscription" if action_type == "cancel" else "Please review this price increase"
    amount_line = "not known" if amount is None else f"₹{float(amount):.2f}"
    date_line = ", ".join(dates) if dates else "not known"
    if action_type == "cancel":
        ask = f"Please cancel the {shop} subscription. The charge is {amount_line}."
    else:
        ask = f"The charge for {shop} has gone up. Please review the new amount of {amount_line}."
    lines = [
        f"# {title}",
        "",
        f"Shop: {shop}",
        f"Amount: {amount_line}",
        f"Dates: {date_line}",
        "",
        ask,
        "Amounts are in rupees (₹).",
        "This letter is saved on this computer. It has not been emailed.",
    ]
    if stored_account:
        lines.extend(["", f"Account: {stored_account}"])
    return "\n".join(lines) + "\n"


def _slug(shop: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", shop.casefold()).strip("-")
    return slug or "shop"
