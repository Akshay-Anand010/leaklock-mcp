"""The four Subconscious tools and three resources."""

import json
from typing import Literal

from mcp.server.fastmcp import FastMCP

from leaklock.analyze import analyze_leakage_and_hikes as find_leaks
from leaklock.ingest import ingest_statement
from leaklock.letters import generate_advocacy_action as write_letter
from leaklock.mail import sync_billing_communications as sync_mail
from leaklock.store import connect, descriptor_map, get_subscription, list_subscriptions

mcp = FastMCP("Subconscious")


@mcp.tool()
def ingest_financial_statement(file_path: str, bank_template_hint: str | None = None) -> dict[str, object]:
    """Read one local statement. The summary has no balances and no account numbers."""
    return ingest_statement(file_path, bank_template_hint)


@mcp.tool()
def sync_billing_communications(provider: Literal["gmail", "imap"], days_back: int) -> dict[str, object]:
    """Read billing mail. Secrets come from a local file, not from these arguments."""
    return sync_mail(provider, days_back)


@mcp.tool()
def analyze_leakage_and_hikes() -> dict[str, object]:
    """Group charges and mail into subscriptions, gaps, and price rises."""
    return {"findings": find_leaks()}


@mcp.tool()
def generate_advocacy_action(
    merchant_name: str, action_type: Literal["cancel", "dispute_hike"]
) -> dict[str, object]:
    """Write a markdown letter on disk. Nothing is emailed."""
    return write_letter(merchant_name, action_type)


@mcp.resource("leaklock://descriptors", mime_type="application/json")
def descriptors() -> str:
    """Shop-name pairs from the local store."""
    connection = connect()
    try:
        pairs = [{"raw_text": raw, "display_name": name} for raw, name in sorted(descriptor_map(connection).items())]
    finally:
        connection.close()
    return json.dumps(pairs)


@mcp.resource("leaklock://ledger/subscriptions", mime_type="application/json")
def subscriptions() -> str:
    """Every subscription in the local store."""
    connection = connect()
    try:
        rows = list_subscriptions(connection)
    finally:
        connection.close()
    return json.dumps(rows)


@mcp.resource("leaklock://ledger/subscriptions/{id}", mime_type="application/json")
def subscription(id: str) -> str:
    """One subscription. An unknown id is an empty body, not a made-up shop."""
    connection = connect()
    try:
        found = get_subscription(connection, id)
    finally:
        connection.close()
    if found is None:
        return ""
    return json.dumps(found)


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
