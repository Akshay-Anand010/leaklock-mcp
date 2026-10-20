# Subconscious server

Where the tools are: `server/leaklock/server.py` defines the four tools and three resources with FastMCP. From this folder the same file is `leaklock/server.py`.

The tools are `ingest_financial_statement`, `sync_billing_communications`, `analyze_leakage_and_hikes`, and `generate_advocacy_action`. The resources are `leaklock://descriptors`, `leaklock://ledger/subscriptions`, and `leaklock://ledger/subscriptions/{id}`.

`ingest_financial_statement` reads a local csv, xlsx, or qfx/ofx file and returns a summary: file name, rows kept, rows skipped, merchant names, earliest date, and latest date. For hdfc, icici, sbi, axis, and kotak, a date is day/month/year, so 05/06/2026 is 5 June 2026. Amounts default to rupees. Person-to-person UPI is dropped. A UPI payment to a known bill, such as Netflix or Airtel, is kept.

The other tools read a local mail folder or secret file, group subscriptions, and write a letter on this computer. Nothing is emailed. The resources read the local SQLite file.

Run the tests with `python -m pytest` in this folder. Start the server with `python -m leaklock.server`.
