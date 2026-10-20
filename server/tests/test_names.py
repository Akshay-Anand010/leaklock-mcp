from leaklock.names import display_name
from leaklock.store import connect, save_descriptor


def test_builtin_indian_bills():
    assert display_name("UPI/NETFLIX") == "Netflix"
    assert display_name("RELIANCE JIO") == "Jio"
    assert display_name("BHARTI AIRTEL") == "Airtel"
    assert display_name("VI") == "Vi"
    assert display_name("DISNEY HOTSTAR") == "Hotstar"
    assert display_name("YOUTUBE PREMIUM") == "YouTube"
    assert display_name("GOOGLE ONE") == "Google One"
    assert display_name("CULT.FIT") == "Cult.fit"
    assert display_name("AMZN MKTP") == "Amazon"


def test_saved_pair_wins(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    connection = connect()
    try:
        save_descriptor(connection, "AMZN", "Amazon India")
        saved = {"AMZN": "Amazon India"}
    finally:
        connection.close()
    assert display_name("AMZN", saved) == "Amazon India"
