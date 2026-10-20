import pytest
from openpyxl import Workbook

from leaklock.ingest import ingest_statement
from leaklock.server import mcp
from leaklock.store import connect, list_charges


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
    summary = ingest_statement("march.csv")
    assert summary["file_name"] == "march.csv"
    assert summary["rows_kept"] == 3
    assert summary["rows_skipped"] == 3
    assert summary["merchant_names"] == ["Netflix", "Spotify", "Hulu"]
    assert summary["earliest_date"] == "2026-01-15"
    assert summary["latest_date"] == "2026-03-06"
    assert "111111111111" not in str(summary)
    assert "balance" not in summary
    assert "account" not in summary


def test_reimport_does_not_duplicate_a_row(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "one.csv").write_text("date,shop,amount,currency\n2026-06-05,NETFLIX,149,INR\n", encoding="utf-8")
    ingest_statement("one.csv")
    ingest_statement("one.csv")
    connection = connect()
    try:
        assert len(list_charges(connection)) == 1
    finally:
        connection.close()


def test_rejects_a_path_outside_the_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValueError, match="working directory"):
        ingest_statement("../secret.csv")


def test_xlsx_and_qfx_keep_a_bill_and_drop_the_rest(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    book = Workbook()
    sheet = book.active
    sheet.append(["date", "shop", "amount", "currency", "direction"])
    sheet.append(["2026-06-05", "NETFLIX", 149, "INR", "out"])
    sheet.append(["2026-06-06", "TRADER JOE'S", 80, "INR", "out"])
    book.save(tmp_path / "book.xlsx")
    book.close()
    (tmp_path / "export.qfx").write_text(
        "\n".join(
            [
                "<OFX><CURDEF>INR",
                "<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260605<TRNAMT>-149.00<NAME>NETFLIX</STMTTRN>",
                "<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260606<TRNAMT>50000.00<NAME>PAYROLL</STMTTRN>",
                "</OFX>",
            ]
        ),
        encoding="utf-8",
    )
    xlsx = ingest_statement("book.xlsx")
    qfx = ingest_statement("export.qfx")
    assert xlsx["merchant_names"] == ["Netflix"]
    assert xlsx["rows_kept"] == 1
    assert xlsx["rows_skipped"] == 1
    assert qfx["merchant_names"] == ["Netflix"]
    assert qfx["rows_skipped"] == 1


def test_registered_tool_names():
    names = sorted(tool.name for tool in mcp._tool_manager.list_tools())
    assert names == [
        "analyze_leakage_and_hikes",
        "generate_advocacy_action",
        "ingest_financial_statement",
        "sync_billing_communications",
    ]


def test_indian_bank_dates_are_day_month_year(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "hdfc.csv").write_text(
        "\n".join(
            [
                "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance",
                "05/06/2026,UPI/NETFLIX,1,05/06/2026,149.00,,10000",
                "06/05/2026,UPI-AIRTEL,2,06/05/2026,Rs 399,,9601",
                "05/06/2026,UPI/RAHUL SHARMA,3,05/06/2026,500.00,,9101",
                "05/06/2026,NEFT to SURESH,4,05/06/2026,2000.00,,7101",
                "05/06/2026,IMPS AIRTEL,5,05/06/2026,₹199,,6902",
            ]
        ),
        encoding="utf-8",
    )
    summary = ingest_statement("hdfc.csv", "hdfc")
    assert summary["merchant_names"] == ["Netflix", "Airtel"]
    assert summary["rows_kept"] == 3
    assert summary["rows_skipped"] == 2
    assert summary["earliest_date"] == "2026-05-06"
    assert summary["latest_date"] == "2026-06-05"
    assert "₹" not in str(summary["merchant_names"])
