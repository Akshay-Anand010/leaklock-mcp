"""Turn bank text into a shop name a person would say."""

from __future__ import annotations

import re

# Short bank labels we already know. A saved pair in the store wins over this list.
BUILTIN: dict[str, str] = {
    "AMZN": "Amazon",
    "AMZN MKTP": "Amazon",
    "AMZN MKTP US": "Amazon",
    "AMAZON": "Amazon",
    "AMAZON PRIME": "Amazon",
    "AMAZON.IN": "Amazon",
    "NETFLIX": "Netflix",
    "NETFLIX.COM": "Netflix",
    "SPOTIFY": "Spotify",
    "SPOTIFY USA": "Spotify",
    "HULU": "Hulu",
    "JIO": "Jio",
    "RELIANCE JIO": "Jio",
    "AIRTEL": "Airtel",
    "BHARTI AIRTEL": "Airtel",
    "VI": "Vi",
    "VODAFONE": "Vi",
    "HOTSTAR": "Hotstar",
    "DISNEY HOTSTAR": "Hotstar",
    "YOUTUBE": "YouTube",
    "YOUTUBE PREMIUM": "YouTube",
    "APPLE": "Apple",
    "APPLE.COM/BILL": "Apple",
    "GOOGLE ONE": "Google One",
    "CULT.FIT": "Cult.fit",
    "CULTFIT": "Cult.fit",
}


def display_name(raw_text: str, saved: dict[str, str] | None = None) -> str:
    cleaned = re.sub(r"\s+", " ", raw_text).strip()
    pairs = saved or {}
    folded = cleaned.upper()
    for raw, name in pairs.items():
        if raw.strip().upper() == folded:
            return name.strip()
    if folded in BUILTIN:
        return BUILTIN[folded]
    # Bank narrations look like UPI/NETFLIX or PHONEPE/AIRTEL. Match the bill inside them.
    for key, name in sorted(BUILTIN.items(), key=lambda item: len(item[0]), reverse=True):
        if re.search(rf"(?<![A-Z]){re.escape(key)}(?![A-Z])", folded):
            return name
    return cleaned
