import pytest

from leaklock.ingest import ingest_csv
from leaklock.server import (
    analyze_leakage_and_hikes,
    descriptors,
    generate_advocacy_action,
    mcp,
    subscription,
    subscriptions,
    sync_billing_communications,
)


def test_csv_summary_keeps_shops_and_drops_the_rest(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    statement = tmp_path / "march.csv"
    statement.write_text(
        "\n".join(
            [
                "date,shop,amount,currency,direction,balance,account",
                "2026-03-01,NETFLIX.COM,15.99,USD,out,2400.00,111122223333",
                "2026-03-02,Ending balance,2400.00,USD,out,2400.00,",
                "2026-03-03,VENMO PAYMENT JANE,40.00,USD,out,,",
                "2026-03-04,TRADER JOE'S,62.40,USD,out,,",
                "2026-03-06,SPOTIFY acct 111111111111,11.99,USD,,,",
                "2026-01-15,HULU,7.99,USD,out,,",
            ]
        ),
        encoding="utf-8",
    )
    summary = ingest_csv("march.csv")
    assert summary["file_name"] == "march.csv"
    assert summary["rows_kept"] == 3
    assert summary["rows_skipped"] == 3
    assert summary["merchant_names"] == ["NETFLIX.COM", "SPOTIFY", "HULU"]
    assert summary["earliest_date"] == "2026-01-15"
    assert summary["latest_date"] == "2026-03-06"
    assert "111111111111" not in str(summary)
    assert "balance" not in summary
    assert "account" not in summary


def test_rejects_a_path_outside_the_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValueError, match="working directory"):
        ingest_csv("../secret.csv")


def test_xlsx_and_qfx_are_not_parsed(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "book.xlsx").write_bytes(b"not a workbook")
    (tmp_path / "export.qfx").write_text("OFX", encoding="utf-8")
    with pytest.raises(ValueError, match="not built yet"):
        ingest_csv("book.xlsx")
    with pytest.raises(ValueError, match="not built yet"):
        ingest_csv("export.qfx")


def test_registered_names_and_empty_resources():
    names = sorted(tool.name for tool in mcp._tool_manager.list_tools())
    assert names == [
        "analyze_leakage_and_hikes",
        "generate_advocacy_action",
        "ingest_financial_statement",
        "sync_billing_communications",
    ]
    uris = {str(resource.uri) for resource in mcp._resource_manager.list_resources()}
    templates = {template.uri_template for template in mcp._resource_manager.list_templates()}
    assert uris == {"leaklock://descriptors", "leaklock://ledger/subscriptions"}
    assert "leaklock://ledger/subscriptions/{id}" in templates
    assert sync_billing_communications("gmail", 30) == "sync_billing_communications is not built yet."
    assert analyze_leakage_and_hikes() == "analyze_leakage_and_hikes is not built yet."
    assert generate_advocacy_action("Netflix", "cancel") == "generate_advocacy_action is not built yet."
    assert descriptors() == "[]"
    assert subscriptions() == "[]"
    assert subscription("sub-1") == ""
