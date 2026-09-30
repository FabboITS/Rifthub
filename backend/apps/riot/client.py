"""Riot Games API client with a deterministic mock fallback.

Real client: account-v1 (Riot ID -> PUUID), league-v4 (rank), match-v5 (recent games).
Without RIOT_API_KEY, or on any error, MockRiotClient generates stable fake stats
seeded by the nickname so `import-riot` always works in the demo.
"""

import hashlib
import logging
import random
import time as time_mod

import requests
from django.conf import settings
from django.core.cache import cache

log = logging.getLogger(__name__)

PLATFORM = {"EUW": "euw1", "EUNE": "eun1", "NA": "na1", "KR": "kr", "BR": "br1", "LAN": "la1",
            "LAS": "la2", "OCE": "oc1", "TR": "tr1", "JP": "jp1"}
ACCOUNT_REGION = {"EUW": "europe", "EUNE": "europe", "TR": "europe", "KR": "asia", "JP": "asia"}
MATCH_REGION = {**ACCOUNT_REGION, "OCE": "sea"}
CACHE_SECONDS = 300
MATCHES_TO_SCAN = 10


class RiotError(Exception):
    pass


class RiotClient:
    def __init__(self, api_key, timeout=10):
        self.session = requests.Session()
        self.session.headers["X-Riot-Token"] = api_key
        self.timeout = timeout

    def _get(self, url, params=None, retries=2):
        key = f"riot:{url}:{params}"
        cached = cache.get(key)
        if cached is not None:
            return cached
        for _ in range(retries + 1):
            r = self.session.get(url, params=params, timeout=self.timeout)
            if r.status_code == 429:  # rate limited: honour Retry-After (capped)
                time_mod.sleep(min(int(r.headers.get("Retry-After", "1")), 10))
                continue
            if not r.ok:
                raise RiotError(f"Riot API {r.status_code}: {r.text[:200]}")
            data = r.json()
            cache.set(key, data, CACHE_SECONDS)
            return data
        raise RiotError("Rate limit Riot API superato")

    def fetch_profile(self, riot_id, region):
        name, _, tag = riot_id.partition("#")
        tag = tag or region
        account_host = f"https://{ACCOUNT_REGION.get(region, 'americas')}.api.riotgames.com"
        match_host = f"https://{MATCH_REGION.get(region, 'americas')}.api.riotgames.com"
        platform_host = f"https://{PLATFORM.get(region, 'euw1')}.api.riotgames.com"

        puuid = self._get(f"{account_host}/riot/account/v1/accounts/by-riot-id/{name}/{tag}")["puuid"]
        entries = self._get(f"{platform_host}/lol/league/v4/entries/by-puuid/{puuid}")
        solo = next((e for e in entries if e.get("queueType") == "RANKED_SOLO_5x5"), None)
        rank = f"{solo['tier']}_{solo['rank']}" if solo else None
        if solo and solo["tier"] in ("MASTER", "GRANDMASTER", "CHALLENGER"):
            rank = solo["tier"]

        ids = self._get(f"{match_host}/lol/match/v5/matches/by-puuid/{puuid}/ids",
                        {"queue": 420, "count": MATCHES_TO_SCAN})
        games = []
        for mid in ids:
            info = self._get(f"{match_host}/lol/match/v5/matches/{mid}")["info"]
            p = next(x for x in info["participants"] if x["puuid"] == puuid)
            games.append((p, max(info["gameDuration"], 60) / 60))
        return {"puuid": puuid, "rank": rank, "stats": aggregate(games)}


def aggregate(games):
    """games: list of (participant dict, minutes)."""
    if not games:
        return {"games": 0}
    n = len(games)

    def avg(fn):
        return round(sum(fn(p, m) for p, m in games) / n, 2)

    deaths = sum(p["deaths"] for p, _ in games) or 1
    return {
        "games": n,
        "winrate": round(100 * sum(p["win"] for p, _ in games) / n, 1),
        "kda": round(sum(p["kills"] + p["assists"] for p, _ in games) / deaths, 2),
        "cs_per_min": avg(lambda p, m: (p["totalMinionsKilled"] + p["neutralMinionsKilled"]) / m),
        "gold_per_min": avg(lambda p, m: p["goldEarned"] / m),
        "damage_share": avg(lambda p, m: 100 * p.get("challenges", {}).get("teamDamagePercentage", 0)),
        "vision_score_per_min": avg(lambda p, m: p["visionScore"] / m),
        "kill_participation": avg(lambda p, m: 100 * p.get("challenges", {}).get("killParticipation", 0)),
        "first_blood_rate": round(100 * sum(p.get("firstBloodKill", False) for p, _ in games) / n, 1),
    }


class MockRiotClient:
    """Deterministic fake data: same nickname -> same stats."""

    def fetch_profile(self, riot_id, region):
        rng = random.Random(riot_id.lower())
        return {
            "puuid": "mock-" + hashlib.sha1(riot_id.lower().encode()).hexdigest()[:16],
            "rank": None,  # keep the rank already on the card
            "stats": {
                "games": rng.randint(40, 300),
                "winrate": round(rng.uniform(45, 62), 1),
                "kda": round(rng.uniform(2, 5.5), 2),
                "cs_per_min": round(rng.uniform(5.5, 9.5), 2),
                "gold_per_min": round(rng.uniform(320, 470), 1),
                "damage_share": round(rng.uniform(15, 32), 1),
                "vision_score_per_min": round(rng.uniform(0.7, 2.4), 2),
                "kill_participation": round(rng.uniform(50, 72), 1),
                "first_blood_rate": round(rng.uniform(5, 35), 1),
            },
        }


def get_client():
    return RiotClient(settings.RIOT_API_KEY) if settings.RIOT_API_KEY else MockRiotClient()


def import_player_stats(card):
    """Refresh a PlayerCard from Riot (or mock). Returns 'riot' or 'mock'."""
    from apps.scouting.models import PlayerStats

    client, source = get_client(), "riot"
    try:
        data = client.fetch_profile(card.nickname, card.region)
    except Exception as e:  # network, 403 expired key, unknown Riot ID...
        log.warning("Riot import failed for %s, using mock: %s", card.nickname, e)
        data, source = MockRiotClient().fetch_profile(card.nickname, card.region), "mock"
    if isinstance(client, MockRiotClient):
        source = "mock"
    if data.get("rank"):
        card.rank = data["rank"]
    if source == "riot":
        card.riot_puuid = data["puuid"]
    card.save()
    if data["stats"].get("games"):
        PlayerStats.objects.update_or_create(player=card, defaults=data["stats"])
    return source
