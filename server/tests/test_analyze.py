from leaklock.analyze import analyze_leakage_and_hikes
from leaklock.ingest import ingest_statement
from leaklock.store import add_email, connect


def test_price_rise_uses_rupees_and_the_same_cycle(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "bills.csv").write_text(
        "\n".join(
            [
                "date,shop,amount,currency",
                "2026-05-05,NETFLIX,149,INR",
                "2026-06-05,NETFLIX,179,INR",
                "2026-05-05,SPOTIFY,10,USD",
                "2026-06-05,SPOTIFY,12,USD",
            ]
        ),
        encoding="utf-8",
    )
    ingest_statement("bills.csv")
    findings = analyze_leakage_and_hikes()
    rises = [item for item in findings if item["kind"] == "price_rise"]
    assert len(rises) == 2
    netflix = next(item for item in rises if "Netflix" in item["reason"])
    assert "149.00" in netflix["reason"] and "179.00" in netflix["reason"] and "INR" in netflix["reason"]
    assert any(item["kind"] == "bank_only" and "still valid" in item["reason"] for item in findings)


def test_one_charge_stays_a_candidate(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "once.csv").write_text("date,shop,amount,currency\n2026-06-05,HOTSTAR,299,INR\n", encoding="utf-8")
    ingest_statement("once.csv")
    findings = analyze_leakage_and_hikes()
    assert len(findings) == 1
    assert findings[0]["kind"] == "bank_only"
    assert "candidate" in findings[0]["reason"]


def test_email_without_a_bank_charge_is_check_email_only(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    connection = connect()
    try:
        add_email(
            connection,
            shop_raw="Jio",
            charge_date="2026-06-01",
            amount=299,
            currency="INR",
            subject="Your Jio invoice",
            kind="billing",
        )
    finally:
        connection.close()
    findings = analyze_leakage_and_hikes()
    assert findings[0]["kind"] == "check_email_only"
    assert "Jio" in findings[0]["reason"]


def test_bank_and_email_agree(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "one.csv").write_text("date,shop,amount,currency\n2026-06-05,NETFLIX,149,INR\n", encoding="utf-8")
    ingest_statement("one.csv")
    connection = connect()
    try:
        add_email(
            connection,
            shop_raw="Netflix",
            charge_date="2026-06-06",
            amount=149,
            currency="INR",
            subject="Your Netflix invoice",
            kind="billing",
        )
    finally:
        connection.close()
    findings = analyze_leakage_and_hikes()
    assert any(item["kind"] == "recurring" and "active" in item["reason"] for item in findings)
    assert not any(item["kind"] == "bank_only" for item in findings)
