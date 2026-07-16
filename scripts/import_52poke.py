#!/usr/bin/env python3
"""Build a compact, attributed PTCG card index from the public 52Poké MediaWiki API."""

from __future__ import annotations

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


API = "https://wiki.52poke.com/api.php"
WIKI = "https://wiki.52poke.com/wiki/"
USER_AGENT = "PTCG-CN-Market/1.0 (https://github.com/Adai0622/ptcg-cn-card-market)"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "cards.json"
HEADER_PREFIXES = ("卡牌信息/header", "训练家卡信息/header", "能量卡信息/header")


def api(params: dict[str, str], attempts: int = 8) -> dict:
    query = {"format": "json", "formatversion": "2", "maxlag": "5", **params}
    url = f"{API}?{urlencode(query)}"
    for attempt in range(attempts):
        try:
            request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urlopen(request, timeout=90) as response:
                payload = json.load(response)
            if "error" in payload:
                raise RuntimeError(payload["error"])
            return payload
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(min(8, 1.5 * (attempt + 1)))
    raise RuntimeError("unreachable")


def list_header_templates() -> list[str]:
    result: list[str] = []
    for prefix in HEADER_PREFIXES:
        payload = api({
            "action": "query",
            "list": "allpages",
            "apnamespace": "10",
            "apprefix": prefix,
            "aplimit": "max",
        })
        result.extend(page["title"] for page in payload["query"]["allpages"])
    return sorted(set(result))


def list_card_pages(templates: list[str]) -> dict[int, str]:
    pages: dict[int, str] = {}
    for index, template in enumerate(templates, 1):
        continuation = None
        while True:
            params = {
                "action": "query",
                "list": "embeddedin",
                "eititle": template,
                "einamespace": "0",
                "eilimit": "max",
            }
            if continuation:
                params["eicontinue"] = continuation
            payload = api(params)
            for page in payload["query"]["embeddedin"]:
                pages[int(page["pageid"])] = page["title"]
            continuation = payload.get("continue", {}).get("eicontinue")
            if not continuation:
                break
        print(f"[{index:02d}/{len(templates)}] {template}: indexed {len(pages):,} unique pages", flush=True)
        time.sleep(0.08)
    return pages


def iter_templates(text: str, prefix: str):
    marker = "{{" + prefix
    cursor = 0
    while True:
        start = text.find(marker, cursor)
        if start < 0:
            return
        depth = 1
        index = start + 2
        while index < len(text) - 1 and depth:
            pair = text[index:index + 2]
            if pair == "{{":
                depth += 1
                index += 2
            elif pair == "}}":
                depth -= 1
                index += 2
            else:
                index += 1
        if depth == 0:
            yield text[start + 2:index - 2]
            cursor = index
        else:
            return


def split_template(value: str) -> list[str]:
    parts: list[str] = []
    start = 0
    curly = square = 0
    index = 0
    while index < len(value):
        pair = value[index:index + 2]
        if pair == "{{":
            curly += 1
            index += 2
            continue
        if pair == "}}" and curly:
            curly -= 1
            index += 2
            continue
        if pair == "[[":
            square += 1
            index += 2
            continue
        if pair == "]]" and square:
            square -= 1
            index += 2
            continue
        if value[index] == "|" and curly == 0 and square == 0:
            parts.append(value[start:index])
            start = index + 1
        index += 1
    parts.append(value[start:])
    return parts


def params_from_template(template: str) -> tuple[str, dict[str, str]]:
    parts = split_template(template)
    name = parts[0].strip()
    params: dict[str, str] = {}
    positional = 0
    for part in parts[1:]:
        if "=" in part:
            key, value = part.split("=", 1)
            params[key.strip()] = clean(value)
        else:
            positional += 1
            params[str(positional)] = clean(part)
    return name, params


def clean(value: str) -> str:
    value = re.sub(r"<!--.*?-->", "", value, flags=re.S)
    value = re.sub(r"<br\s*/?>", " ", value, flags=re.I)
    value = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", value)
    value = re.sub(r"\[\[([^\]]+)\]\]", r"\1", value)
    value = re.sub(r"\{\{tt\|([^|{}]+).*?\}\}", r"\1", value)
    value = re.sub(r"\{\{[^{}]*\}\}", "", value)
    value = re.sub(r"'{2,}", "", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def unique(values):
    result = []
    seen = set()
    for value in values:
        value = clean(str(value))
        if value and value not in seen and value.lower() not in {"n", "—", "-"}:
            result.append(value)
            seen.add(value)
    return result


def english_name(text: str) -> str:
    for template in iter_templates(text, "N"):
        _, params = params_from_template(template)
        positional = [params.get(str(index), "") for index in range(1, 8)]
        values = [value for value in positional if value]
        if values:
            return values[-1]
    return ""


def parse_prints(text: str) -> list[dict[str, str]]:
    prints: list[dict[str, str]] = []
    for template in iter_templates(text, "ExpansionList/main"):
        template_name, params = params_from_template(template)
        artist = params.get("illus", "") or params.get("illus2", "")
        for prefix, language in (("cn", "简中"), ("zh", "繁中"), ("ja", "日文"), ("en", "英文")):
            record = {
                "language": language,
                "set": params.get(prefix + "expansion", ""),
                "setCode": params.get(prefix + "icon", ""),
                "series": params.get(prefix + "series", ""),
                "number": params.get(prefix + "no", ""),
                "rarity": params.get(prefix + "rar", ""),
                "date": params.get(prefix + "time", ""),
                "artist": artist,
            }
            if any(record[key] for key in ("set", "setCode", "number", "rarity")):
                prints.append(record)
        if any(params.get(key, "") for key in ("expansion", "icon", "no", "rar")):
            record = {
                "language": params.get("word", "PTCG Pocket" if template_name.endswith("/Pocket") else "其他"),
                "set": params.get("expansion", ""),
                "setCode": params.get("icon", ""),
                "series": params.get("series", ""),
                "number": params.get("no", ""),
                "rarity": params.get("rar", ""),
                "date": params.get("time", ""),
                "artist": artist,
            }
            if any(record[key] for key in ("set", "setCode", "number", "rarity")):
                prints.append(record)
    return prints


def preferred_print(prints: list[dict[str, str]], title: str) -> dict[str, str]:
    match = re.search(r"（([^（）]+)）$", title)
    title_code = match.group(1).lower() if match else ""
    priorities = {"简中": 0, "繁中": 1, "日文": 2, "英文": 3}
    return min(
        prints,
        key=lambda item: (
            0 if title_code and item.get("setCode", "").lower() == title_code else 1,
            priorities.get(item.get("language", ""), 4),
        ),
        default={},
    )


def parse_card(pageid: int, title: str, text: str) -> dict:
    header_name = ""
    header: dict[str, str] = {}
    kind = "其他"
    for prefix, label in (("卡牌信息/header", "宝可梦"), ("训练家卡信息/header", "训练家"), ("能量卡信息/header", "能量")):
        template = next(iter_templates(text, prefix), None)
        if template:
            header_name, header = params_from_template(template)
            kind = label
            break

    prints = parse_prints(text)
    primary = preferred_print(prints, title)
    fallback_name = re.sub(r"（[^（）]+）$", "", title)
    name = header.get("name", "") or fallback_name
    subtype = header.get("type2", "") or header.get("type", "") or header.get("evostage", "")

    return {
        "id": pageid,
        "name": clean(name),
        "nameEn": english_name(text),
        "title": title,
        "kind": kind,
        "subtype": clean(subtype),
        "type": clean(header.get("type", "")),
        "hp": clean(header.get("hp", "")),
        "stage": clean(header.get("evostage", "")),
        "set": clean(primary.get("set", "")),
        "setCode": clean(primary.get("setCode", "")),
        "series": clean(primary.get("series", "")),
        "number": clean(primary.get("number", "")),
        "rarity": clean(primary.get("rarity", "")),
        "artist": clean(primary.get("artist", "")),
        "language": clean(primary.get("language", "")),
        "releaseDate": clean(primary.get("date", "")),
        "sets": unique(item.get("set", "") for item in prints),
        "setCodes": unique(item.get("setCode", "") for item in prints),
        "numbers": unique(item.get("number", "") for item in prints),
        "rarities": unique(item.get("rarity", "") for item in prints),
        "artists": unique(item.get("artist", "") for item in prints),
        "languages": unique(item.get("language", "") for item in prints),
        "printCount": len(prints),
        "source": WIKI + quote(title.replace(" ", "_"), safe="()_"),
    }


def compact(card: dict) -> dict:
    keys = {
        "id": "i", "name": "n", "nameEn": "e", "title": "w", "kind": "k",
        "subtype": "st", "type": "t", "hp": "h", "stage": "g", "set": "s",
        "setCode": "sc", "series": "se", "number": "no", "rarity": "r",
        "artist": "a", "language": "l", "releaseDate": "d", "sets": "ss",
        "setCodes": "scs", "numbers": "nos", "rarities": "rs", "artists": "as",
        "languages": "ls", "printCount": "pc", "source": "u",
    }
    return {short: card[key] for key, short in keys.items() if card.get(key) not in ("", [], 0, None)}


def main() -> int:
    templates = list_header_templates()
    pages = list_card_pages(templates)
    pageids = sorted(pages)
    batch_size = 50
    batches = [pageids[start:start + batch_size] for start in range(0, len(pageids), batch_size)]

    def fetch_batch(batch: list[int]) -> list[dict]:
        payload = api({
            "action": "query",
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "pageids": "|".join(str(pageid) for pageid in batch),
        })
        parsed: list[dict] = []
        for page in payload["query"]["pages"]:
            revisions = page.get("revisions") or []
            if not revisions:
                continue
            text = revisions[0].get("slots", {}).get("main", {}).get("content", "")
            if text:
                parsed.append(compact(parse_card(int(page["pageid"]), page["title"], text)))
        return parsed

    cards: list[dict] = []
    completed = 0
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_batch, batch) for batch in batches]
        for future in as_completed(futures):
            cards.extend(future.result())
            completed += 1
            if completed % 10 == 0 or completed == len(batches):
                print(f"Fetched {completed}/{len(batches)} batches · parsed {len(cards):,} cards", flush=True)

    cards.sort(key=lambda card: (card.get("n", ""), card.get("sc", ""), card.get("no", "")))
    payload = {
        "source": "52Poké Wiki / 神奇宝贝百科",
        "sourceUrl": "https://wiki.52poke.com/",
        "license": "CC BY-NC-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh-hans",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(cards),
        "cards": cards,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024 / 1024:.2f} MiB, {len(cards):,} cards)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
