"""Data Dragon (static Riot CDN, no key) with in-memory cache and local fallback."""

import json
import re
import tempfile
from pathlib import Path

import requests
from django.core.cache import cache

BASE = "https://ddragon.leagueoflegends.com"
FALLBACK_VERSION = "14.24.1"
FALLBACK_FILE = Path(__file__).parent / "data" / "champions.json"
CACHE_KEY = "ddragon:champions"
CACHE_SECONDS = 12 * 3600
# Icons are proxied and kept on disk: the browser never hotlinks the CDN, so a throttled or
# blocked ddragon request can no longer leave the draft/scouting grids full of broken images.
ICON_DIR = Path(tempfile.gettempdir()) / "rifthub-champion-icons"
ICON_ID = re.compile(r"^[A-Za-z0-9]+$")


def _fallback():
    champs = json.loads(FALLBACK_FILE.read_text())
    return {"version": FALLBACK_VERSION, "source": "fallback", "champions": champs}


def _icon(version, champ_id):
    return f"/api/riot/champions/{champ_id}/icon.png"


def icon_bytes(champ_id):
    """PNG bytes for a known champion id, from the disk cache or the CDN; None if unavailable."""
    if not ICON_ID.match(champ_id):
        return None
    path = ICON_DIR / f"{champ_id}.png"
    if path.exists():
        return path.read_bytes()
    data = get_champions()
    if not any(c["id"] == champ_id for c in data["champions"]):
        return None
    for version in dict.fromkeys((data["version"], FALLBACK_VERSION)):
        try:
            r = requests.get(f"{BASE}/cdn/{version}/img/champion/{champ_id}.png", timeout=10)
        except requests.RequestException:
            continue
        if r.ok and r.headers.get("Content-Type", "").startswith("image/"):
            ICON_DIR.mkdir(parents=True, exist_ok=True)
            path.write_bytes(r.content)
            return r.content
    return None


def get_champions():
    data = cache.get(CACHE_KEY)
    if not data:
        data = _fetch()
    # Icons are added on every call: the cached copy has none, and returning it early
    # used to strip them after the first request (champion images vanished "after a while").
    for c in data["champions"]:
        c["icon"] = _icon(data["version"], c["id"])
    return data


def _fetch():
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
    return data


def champion_names():
    return [c["name"] for c in get_champions()["champions"]]
