#!/usr/bin/env python3
"""Refetch only cards whose compact index is missing release metadata."""

import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from import_52poke import api, compact, parse_card


root = Path(__file__).resolve().parents[1]
path = root / "data" / "cards.json"
payload = json.loads(path.read_text(encoding="utf-8"))
cards = payload["cards"]
missing = [card["i"] for card in cards if not card.get("s")]
batches = [missing[index:index + 50] for index in range(0, len(missing), 50)]


def fetch(batch):
    response = api({
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "pageids": "|".join(str(pageid) for pageid in batch),
    })
    result = {}
    for page in response["query"]["pages"]:
        revisions = page.get("revisions") or []
        if not revisions:
            continue
        text = revisions[0].get("slots", {}).get("main", {}).get("content", "")
        if text:
            result[int(page["pageid"])] = compact(parse_card(int(page["pageid"]), page["title"], text))
    return result


updates = {}
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(fetch, batch) for batch in batches]
    for index, future in enumerate(as_completed(futures), 1):
        updates.update(future.result())
        if index % 10 == 0 or index == len(futures):
            print(f"Fetched {index}/{len(futures)} missing-field batches", flush=True)

payload["cards"] = [updates.get(card["i"], card) for card in cards]
payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
payload["count"] = len(payload["cards"])
path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Updated {len(updates):,} cards; {path.stat().st_size / 1024 / 1024:.2f} MiB")
