"""Read one local CSV statement and return a short summary."""

from __future__ import annotations

import csv
import re
from pathlib import Path

from leaklock.privacy import filter_statement_line

_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_HEADER = {
    "date": "date",
    "posted": "date",
    "posted_date": "date",
    "shop": "shop",
    "merchant": "shop",
    "description": "shop",
    "merchant_name": "shop",
    "amount": "amount",
    "amt": "amount",
    "currency": "currency",
    "curr": "currency",
    "direction": "direction",
    "type": "direction",
}


def ingest_csv(file_path: str, bank_template_hint: str | None = None) -> dict[str, object]:
    """Summarize a CSV under the working directory.

    The hint is accepted and ignored. xlsx and qfx are not read.
    """
    del bank_template_hint
    path = _inside_cwd(file_path)
    extension = path.suffix.lower()
    if extension in {".xlsx", ".qfx"}:
        raise ValueError(f"{extension} is not built yet. This step reads a local csv only.")
    if extension != ".csv":
        raise ValueError("This step reads a local csv only.")
    rows = [row for row in csv.reader(path.read_text(encoding="utf-8").splitlines()) if any(cell.strip() for cell in row)]
    if not rows:
        return _summary(path.name, [], 0)
    columns, data_rows = _columns(rows)
    kept = []
    skipped = 0
    for row in data_rows:
        line = _filter_line(row, columns)
        charge = filter_statement_line(line) if line else None
        if charge is None:
            skipped += 1
            continue
        kept.append(charge)
    return _summary(path.name, kept, skipped)


def _inside_cwd(file_path: str) -> Path:
    cwd = Path.cwd().resolve()
    resolved = Path(file_path).expanduser().resolve()
    if not resolved.is_relative_to(cwd):
        raise ValueError("That path leaves the working directory.")
    return resolved


def _columns(rows: list[list[str]]) -> tuple[dict[str, int], list[list[str]]]:
    first = rows[0][0].strip() if rows[0] else ""
    if _DATE.fullmatch(first):
        return {"date": 0, "shop": 1, "amount": 2, "currency": 3, "direction": 4}, rows
    columns: dict[str, int] = {}
    for index, cell in enumerate(rows[0]):
        name = _HEADER.get(cell.strip().lower())
        if name and name not in columns:
            columns[name] = index
    missing = {"date", "shop", "amount", "currency"} - columns.keys()
    if missing:
        raise ValueError("This csv needs date, shop, amount, and currency columns.")
    return columns, rows[1:]


def _filter_line(row: list[str], columns: dict[str, int]) -> str | None:
    def cell(name: str) -> str:
        index = columns.get(name)
        if index is None or index >= len(row):
            return ""
        return row[index].strip()

    shop = cell("shop").replace("|", " ")
    date, amount, currency, direction = cell("date"), cell("amount"), cell("currency"), cell("direction")
    if not (date and shop and amount and currency):
        return None
    # Balance and account columns are left behind on purpose.
    if direction:
        return f"{date} | {shop} | {amount} | {currency} | {direction}"
    return f"{date} | {shop} | {amount} | {currency}"


def _summary(file_name: str, kept: list, skipped: int) -> dict[str, object]:
    names: list[str] = []
    for charge in kept:
        if charge.shop not in names:
            names.append(charge.shop)
    dates = sorted(charge.date for charge in kept)
    return {
        "file_name": file_name,
        "rows_kept": len(kept),
        "rows_skipped": skipped,
        "merchant_names": names,
        "earliest_date": dates[0] if dates else "",
        "latest_date": dates[-1] if dates else "",
    }
