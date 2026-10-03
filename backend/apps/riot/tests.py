from django.test import TestCase


class ChampionIconTests(TestCase):
    def test_rejects_unsafe_or_unknown_ids_without_auth(self):
        # Malformed ids are refused before any network or disk access.
        self.assertEqual(self.client.get("/api/riot/champions/..%2Fetc/icon.png").status_code, 404)
        self.assertEqual(self.client.get("/api/riot/champions/Bad-Id/icon.png").status_code, 404)

    def test_icons_survive_the_cache(self):
        from unittest import mock

        from django.core.cache import cache

        from apps.riot import datadragon

        cache.set(datadragon.CACHE_KEY, {"version": "1", "source": "ddragon", "champions": [{"id": "Ahri", "name": "Ahri", "tags": []}]})
        with mock.patch.object(datadragon, "_fetch", side_effect=AssertionError("cache hit expected")):
            champ = datadragon.get_champions()["champions"][0]
        self.assertEqual(champ["icon"], "/api/riot/champions/Ahri/icon.png")
