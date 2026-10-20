"""Local SQLite ledger. The database file stays on this computer."""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from pathlib import Path

# Re-import uses the stripped shop text, not the display name, so a rename does not copy the row.
def row_hash(date: str, shop_raw: str, amount: float, currency: str) -> str:
    token = f"{date}|{shop_raw}|{amount:.2f}|{currency}"
    return hashlib.sha256(token.encode()).hexdigest()


def connect() -> sqlite3.Connection:
    override = os.environ.get("LEAKLOCK_DB")
    path = Path(override) if override else Path.cwd() / "leaklock.db"
    if not path.is_absolute():
        path = Path.cwd() / path
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS charges (
            row_hash TEXT PRIMARY KEY,
            shop_raw TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT NOT NULL,
            charge_date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS emails (
            row_hash TEXT PRIMARY KEY,
            shop_raw TEXT NOT NULL,
            charge_date TEXT NOT NULL,
            amount REAL,
            currency TEXT NOT NULL,
            subject TEXT NOT NULL,
            kind TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS descriptors (
            raw_text TEXT PRIMARY KEY,
            display_name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            body TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vault (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        """
    )
    return connection


def remember_account(connection: sqlite3.Connection, account_number: str) -> None:
    connection.execute(
        "INSERT INTO vault (key, value) VALUES ('account_number', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (account_number,),
    )
    connection.commit()


def account_number(connection: sqlite3.Connection) -> str | None:
    row = connection.execute("SELECT value FROM vault WHERE key = 'account_number'").fetchone()
    return None if row is None else str(row["value"])


def save_descriptor(connection: sqlite3.Connection, raw_text: str, display_name: str) -> None:
    connection.execute(
        "INSERT INTO descriptors (raw_text, display_name) VALUES (?, ?) "
        "ON CONFLICT(raw_text) DO UPDATE SET display_name = excluded.display_name",
        (raw_text.strip(), display_name.strip()),
    )
    connection.commit()


def descriptor_map(connection: sqlite3.Connection) -> dict[str, str]:
    rows = connection.execute("SELECT raw_text, display_name FROM descriptors").fetchall()
    return {str(row["raw_text"]): str(row["display_name"]) for row in rows}


def add_charge(
    connection: sqlite3.Connection,
    *,
    shop_raw: str,
    amount: float,
    currency: str,
    charge_date: str,
) -> bool:
    digest = row_hash(charge_date, shop_raw, amount, currency)
    cursor = connection.execute(
        "INSERT OR IGNORE INTO charges (row_hash, shop_raw, amount, currency, charge_date) VALUES (?, ?, ?, ?, ?)",
        (digest, shop_raw, amount, currency, charge_date),
    )
    connection.commit()
    return cursor.rowcount == 1


def list_charges(connection: sqlite3.Connection) -> list[dict[str, object]]:
    rows = connection.execute(
        "SELECT row_hash, shop_raw, amount, currency, charge_date FROM charges ORDER BY charge_date, shop_raw"
    ).fetchall()
    return [dict(row) for row in rows]


def add_email(
    connection: sqlite3.Connection,
    *,
    shop_raw: str,
    charge_date: str,
    amount: float | None,
    currency: str,
    subject: str,
    kind: str,
) -> bool:
    token = f"{shop_raw}|{charge_date}|{amount}|{currency}|{subject}|{kind}"
    digest = hashlib.sha256(token.encode()).hexdigest()
    cursor = connection.execute(
        "INSERT OR IGNORE INTO emails (row_hash, shop_raw, charge_date, amount, currency, subject, kind) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (digest, shop_raw, charge_date, amount, currency, subject, kind),
    )
    connection.commit()
    return cursor.rowcount == 1


def list_emails(connection: sqlite3.Connection) -> list[dict[str, object]]:
    rows = connection.execute(
        "SELECT row_hash, shop_raw, charge_date, amount, currency, subject, kind FROM emails ORDER BY charge_date"
    ).fetchall()
    return [dict(row) for row in rows]


def replace_subscriptions(connection: sqlite3.Connection, subscriptions: list[dict[str, object]]) -> None:
    connection.execute("DELETE FROM subscriptions")
    for item in subscriptions:
        connection.execute(
            "INSERT INTO subscriptions (id, body) VALUES (?, ?)",
            (str(item["id"]), json.dumps(item)),
        )
    connection.commit()


def list_subscriptions(connection: sqlite3.Connection) -> list[dict[str, object]]:
    rows = connection.execute("SELECT body FROM subscriptions ORDER BY id").fetchall()
    return [json.loads(str(row["body"])) for row in rows]


def get_subscription(connection: sqlite3.Connection, subscription_id: str) -> dict[str, object] | None:
    row = connection.execute("SELECT body FROM subscriptions WHERE id = ?", (subscription_id,)).fetchone()
    if row is None:
        return None
    return json.loads(str(row["body"]))
