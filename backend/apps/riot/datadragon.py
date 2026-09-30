"""Data Dragon (static Riot CDN, no key) with in-memory cache and local fallback."""

import json
from pathlib import Path

import requests
from django.core.cache import cache

BASE = "https://ddragon.leagueoflegends.com"
FALLBACK_VERSION = "14.24.1"
FALLBACK_FILE = Path(__file__).parent / "data" / "champions.json"
CACHE_KEY = "ddragon:champions"
CACHE_SECONDS = 12 * 3600


def _fallback():
    champs = json.loads(FALLBACK_FILE.read_text())
    return {"version": FALLBACK_VERSION, "source": "fallback", "champions": champs}


def _icon(version, champ_id):
    return f"{BASE}/cdn/{version}/img/champion/{champ_id}.png"


def get_champions():
    data = cache.get(CACHE_KEY)
    if data:
        return data
    try:
        version = requests.get(f"{BASE}/api/versions.json", timeout=5).json()[0]
        raw = requests.get(f"{BASE}/cdn/{version}/data/it_IT/champion.json", timeout=10).json()["data"]
        champs = sorted(
            ({"id": c["id"], "name": c["name"], "tags": c["tags"]} for c in raw.values()), key=lambda c: c["name"]
        )
        data = {"version": version, "source": "ddragon", "champions": champs}
    except (requests.RequestException, ValueError, KeyError, IndexError):
        data = _fallback()
        cache.set(CACHE_KEY, data, 600)  # retry the CDN sooner
    else:
        cache.set(CACHE_KEY, data, CACHE_SECONDS)
    for c in data["champions"]:
        c["icon"] = _icon(data["version"], c["id"])
    return data


def champion_names():
    return [c["name"] for c in get_champions()["champions"]]
