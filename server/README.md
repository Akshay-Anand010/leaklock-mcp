# Subconscious server

Where the tools are: `server/leaklock/server.py` defines the four tools and three resources with FastMCP. From this folder the same file is `leaklock/server.py`.

The tools are `ingest_financial_statement`, `sync_billing_communications`, `analyze_leakage_and_hikes`, and `generate_advocacy_action`. The resources are `leaklock://descriptors`, `leaklock://ledger/subscriptions`, and `leaklock://ledger/subscriptions/{id}`.

`ingest_financial_statement` reads a local CSV and returns a summary: file name, rows kept, rows skipped, merchant names, earliest date, and latest date. It drops balances, incoming credits, peer transfers, and groceries, and it strips account numbers and long card numbers. xlsx and qfx are not built yet. The other three tools answer that their step is not built yet. The resources are empty until a store exists.

Run the tests with `python -m pytest` in this folder. Start the server with `python -m leaklock.server`.
