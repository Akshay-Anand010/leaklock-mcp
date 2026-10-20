"""The four Subconscious tools and three resources."""

from typing import Literal

from mcp.server.fastmcp import FastMCP

from leaklock.ingest import ingest_csv

mcp = FastMCP("Subconscious")


@mcp.tool()
def ingest_financial_statement(file_path: str, bank_template_hint: str | None = None) -> dict[str, object]:
    """Read one local CSV statement. The summary has no balances and no account numbers."""
    return ingest_csv(file_path, bank_template_hint)


@mcp.tool()
def sync_billing_communications(provider: Literal["gmail", "imap"], days_back: int) -> str:
    """Look through recent billing mail. This tool takes no auth token."""
    del provider, days_back
    return "sync_billing_communications is not built yet."


@mcp.tool()
def analyze_leakage_and_hikes() -> str:
    """List subscription leaks and price rises."""
    return "analyze_leakage_and_hikes is not built yet."


@mcp.tool()
def generate_advocacy_action(merchant_name: str, action_type: Literal["cancel", "dispute_hike"]) -> str:
    """Describe a cancel or dispute letter. Nothing is written yet."""
    del merchant_name, action_type
    return "generate_advocacy_action is not built yet."


@mcp.resource("leaklock://descriptors", mime_type="application/json")
def descriptors() -> str:
    """Shop-name pairs. Empty until a store exists."""
    return "[]"


@mcp.resource("leaklock://ledger/subscriptions", mime_type="application/json")
def subscriptions() -> str:
    """Every subscription. Empty until a store exists."""
    return "[]"


@mcp.resource("leaklock://ledger/subscriptions/{id}", mime_type="application/json")
def subscription(id: str) -> str:
    """One subscription. An unknown id is an empty body, not a made-up shop."""
    del id
    return ""


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
