#!/usr/bin/env python3
"""High-signal quality checks for the generated 52Poké card index."""

import json
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


path = Path(__file__).resolve().parents[1] / "data" / "cards.json"
payload = json.loads(path.read_text(encoding="utf-8"))
cards = payload["cards"]

ids = [card.get("i") for card in cards]
sources = [card.get("u", "") for card in cards]
names = [card.get("n", "").strip() for card in cards]

checks = {
    "metadata_count_matches": payload.get("count") == len(cards),
    "unique_page_ids": len(ids) == len(set(ids)) and None not in ids,
    "unique_source_urls": len(sources) == len(set(sources)),
    "all_names_present": all(names),
    "all_sources_https_52poke": all(
        urlparse(source).scheme == "https" and urlparse(source).netloc == "wiki.52poke.com"
        for source in sources
    ),
    "expected_kinds_present": {"宝可梦", "训练家", "能量"}.issubset({card.get("k") for card in cards}),
    "sample_pikachu_present": any("皮卡丘" in name for name in names),
    "sample_charizard_present": any("喷火龙" in name for name in names),
    "sample_trainer_present": any(card.get("k") == "训练家" and card.get("n") for card in cards),
    "sample_energy_present": any(card.get("k") == "能量" and card.get("n") for card in cards),
}

kind_counts = Counter(card.get("k", "") for card in cards)
missing = {
    field: sum(not card.get(short) for card in cards)
    for field, short in {
        "set": "s", "number": "no", "rarity": "r", "artist": "a",
        "type": "t", "release_date": "d",
    }.items()
}
artists = {artist for card in cards for artist in card.get("as", []) if artist}
rarities = {rarity for card in cards for rarity in card.get("rs", []) if rarity}
cn_cards = sum("简中" in card.get("ls", []) for card in cards)

print(f"rows={len(cards):,}")
print("kinds=" + ", ".join(f"{key}:{value:,}" for key, value in kind_counts.most_common()))
print(f"simplified_chinese_cards={cn_cards:,}")
print(f"distinct_artists={len(artists):,}")
print(f"distinct_rarities={len(rarities):,}")
for field, count in missing.items():
    print(f"missing_{field}={count:,} ({count / len(cards):.1%})")
for name, passed in checks.items():
    print(f"check_{name}={'PASS' if passed else 'FAIL'}")

if not all(checks.values()):
    raise SystemExit(1)
