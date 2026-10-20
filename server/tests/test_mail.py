from datetime import date, timedelta

import pytest

from leaklock.mail import sync_billing_communications
from leaklock.store import connect, list_emails


def _eml(subject: str, body: str, sender: str = "Netflix <billing@netflix.com>") -> str:
    when = (date.today() - timedelta(days=2)).strftime("%d %b %Y 10:00 +0000")
    return f"From: {sender}\nSubject: {subject}\nDate: {when}\n\n{body}\n"


def test_local_eml_folder_keeps_bills_and_not_the_body(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    folder = tmp_path / "mail"
    folder.mkdir()
    (folder / "bill.eml").write_text(_eml("Your Netflix invoice", "Amount due ₹149. SECRET-BODY-DO-NOT-STORE"), encoding="utf-8")
    (folder / "trial.eml").write_text(_eml("Your Hotstar trial ends soon", "The trial ends next week."), encoding="utf-8")
    (folder / "hike.eml").write_text(
        _eml("We are raising your price", "The new price is ₹179.", "Spotify <billing@spotify.com>"),
        encoding="utf-8",
    )
    (folder / "chat.eml").write_text(_eml("Weekend plans", "Let's meet for coffee."), encoding="utf-8")
    (tmp_path / "leaklock.secrets.json").write_text('{"eml_dir": "mail"}', encoding="utf-8")
    summary = sync_billing_communications("imap", 30)
    assert summary["messages_scanned"] == 4
    assert summary["billing_messages_kept"] == 3
    connection = connect()
    try:
        rows = list_emails(connection)
    finally:
        connection.close()
    assert len(rows) == 3
    assert "SECRET-BODY-DO-NOT-STORE" not in (tmp_path / "leaklock.db").read_text(encoding="utf-8", errors="replace")


def test_missing_secret_file_is_a_clear_error(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    with pytest.raises(ValueError, match="secret file"):
        sync_billing_communications("gmail", 7)
