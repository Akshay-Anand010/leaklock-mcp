import json

from leaklock.analyze import analyze_leakage_and_hikes
from leaklock.ingest import ingest_statement
from leaklock.letters import generate_advocacy_action
from leaklock.server import descriptors, subscription, subscriptions
from leaklock.store import connect, remember_account, save_descriptor


def test_letter_uses_rupees_and_hides_the_account_number(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    (tmp_path / "bills.csv").write_text(
        "date,shop,amount,currency,account\n2026-06-05,NETFLIX,149,INR,111122223333\n",
        encoding="utf-8",
    )
    ingest_statement("bills.csv")
    analyze_leakage_and_hikes()
    result = generate_advocacy_action("Netflix", "cancel")
    preview = result["preview"]
    assert preview["shop"] == "Netflix"
    assert preview["amount"] == 149
    assert preview["dates"] == ["2026-06-05"]
    dumped = json.dumps(result)
    assert "111122223333" not in dumped
    letter = open(result["file_path"], encoding="utf-8").read()
    assert "₹149.00" in letter
    assert "111122223333" in letter
    assert "has not been emailed" in letter


def test_letter_without_a_stored_account_omits_it(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    result = generate_advocacy_action("Airtel", "dispute_hike")
    letter = open(result["file_path"], encoding="utf-8").read()
    assert "₹" in letter
    assert "Account:" not in letter
    assert "account" not in json.dumps(result).lower()


def test_resources_read_the_store(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert descriptors() == "[]"
    assert subscriptions() == "[]"
    assert subscription("missing") == ""
    connection = connect()
    try:
        save_descriptor(connection, "JIO", "Jio")
        remember_account(connection, "999988887777")
    finally:
        connection.close()
    (tmp_path / "bills.csv").write_text("date,shop,amount,currency\n2026-06-05,JIO,299,INR\n", encoding="utf-8")
    ingest_statement("bills.csv")
    analyze_leakage_and_hikes()
    body = subscriptions()
    assert "Jio" in body
    assert "999988887777" not in body
    found = json.loads(body)[0]
    assert subscription(found["id"]) != ""
    assert subscription("missing") == ""
