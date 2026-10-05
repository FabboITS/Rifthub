"""Idempotent demo data: safe to run on every container start."""

import random
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.coaching.models import ActionItem, CoachingSession, VODComment, VODReview
from apps.scouting.models import PlayerCard, PlayerStats, PlayerSwipe, ScoutMatch, ScoutMessage, Swipe
from apps.scrims.models import AvailabilitySlot, Scrim, ScrimRequest, Tournament, TournamentEntry, TournamentMatch
from apps.scrims.services.tournament import generate_bracket, report_result
from apps.tactics.models import ReplayOverlay, ShadowSession, TacticBoard, TacticElement, TacticFrame
from apps.teams.models import LANE_ROLES, Membership, Team

PASSWORD = "Demo1234!"
DEMO_USERS = [
    ("admin@rifthub.dev", "ADMIN", "Admin RiftHub"),
    ("manager@rifthub.dev", "MANAGER", "Marco Manager"),
    ("coach@rifthub.dev", "COACH", "Chiara Coach"),
    ("player@rifthub.dev", "PLAYER", "Paolo Player"),
    ("scout@rifthub.dev", "SCOUT", "Sara Scout"),
]
# name, tag, region, tier, timezone, evening slot (start, end), rank tier for roster
TEAMS = [
    ("Nova Academy", "NOVA", "EUW", "ACADEMY", "Europe/Rome", (19, 23), "DIAMOND"),
    ("Aurora Esports", "AUR", "EUW", "ACADEMY", "Europe/Rome", (20, 23), "DIAMOND"),
    ("Iron Wolves", "IWLV", "EUW", "AMATEUR", "Europe/Berlin", (18, 22), "EMERALD"),
    ("Hextech Rising", "HEX", "EUW", "ACADEMY", "Europe/Paris", (19, 22), "EMERALD"),
    ("Baltic Storm", "BLS", "EUNE", "AMATEUR", "Europe/Warsaw", (19, 23), "PLATINUM"),
    ("Atlantic Five", "ATL5", "NA", "SEMI_PRO", "America/New_York", (13, 17), "MASTER"),
    ("Seoul Tempest", "SLT", "KR", "SEMI_PRO", "Asia/Seoul", (20, 24), "MASTER"),
    ("Mediterranean Kings", "MEDK", "EUW", "SEMI_PRO", "Europe/Madrid", (20, 24), "DIAMOND"),
]
CHAMPS = {
    "TOP": ["Aatrox", "Gnar", "Renekton", "Jax", "Camille", "Ornn", "Fiora", "Kennen", "Rumble", "Darius"],
    "JUNGLE": ["LeeSin", "Viego", "Sejuani", "Vi", "XinZhao", "Graves", "Nidalee", "Khazix", "Hecarim", "Maokai"],
    "MID": ["Ahri", "Azir", "Orianna", "Syndra", "Sylas", "Viktor", "Taliyah", "Yone", "Akali", "TwistedFate"],
    "ADC": ["Jinx", "Kaisa", "Xayah", "Ezreal", "Varus", "Zeri", "Caitlyn", "Ashe", "Kalista", "Draven"],
    "SUPPORT": ["Thresh", "Nautilus", "Rakan", "Leona", "Lulu", "Braum", "Rell", "Karma", "Bard", "Alistar"],
}
FREE_AGENTS = [
    "Sparrow", "Kaizen", "Nyx", "Brightwing", "Volt", "Ember", "Glacier", "Mistral", "Onyx", "Rook",
    "Zephyr", "Ivy", "Talon88", "Luma", "Drift", "Quasar", "Hollow", "Saber", "Echo", "Fennec",
    "Nimbus", "Grit", "Pixel", "Warden", "Solace", "Riptide", "Cinder", "Wisp", "Tundra", "Vesper",
]
DIVS = ["_1", "_2", "_3", "_4"]
# Placeholder public video (League of Legends "Warriors" anthem): replace with real VODs.
YOUTUBE_DEMO = ["https://www.youtube.com/watch?v=aR-KAldshAE"] * 3


def stats_for(rng, role, strength):
    """Plausible per-role stats; strength 0..1 nudges everything up."""
    cs = {"SUPPORT": (1.0, 1.8), "JUNGLE": (5.2, 6.8)}.get(role, (7.0, 9.8))
    vision = (1.9, 3.0) if role == "SUPPORT" else (0.7, 1.4)
    dmg = (8, 14) if role == "SUPPORT" else (20, 32)
    s = strength

    def pick(lo, hi):
        return lo + (hi - lo) * min(1, max(0, rng.uniform(s - 0.3, s + 0.3)))

    return {
        "games": rng.randint(60, 420),
        "winrate": round(pick(46, 63), 1),
        "kda": round(pick(2.0, 5.8), 2),
        "cs_per_min": round(pick(*cs), 2),
        "gold_per_min": round(pick(300, 470), 1),
        "damage_share": round(pick(*dmg), 1),
        "vision_score_per_min": round(pick(*vision), 2),
        "kill_participation": round(pick(50, 74), 1),
        "first_blood_rate": round(pick(4, 32), 1),
    }


class Command(BaseCommand):
    help = "Crea (o aggiorna) i dati demo di RiftHub. Idempotente."

    @transaction.atomic
    def handle(self, *args, **opts):
        self.rng = random.Random(42)
        self.now = timezone.now().replace(minute=0, second=0, microsecond=0)
        users = self.users()
        teams = self.teams(users)
        self.cards(teams)
        self.swipes(teams["Nova Academy"], users)
        self.scrims(teams)
        self.tournaments(users, teams)
        boards = self.tactics(teams["Nova Academy"], users)
        self.vods(teams["Nova Academy"], users, boards)
        self.coaching(users)
        # Answers the AI chat's suggested question ("support almeno Diamond in EUW che cercano team").
        # Created last so it doesn't shift the random sequence of the data above.
        self.card_for(None, "Halo", "SUPPORT", "DIAMOND_2", "EUW", looking=True, bio="Support in cerca di team.")
        self.stdout.write(self.style.SUCCESS("Dati demo pronti. Password per tutti: " + PASSWORD))

    # ── users & teams ──────────────────────────────────────────────────
    def user(self, email, role, name):
        u, created = User.objects.get_or_create(
            email=email, defaults={"username": email, "role": role, "display_name": name}
        )
        if created:
            u.set_password(PASSWORD)
            if role == "ADMIN":
                u.is_staff = u.is_superuser = True
            u.save()
        return u

    def users(self):
        return {email.split("@")[0]: self.user(email, role, name) for email, role, name in DEMO_USERS}

    def teams(self, users):
        teams = {}
        for name, tag, region, tier, tz, (start, end), rank_tier in TEAMS:
            owner = users["manager"] if name == "Nova Academy" else self.user(
                f"owner.{tag.lower()}@rifthub.dev", "MANAGER", f"Manager {tag}"
            )
            team, _ = Team.objects.get_or_create(
                name=name,
                defaults={"tag": tag, "region": region, "tier": tier, "owner": owner,
                          "description": f"Roster {tier.lower().replace('_', ' ')} della regione {region}."},
            )
            teams[name] = team
            Membership.objects.get_or_create(user=owner, team=team, defaults={"role_in_team": "ANALYST"})
            roles = LANE_ROLES
            if name == "Nova Academy":
                # Nova keeps SUPPORT open so the scouting deck has a clear need
                roles = ["TOP", "JUNGLE", "ADC"]
                Membership.objects.get_or_create(user=users["coach"], team=team, defaults={"role_in_team": "COACH"})
                Membership.objects.get_or_create(user=users["player"], team=team, defaults={"role_in_team": "MID"})
                self.card_for(users["player"], "PaoloMid", "MID", "DIAMOND_3", region, looking=False)
            for role in roles:
                nick = f"{tag}{role.capitalize()}"
                u = self.user(f"{nick.lower()}@players.rifthub.dev", "PLAYER", nick)
                Membership.objects.get_or_create(user=u, team=team, defaults={"role_in_team": role})
                self.card_for(u, nick, role, rank_tier + self.rng.choice(DIVS) if rank_tier != "MASTER" else "MASTER",
                              region, looking=False)
            if not team.availability.exists():
                for weekday in (0, 1, 2, 3, 4, 5):
                    AvailabilitySlot.objects.create(
                        team=team, weekday=weekday, start_time=time(start), end_time=time(end % 24), timezone=tz
                    )
        return teams

    def card_for(self, user, nick, role, rank, region, looking, bio=""):
        card, created = PlayerCard.objects.get_or_create(
            nickname=nick,
            defaults={"user": user, "role": role, "rank": rank, "region": region, "looking_for_team": looking,
                      "age": self.rng.randint(17, 26), "champion_pool": self.rng.sample(CHAMPS[role], 3), "bio": bio},
        )
        if created:
            strength = card.rank_score / 3000
            PlayerStats.objects.create(player=card, **stats_for(self.rng, role, strength))
        return card

    def cards(self, teams):
        tiers = ["GOLD", "PLATINUM", "EMERALD", "DIAMOND", "DIAMOND", "MASTER"]
        regions = ["EUW", "EUW", "EUW", "EUNE", "NA", "KR"]
        for i, nick in enumerate(FREE_AGENTS):
            role = LANE_ROLES[i % 5]
            tier = tiers[i % len(tiers)]
            rank = "MASTER" if tier == "MASTER" else tier + DIVS[(i * 3) % 4]
            self.card_for(
                None, nick, role, rank, regions[i % len(regions)], looking=i % 3 != 2,
                bio=f"{role.capitalize()} {'in cerca di team' if i % 3 != 2 else 'sotto contratto, aperto a offerte'}.",
            )

    def swipes(self, nova, users):
        # These supports already liked Nova: the manager's first LIKE produces a match.
        for nick in ("Volt", "Rook", "Fennec"):
            PlayerSwipe.objects.get_or_create(player=PlayerCard.objects.get(nickname=nick), team=nova,
                                              defaults={"direction": "LIKE"})
        # An existing match with some chat history
        solace = PlayerCard.objects.get(nickname="Solace")
        PlayerSwipe.objects.get_or_create(player=solace, team=nova, defaults={"direction": "LIKE"})
        Swipe.objects.get_or_create(swiper_team=nova, player=solace, defaults={"direction": "LIKE"})
        match, created = ScoutMatch.objects.get_or_create(team=nova, player=solace)
        if created:
            ScoutMessage.objects.create(scout_match=match, sender=users["manager"],
                                        text="Ciao Solace! Ci piacerebbe provarti in scrim questa settimana.")
            ScoutMessage.objects.create(scout_match=match, sender=users["scout"],
                                        text="Ho visto le sue ultime 20 partite: ottimo controllo visione.")
        Swipe.objects.get_or_create(swiper_team=nova, player=PlayerCard.objects.get(nickname="Drift"),
                                    defaults={"direction": "PASS"})

    # ── scrims & tournaments ───────────────────────────────────────────
    def scrims(self, teams):
        if ScrimRequest.objects.exists():
            return
        base = (self.now + timedelta(days=3)).replace(hour=20)  # 20:00 server time (Europe/Rome)
        for name in ("Nova Academy", "Aurora Esports", "Iron Wolves", "Hextech Rising", "Baltic Storm",
                     "Atlantic Five", "Mediterranean Kings"):
            ScrimRequest.objects.create(team=teams[name], format="BO3", preferred_start=base,
                                        desired_tier="ACADEMY" if name == "Nova Academy" else "",
                                        min_rank_score=1600, max_rank_score=3000)
        nova = teams["Nova Academy"]
        Scrim.objects.create(team_a=nova, team_b=teams["Hextech Rising"], format="BO3",
                             scheduled_at=self.now + timedelta(days=1, hours=2), notes="Focus su setup drago")
        Scrim.objects.create(team_a=nova, team_b=teams["Aurora Esports"], format="BO5", status="PLAYED",
                             scheduled_at=self.now - timedelta(days=5), score_a=3, score_b=2)
        Scrim.objects.create(team_a=teams["Iron Wolves"], team_b=nova, format="BO3", status="PLAYED",
                             scheduled_at=self.now - timedelta(days=9), score_a=1, score_b=2)

    def tournaments(self, users, teams):
        names = list(teams)
        open_t, created = Tournament.objects.get_or_create(
            name="Rift Academy Cup",
            defaults={"organizer": users["manager"], "organizer_team": teams["Nova Academy"],
                      "format": "SINGLE_ELIM", "start_date": date.today() + timedelta(days=14),
                      "status": "REGISTRATION", "max_teams": 8,
                      "description": "Coppa a eliminazione diretta per accademie. Iscrizioni aperte!"},
        )
        if created:
            for seed, n in enumerate(names[:6], 1):
                TournamentEntry.objects.create(tournament=open_t, team=teams[n], seed=seed)
        running, created = Tournament.objects.get_or_create(
            name="Winter Clash 2026",
            defaults={"organizer": users["admin"], "format": "SINGLE_ELIM", "start_date": date.today() - timedelta(days=3),
                      "status": "REGISTRATION", "max_teams": 8, "description": "Torneo invernale open, BO3."},
        )
        if created:
            for seed, n in enumerate(names, 1):
                TournamentEntry.objects.create(tournament=running, team=teams[n], seed=seed)
            generate_bracket(running)
            for m, score in zip(running.matches.filter(round=1).order_by("position")[:3], [(2, 0), (1, 2), (2, 1)],
                                strict=False):
                report_result(m, *score)
        league, created = Tournament.objects.get_or_create(
            name="Lega Accademie EUW",
            defaults={"organizer": users["manager"], "format": "ROUND_ROBIN", "start_date": date.today(),
                      "status": "REGISTRATION", "max_teams": 6, "description": "Girone all'italiana, BO1."},
        )
        if created:
            for seed, n in enumerate(["Nova Academy", "Aurora Esports", "Hextech Rising", "Iron Wolves"], 1):
                TournamentEntry.objects.create(tournament=league, team=teams[n], seed=seed)
            generate_bracket(league)
            for m in league.matches.filter(round=1):
                report_result(m, 1, 0)
        TournamentMatch.objects.filter(tournament=running, scheduled_at__isnull=True).update(
            scheduled_at=self.now + timedelta(days=2)
        )

    # ── tactics ────────────────────────────────────────────────────────
    def tactics(self, nova, users):
        B, R = "BLUE", "RED"
        tok = lambda champ, x, y, side=B: {"type": "CHAMPION_TOKEN", "champion": champ, "x": x, "y": y, "team_side": side}  # noqa: E731
        ward = lambda x, y, side=B: {"type": "WARD", "x": x, "y": y, "team_side": side, "color": "#facc15"}  # noqa: E731
        arrow = lambda x, y, x2, y2, c="#38bdf8": {"type": "ARROW", "x": x, "y": y, "x2": x2, "y2": y2, "color": c}  # noqa: E731
        circle = lambda x, y, c="#f87171": {"type": "CIRCLE", "x": x, "y": y, "x2": x + 0.06, "y2": y, "color": c}  # noqa: E731
        text = lambda x, y, t: {"type": "TEXT", "x": x, "y": y, "text": t, "color": "#e2e8f0"}  # noqa: E731
        blue5 = [("Gnar", .12, .86), ("LeeSin", .2, .8), ("Ahri", .16, .9), ("Jinx", .1, .92), ("Thresh", .14, .88)]
        boards = {
            "Invade lv1 (lato blu)": [
                ("0:00 Base", 0, [tok(c, x, y) for c, x, y in blue5]),
                ("0:45 Movimento", 45, [tok("Gnar", .35, .62), tok("LeeSin", .38, .6), tok("Ahri", .36, .58),
                                         tok("Jinx", .33, .6), tok("Thresh", .37, .63),
                                         arrow(.2, .8, .45, .52), ward(.5, .5)]),
                ("1:05 Ingresso jungla rossa", 65, [tok("Gnar", .55, .38), tok("LeeSin", .58, .36),
                                                    tok("Ahri", .56, .4), tok("Jinx", .53, .4), tok("Thresh", .57, .42),
                                                    tok("Viego", .62, .3, R), circle(.6, .33),
                                                    text(.6, .25, "Collapse sul buff")]),
                ("1:30 Reset", 90, [tok(c, x, y) for c, x, y in blue5] + [text(.3, .75, "Ritorno in lane")]),
            ],
            "Setup Drago 4ª anima": [
                ("18:30 Pulizia visione", 1110, [ward(.62, .7), ward(.7, .62), ward(.66, .78),
                                                 tok("Thresh", .6, .72), tok("LeeSin", .65, .66)]),
                ("19:10 Posizionamento", 1150, [tok("Gnar", .58, .74), tok("LeeSin", .64, .68),
                                                 tok("Ahri", .62, .76), tok("Jinx", .6, .8), tok("Thresh", .66, .72),
                                                 circle(.68, .7, "#a78bfa")]),
                ("19:40 Start drago", 1180, [tok("LeeSin", .68, .7), tok("Jinx", .66, .73),
                                             arrow(.7, .5, .68, .66, "#f87171"), text(.72, .48, "Rotazione mid avversaria")]),
            ],
            "Contesto Baron 28:00": [
                ("27:30 Controllo fiume", 1650, [ward(.32, .3), ward(.38, .24), tok("Thresh", .35, .32)]),
                ("28:00 Siege mid", 1680, [tok("Ahri", .45, .5), tok("Jinx", .48, .54), tok("Gnar", .42, .46),
                                          arrow(.45, .5, .35, .3)]),
                ("28:20 Baron", 1700, [tok("LeeSin", .33, .28), tok("Gnar", .36, .3), circle(.34, .28, "#a78bfa"),
                                      text(.28, .2, "Smite war")]),
                ("28:50 Disengage", 1730, [arrow(.34, .28, .2, .8, "#34d399"), text(.25, .6, "Reset con buff")]),
            ],
        }
        created_boards = []
        for title, frames in boards.items():
            board, created = TacticBoard.objects.get_or_create(
                team=nova, title=title,
                defaults={"created_by": users["coach"], "is_shared": True,
                          "description": "Lavagna demo creata dal coach."},
            )
            created_boards.append(board)
            if created:
                for order, (label, t, elements) in enumerate(frames):
                    frame = TacticFrame.objects.create(board=board, order=order, label=label, game_time_seconds=t)
                    TacticElement.objects.bulk_create(TacticElement(frame=frame, **e) for e in elements)
        ShadowSession.objects.get_or_create(
            board=created_boards[0], coach=users["coach"], player=users["player"], defaults={"status": "OPEN"}
        )
        return created_boards

    # ── VOD & coaching ─────────────────────────────────────────────────
    def vods(self, nova, users, boards):
        vods = [
            ("Scrim vs Aurora – G3", "Ahri", "MID", "WIN"),
            ("Clash finale – G1", "Syndra", "MID", "LOSS"),
            ("SoloQ review – Diamond", "Orianna", "MID", "WIN"),
        ]
        comments = [
            ("LANING", "INFO", "Buon trade livello 2 con il vantaggio di minion."),
            ("VISION", "WARNING", "Nessuna ward in river prima del push: rischio gank."),
            ("MICRO", "CRITICAL", "Flash sprecato su abilità non necessaria."),
            ("MACRO", "WARNING", "Rotazione bot tardiva, il drago era già perso."),
            ("TEAMFIGHT", "INFO", "Ottimo posizionamento sulla backline."),
            ("MENTAL", "WARNING", "Ping eccessivi dopo la morte: mantenere la calma."),
            ("MACRO", "CRITICAL", "Mid lasciata senza pressione durante il Baron avversario."),
            ("VISION", "INFO", "Deep ward utile nel raptor avversario."),
            ("DRAFT", "INFO", "Pick sicuro contro assassino: bene."),
            ("LANING", "WARNING", "CS perso sotto torre al minuto 8."),
            ("TEAMFIGHT", "CRITICAL", "Ingaggio senza cooldown chiave."),
        ]
        for i, (title, champ, role, result) in enumerate(vods):
            review, created = VODReview.objects.get_or_create(
                team=nova, title=title,
                defaults={"video_url": YOUTUBE_DEMO[i], "reviewer": users["coach"], "player_reviewed": users["player"],
                          "match_date": date.today() - timedelta(days=i * 3 + 1), "champion": champ, "role": role,
                          "result": result},
            )
            if created:
                n = 8 + (i * 2)  # 8, 10, 12 comments
                for j, (cat, sev, text) in enumerate((comments * 2)[i: i + n]):
                    VODComment.objects.create(review=review, author=users["coach"], timestamp_seconds=12 + j * 15,
                                              category=cat, severity=sev, text=text)
            if i == 0:
                ReplayOverlay.objects.get_or_create(board=boards[0], vod_review=review, defaults={"offset_seconds": 10})

    def coaching(self, users):
        coach, player = users["coach"], users["player"]
        sessions = [
            ("Gestione delle wave e reset", -2, "DONE", "Rivedere 3 partite e annotare i reset.",
             [("Tenere 8 CS/min nei primi 15'", True), ("Reset solo con wave spinta", False)]),
            ("Visione e controllo del fiume", 3, "PLANNED", "Piazzare 1 control ward ogni back.",
             [("Guardare la VOD Clash G1", False), ("Timer dei drake su carta", False),
              ("10 partite con focus sulla visione", False)]),
        ]
        for topic, days, status, homework, items in sessions:
            s, created = CoachingSession.objects.get_or_create(
                coach=coach, student=player, topic=topic,
                defaults={"scheduled_at": self.now + timedelta(days=days), "status": status, "homework": homework,
                          "duration_minutes": 60, "notes": "Sessione 1:1 su Discord."},
            )
            if created:
                for text, done in items:
                    ActionItem.objects.create(session=s, text=text, done=done)
