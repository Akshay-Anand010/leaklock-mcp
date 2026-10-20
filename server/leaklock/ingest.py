"""Read one local statement and return a short summary."""

from __future__ import annotations

import csv
import re
from datetime import date, datetime
from pathlib import Path

from leaklock.names import display_name
from leaklock.privacy import Charge, extract_account_number, filter_statement_line
from leaklock.store import add_charge, connect, descriptor_map, remember_account

_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_INDIAN_BANKS = {"hdfc", "icici", "sbi", "axis", "kotak"}
_HEADER = {
    "date": "date",
    "txn date": "date",
    "tran date": "date",
    "transaction date": "date",
    "posted": "date",
    "posted_date": "date",
    "narration": "shop",
    "particulars": "shop",
    "description": "shop",
    "transaction remarks": "shop",
    "remarks": "shop",
    "transaction particulars": "shop",
    "shop": "shop",
    "merchant": "shop",
    "merchant_name": "shop",
    "amount": "amount",
    "amt": "amount",
    "withdrawal amt": "debit",
    "withdrawal amount": "debit",
    "withdrawal amount (inr)": "debit",
    "debit": "debit",
    "dr": "debit",
    "deposit amt": "credit",
    "deposit amount": "credit",
    "deposit amount (inr)": "credit",
    "credit": "credit",
    "cr": "credit",
    "currency": "currency",
    "curr": "currency",
    "direction": "direction",
    "type": "direction",
}
_ACCOUNT_HEADERS = {"account", "account_number", "acct"}
_OFX_OUT = {"DEBIT", "POS", "CHECK", "FEE", "ATM", "DIRECTDEBIT", "REPEATPMT", "SRVCHG", "PAYMENT"}
_OFX_IN = {"CREDIT", "DEP", "DIRECTDEP", "INT", "DIV"}


def ingest_statement(file_path: str, bank_template_hint: str | None = None) -> dict[str, object]:
    """Summarize a csv, xlsx, or qfx/ofx file under the working directory."""
    bank = _bank_hint(bank_template_hint)
    path = _inside_cwd(file_path)
    extension = path.suffix.lower()
    if extension == ".csv":
        rows = _csv_rows(path)
    elif extension == ".xlsx":
        rows = _xlsx_rows(path)
    elif extension in {".qfx", ".ofx"}:
        rows = _ofx_rows(path)
    else:
        raise ValueError("This step reads a csv, xlsx, or qfx/ofx file.")
    if not rows:
        return _summary(path.name, [], 0)
    columns, account_index, data_rows = _columns(rows, bank)
    connection = connect()
    try:
        saved = descriptor_map(connection)
        kept: list[Charge] = []
        skipped = 0
        for row in data_rows:
            _remember_row_account(connection, row, columns, account_index)
            line = _filter_line(row, columns, bank)
            charge = filter_statement_line(line) if line else None
            if charge is None:
                skipped += 1
                continue
            add_charge(
                connection,
                shop_raw=charge.shop,
                amount=charge.amount,
                currency=charge.currency,
                charge_date=charge.date,
            )
            kept.append(charge)
        names = _merchant_names(kept, saved)
    finally:
        connection.close()
    return _summary(path.name, kept, skipped, names)


def _inside_cwd(file_path: str) -> Path:
    cwd = Path.cwd().resolve()
    resolved = Path(file_path).expanduser().resolve()
    if not resolved.is_relative_to(cwd):
        raise ValueError("That path leaves the working directory.")
    return resolved


def _csv_rows(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8-sig")
    return [row for row in csv.reader(text.splitlines()) if any(cell.strip() for cell in row)]


def _xlsx_rows(path: Path) -> list[list[str]]:
    import openpyxl

    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book.active
    rows: list[list[str]] = []
    if sheet is not None:
        for raw in sheet.iter_rows(values_only=True):
            cells = [_cell_text(value) for value in raw]
            if any(cells):
                rows.append(cells)
    book.close()
    return rows


def _cell_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value).strip()


def _ofx_rows(path: Path) -> list[list[str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    currency_match = re.search(r"<CURDEF>([A-Z]{3})", text)
    currency = currency_match.group(1) if currency_match else "INR"
    rows = [["date", "shop", "amount", "currency", "direction"]]
    for block in re.split(r"<STMTTRN>", text, flags=re.IGNORECASE)[1:]:
        body = re.split(r"</STMTTRN>", block, maxsplit=1, flags=re.IGNORECASE)[0]
        posted = _ofx_tag(body, "DTPOSTED")
        amount = _ofx_tag(body, "TRNAMT")
        shop = _ofx_tag(body, "NAME") or _ofx_tag(body, "PAYEE") or _ofx_tag(body, "MEMO")
        direction = _ofx_direction(_ofx_tag(body, "TRNTYPE"), amount)
        when = _ofx_date(posted)
        if not when or not shop or not amount:
            rows.append(["", "", "", "", ""])
            continue
        shown = amount[1:] if amount.startswith("-") else amount
        rows.append([when, shop, shown, currency, direction])
    return rows


def _ofx_tag(block: str, name: str) -> str:
    match = re.search(rf"<{name}>\s*([^<\r\n]+)", block, re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _ofx_date(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) < 8:
        return ""
    return f"{digits[0:4]}-{digits[4:6]}-{digits[6:8]}"


def _ofx_direction(trntype: str, amount: str) -> str:
    kind = trntype.upper()
    if kind in _OFX_OUT:
        return "out"
    if kind in _OFX_IN:
        return "in"
    return "in" if amount.startswith("-") else "out"


def _bank_hint(hint: str | None) -> str | None:
    if hint is None or not hint.strip():
        return None
    bank = hint.strip().lower()
    if bank not in _INDIAN_BANKS:
        raise ValueError("bank_template_hint must be hdfc, icici, sbi, axis, or kotak.")
    return bank


def _columns(rows: list[list[str]], bank: str | None) -> tuple[dict[str, int], int | None, list[list[str]]]:
    first = rows[0][0].strip() if rows[0] else ""
    if _ISO_DATE.fullmatch(first) or _looks_like_indian_date(first):
        return {"date": 0, "shop": 1, "amount": 2, "currency": 3, "direction": 4}, None, rows
    columns: dict[str, int] = {}
    account_index = None
    for index, cell in enumerate(rows[0]):
        label = _header_label(cell)
        if "value" in label and "date" in label:
            continue
        if label in _ACCOUNT_HEADERS and account_index is None:
            account_index = index
            continue
        name = _HEADER.get(label)
        if name and name not in columns:
            columns[name] = index
    has_amount = "amount" in columns or "debit" in columns or "credit" in columns
    if "date" not in columns or "shop" not in columns or not has_amount:
        raise ValueError("This file needs a date, a shop, and an amount.")
    if bank is None and "currency" not in columns and "amount" in columns:
        # A generic file can omit currency. Rupees are the default.
        pass
    return columns, account_index, rows[1:]


def _header_label(cell: str) -> str:
    text = cell.strip().lower().replace(".", "")
    return re.sub(r"\s+", " ", text)


def _filter_line(row: list[str], columns: dict[str, int], bank: str | None) -> str | None:
    def cell(name: str) -> str:
        index = columns.get(name)
        if index is None or index >= len(row):
            return ""
        return row[index].strip()

    shop = cell("shop").replace("|", " ")
    posted = _to_iso_date(cell("date"), indian=bank is not None or _looks_like_indian_date(cell("date")))
    amount, direction = _amount_and_direction(row, columns)
    currency = cell("currency") or "INR"
    if not (posted and shop and amount):
        return None
    # Balance and account columns stay out of the line the filter sees.
    if direction:
        return f"{posted} | {shop} | {amount} | {currency} | {direction}"
    return f"{posted} | {shop} | {amount} | {currency}"


def _looks_like_indian_date(value: str) -> bool:
    return re.fullmatch(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", value.strip()) is not None


def _to_iso_date(value: str, indian: bool) -> str:
    text = value.strip()
    if _ISO_DATE.fullmatch(text):
        return text
    match = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", text)
    if match is None or not indian:
        return ""
    # hdfc, icici, sbi, axis, and kotak write day/month/year. 05/06/2026 is 5 June.
    day, month, year = (int(part) for part in match.groups())
    if year < 100:
        year += 2000
    try:
        found = date(year, month, day)
    except ValueError:
        return ""
    return found.isoformat()


def _amount_and_direction(row: list[str], columns: dict[str, int]) -> tuple[str, str]:
    def cell(name: str) -> str:
        index = columns.get(name)
        if index is None or index >= len(row):
            return ""
        return row[index].strip()

    debit = cell("debit")
    credit = cell("credit")
    if _has_money(debit) and not _has_money(credit):
        return debit, "out"
    if _has_money(credit) and not _has_money(debit):
        return credit, "in"
    return cell("amount"), cell("direction")


def _has_money(value: str) -> bool:
    match = re.fullmatch(r"(?:₹|rs\.?|inr|\$)?\s*([+-]?[\d,]+(?:\.\d+)?)", value.strip(), re.IGNORECASE)
    if match is None:
        return False
    return float(match.group(1).replace(",", "")) != 0.0


def _remember_row_account(
    connection: object,
    row: list[str],
    columns: dict[str, int],
    account_index: int | None,
) -> None:
    shop_index = columns.get("shop")
    chunks = []
    if shop_index is not None and shop_index < len(row):
        chunks.append(row[shop_index])
    if account_index is not None and account_index < len(row):
        digits = re.sub(r"\D", "", row[account_index])
        if len(digits) >= 8:
            chunks.append(f"account {digits}")
    for chunk in chunks:
        found = extract_account_number(chunk)
        if found:
            remember_account(connection, found)  # type: ignore[arg-type]
            return


def _merchant_names(kept: list[Charge], saved: dict[str, str]) -> list[str]:
    names: list[str] = []
    for charge in kept:
        name = display_name(charge.shop, saved)
        if name not in names:
            names.append(name)
    return names


def _summary(file_name: str, kept: list[Charge], skipped: int, names: list[str] | None = None) -> dict[str, object]:
    shown = names if names is not None else _merchant_names(kept, {})
    dates = sorted(charge.date for charge in kept)
    return {
        "file_name": file_name,
        "rows_kept": len(kept),
        "rows_skipped": skipped,
        "merchant_names": shown,
        "earliest_date": dates[0] if dates else "",
        "latest_date": dates[-1] if dates else "",
    }
