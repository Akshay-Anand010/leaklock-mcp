# Subconscious server

This folder holds the data shapes for Subconscious, the LeakLock helper. A charge is one money line after a statement is imported. A subscription is a repeating payment built from those lines and from billing mail. A descriptor is the raw bank text next to a shop name a person can read.

The JSON schemas describe the same shapes for four tools and three resources. The tools are ingest_financial_statement, sync_billing_communications, analyze_leakage_and_hikes, and generate_advocacy_action. The resources are leaklock://descriptors, leaklock://ledger/subscriptions, and leaklock://ledger/subscriptions/{id}.

The privacy filter looks at one raw statement line. It keeps a normal outgoing shop charge and returns the shop text, the amount, the currency, and the date. It drops balance lines, incoming credits, peer-to-peer transfers, and grocery charges. Account numbers and long card numbers are removed from the shop text before that text can come back. The charge has no balance field and no account number field.

The filter does not read a bank file, talk to email, store rows, write a letter, or start an MCP server. Those later steps are still unbuilt.

Check the shapes with `npx tsc --noEmit` in this folder. Run the filter tests with `node --experimental-strip-types --test src/privacy.test.ts`.
