# PROJECT_SPEC — RiftHub: gestionale full stack per il League of Legends competitivo

> **Istruzioni per Claude Code**
> Questo file è la specifica completa del progetto. Leggilo per intero, poi genera **tutto il codice funzionante** nella directory corrente, seguendo le fasi in fondo al documento.
> Regole di lavoro:
> 1. Lavora per fasi, e alla fine di ogni fase esegui i controlli indicati (build, migrazioni, test, lint) prima di passare alla successiva.
> 2. Non lasciare TODO, stub o `pass` nelle funzionalità core: ogni feature elencata deve funzionare end-to-end con i dati di seed.
> 3. Il sistema deve avviarsi **solo con `docker compose up --build`** e funzionare senza chiavi API a pagamento (fallback e mock dove indicato).
> 4. Scrivi il codice in inglese (nomi, commenti), l'interfaccia utente e il README in **italiano**.
> 5. Se una scelta non è specificata, scegli la soluzione più semplice e robusta e documentala nel README.

---

## 1. Descrizione del progetto

**RiftHub** è una piattaforma gestionale per team, accademie e giocatori del League of Legends competitivo. Riunisce in un'unica webapp:

1. **Gestore automatico di Scrim e Tornei** per accademie esports.
2. **Marketplace di Talent Scouting e Statistiche Avanzate** (interfaccia "swipe" stile Tinder per i player).
3. **Shadow Coaching e Replay Overlay** con lavagna tattica su mappa (Summoner's Rift).
4. **Piattaforma di Coaching e Analisi VOD** con commenti a timestamp e report generati dall'AI.
5. **Collegamento a FantaLol**: link esterno a https://fantalol.win (nessuna integrazione API: solo link/card con `target="_blank" rel="noopener noreferrer"`).

---

## 2. Stack tecnologico (obbligatorio)

| Livello | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + **JSX** (no TypeScript), React Router v6, Axios, TailwindCSS, TanStack Query |
| Backend | Python 3.12 + Django 5 + Django REST Framework |
| Auth | JWT (`djangorestframework-simplejwt`) |
| Docs API | `drf-spectacular` (Swagger UI su `/api/docs/`) |
| Database | PostgreSQL 16 |
| AI | Ollama (LLM locale, default) con provider alternativi selezionabili da env: OpenAI, Anthropic, OpenRouter |
| Task asincroni | Non necessari: le chiamate AI sono sincrone con timeout (semplicità) |
| Orchestrazione | Docker Compose |
| Test | `pytest` + `pytest-django` (backend), `vitest` (frontend, almeno smoke test) |

---

## 3. Struttura del repository

```
rifthub/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh              # attende il DB, migrate, seed (se SEED_DEMO=1), runserver/gunicorn
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/                    # settings.py, urls.py, wsgi.py
│   └── apps/
│       ├── accounts/              # User custom, ruoli, JWT, profilo
│       ├── teams/                 # Team, Membership, Player profile
│       ├── scrims/                # Scrim, availability, matchmaking, Tournament, Match, bracket
│       ├── scouting/              # PlayerCard, Swipe, ScoutMatch, statistiche avanzate
│       ├── tactics/               # TacticBoard, Frame, Annotation (shadow coaching / overlay)
│       ├── coaching/              # VODReview, VODComment, CoachingSession
│       ├── ai/                    # provider LLM, servizi AI, agente
│       ├── riot/                  # client Riot API + Data Dragon con fallback mock
│       └── core/                  # comando seed_demo, permessi comuni, utils
└── frontend/
    ├── Dockerfile
    ├── nginx.conf                 # serve la build e fa proxy /api → backend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx, App.jsx
        ├── api/                   # client axios + interceptor JWT con refresh
        ├── context/AuthContext.jsx
        ├── components/            # Navbar, Card, Modal, Toast, ProtectedRoute, ecc.
        ├── pages/                 # vedi sezione 6
        └── styles/
```

---

## 4. Modello dati (Django)

Usa `UUID` come PK dove sensato, `created_at/updated_at` su tutti i modelli.

### accounts
- `User` (AbstractUser): `role` ∈ {`PLAYER`, `COACH`, `MANAGER`, `SCOUT`, `ADMIN`}, `display_name`, `avatar_url`.

### teams
- `Team`: `name`, `tag` (max 5), `region` (EUW, EUNE, NA, KR...), `tier` ∈ {`ACADEMY`, `AMATEUR`, `SEMI_PRO`, `PRO`}, `logo_url`, `description`, `owner` (FK User).
- `Membership`: `user`, `team`, `role_in_team` ∈ {`TOP`,`JUNGLE`,`MID`,`ADC`,`SUPPORT`,`COACH`,`ANALYST`,`SUB`}, `is_active`.

### scrims (scrim + tornei)
- `AvailabilitySlot`: `team`, `weekday` (0-6), `start_time`, `end_time`, `timezone`.
- `ScrimRequest`: `team`, `format` ∈ {`BO1`,`BO2`,`BO3`,`BO5`}, `desired_tier`, `min_rank_score`, `max_rank_score`, `preferred_start` (datetime), `status` ∈ {`OPEN`,`MATCHED`,`CANCELLED`}.
- `Scrim`: `team_a`, `team_b`, `format`, `scheduled_at`, `status` ∈ {`SCHEDULED`,`PLAYED`,`CANCELLED`}, `score_a`, `score_b`, `notes`, `request_a`, `request_b`.
- `Tournament`: `name`, `organizer` (Team o User), `format` ∈ {`SINGLE_ELIM`,`ROUND_ROBIN`}, `start_date`, `status` ∈ {`DRAFT`,`REGISTRATION`,`RUNNING`,`FINISHED`}, `max_teams`, `description`.
- `TournamentEntry`: `tournament`, `team`, `seed`.
- `TournamentMatch`: `tournament`, `round`, `position`, `team_a`, `team_b` (nullable), `score_a`, `score_b`, `winner`, `next_match` (self FK nullable), `scheduled_at`.

### scouting
- `PlayerCard`: `user` (OneToOne, opzionale), `nickname`, `real_name`, `age`, `role`, `region`, `rank` (es. `DIAMOND_2`), `rank_score` (int calcolato: es. Iron IV=0 … Challenger=~3000), `champion_pool` (JSON list), `bio`, `looking_for_team` (bool), `riot_puuid` (opzionale), `avatar_url`.
- `PlayerStats`: `player`, `games`, `winrate`, `kda`, `cs_per_min`, `gold_per_min`, `damage_share`, `vision_score_per_min`, `kill_participation`, `first_blood_rate`, `updated_at`.
- `Swipe`: `swiper_team` (FK Team), `player` (FK PlayerCard), `direction` ∈ {`LIKE`,`PASS`}. Unique (`swiper_team`, `player`).
- `PlayerSwipe`: il giocatore può a sua volta swipare i team (`player`, `team`, `direction`).
- `ScoutMatch`: creato automaticamente quando esiste LIKE reciproco team↔player; `team`, `player`, `matched_at`, `chat_open` (bool).
- `ScoutMessage`: chat minimale per i match (`scout_match`, `sender`, `text`).

### tactics (shadow coaching + replay overlay)
- `TacticBoard`: `team`, `title`, `description`, `map_variant` (default `summoners_rift`), `created_by`, `is_shared`.
- `TacticFrame`: `board`, `order`, `label` (es. "0:45 Invade"), `game_time_seconds`, `notes`.
- `TacticElement` (appartiene a un frame): `frame`, `type` ∈ {`CHAMPION_TOKEN`,`WARD`,`ARROW`,`CIRCLE`,`TEXT`,`PATH`}, `x`, `y` (0–1 normalizzati), `x2`, `y2` (per frecce), `champion` (id Data Dragon, opzionale), `color`, `team_side` ∈ {`BLUE`,`RED`}, `text`.
- `ShadowSession`: sessione di shadow coaching live: `board`, `coach` (User), `player` (User), `status` ∈ {`OPEN`,`CLOSED`}, `current_frame` (int). Il coach cambia frame e annotazioni; il player "in shadow" vede l'aggiornamento tramite **polling ogni 2s** (`GET /api/tactics/shadow-sessions/{id}/state/`). Non usare WebSocket.
- `ReplayOverlay`: `board`, `vod_review` (FK opzionale), `offset_seconds`: permette di sovrapporre i frame tattici a un VOD alle relative timestamp.

### coaching
- `VODReview`: `team`, `title`, `video_url` (YouTube/Twitch), `video_platform`, `reviewer` (User coach), `player_reviewed` (User, opz.), `match_date`, `champion`, `role`, `result` (WIN/LOSS), `ai_summary` (text, opz.), `status`.
- `VODComment`: `review`, `author`, `timestamp_seconds`, `category` ∈ {`MACRO`,`MICRO`,`LANING`,`VISION`,`TEAMFIGHT`,`DRAFT`,`MENTAL`}, `severity` ∈ {`INFO`,`WARNING`,`CRITICAL`}, `text`.
- `CoachingSession`: `coach`, `student`, `scheduled_at`, `duration_minutes`, `topic`, `status`, `notes`, `homework`.
- `ActionItem`: `session`, `text`, `done`.

### ai
- `AIReport`: `kind` ∈ {`VOD_SUMMARY`,`SCOUT_SUMMARY`,`DRAFT_ADVICE`,`AGENT_CHAT`}, `input_ref` (JSON), `output` (text), `provider`, `model`, `latency_ms`, `created_by`.

---

## 5. API REST (prefisso `/api/`)

Tutte protette da JWT tranne `auth/register`, `auth/login`, `health/`. Paginazione DRF (`PageNumberPagination`, 20). Filtri con `django-filter`. Permessi: i dati di un team sono modificabili solo dai suoi membri (manager/coach/owner).

### Auth & profilo
- `POST /auth/register/`, `POST /auth/login/`, `POST /auth/refresh/`, `GET/PATCH /auth/me/`
- `GET /health/` → `{status:"ok"}`

### Teams
- CRUD `/teams/`, `/teams/{id}/members/` (add/remove), `/teams/mine/`

### Scrims & Tornei
- CRUD `/availability/`
- CRUD `/scrim-requests/`
- `POST /scrim-requests/{id}/find-matches/` → ritorna i migliori candidati con **score di compatibilità** (0–100) e motivazione
- `POST /scrim-requests/{id}/auto-match/` → crea automaticamente la `Scrim` col miglior candidato, marca le due richieste come `MATCHED`
- CRUD `/scrims/`, `POST /scrims/{id}/report-result/`
- CRUD `/tournaments/`, `POST /tournaments/{id}/register/`, `POST /tournaments/{id}/generate-bracket/`, `GET /tournaments/{id}/bracket/`, `POST /tournament-matches/{id}/report-result/` (propaga il vincitore al `next_match`; nel round robin aggiorna la classifica), `GET /tournaments/{id}/standings/`

**Algoritmo di matchmaking** (in `apps/scrims/services/matchmaking.py`, puro Python e testato):
score = 40% sovrapposizione degli `AvailabilitySlot` (in minuti, tenendo conto del timezone) + 30% vicinanza rank medio (`rank_score`) + 15% stessa regione/tier desiderato + 15% penalità se i due team si sono affrontati di recente (evita ripetizioni), con esclusione dei team con scrim già programmata nella stessa fascia oraria.

**Bracket**: single elimination con byes automatici per numeri non potenza di 2 e seeding standard (1 vs N, 2 vs N-1…); round robin con algoritmo "circle method" e calcolo classifica (V/P, differenza, punti).

### Scouting
- `GET /scouting/cards/` (filtri: role, region, rank_min/max, looking_for_team, champion, ordering per stats)
- `GET /scouting/cards/{id}/` con `stats`
- `GET /scouting/deck/?team={id}` → prossimi player non ancora swipati dal team, ordinati per **fit score** rispetto ai ruoli scoperti del roster
- `POST /scouting/swipe/` `{team, player, direction}` → se LIKE reciproco crea `ScoutMatch` e lo segnala nella risposta (`matched: true`)
- `GET /scouting/matches/`, `GET/POST /scouting/matches/{id}/messages/`
- `GET /scouting/cards/{id}/compare/?with={id2}` → confronto stat avanzate (dati per radar chart)
- `POST /scouting/cards/{id}/import-riot/` → importa statistiche dalla Riot API (o mock, vedi sezione 8)

### Tactics
- CRUD `/tactic-boards/`, `/tactic-boards/{id}/frames/`, `/tactic-frames/{id}/elements/`
- `POST /tactic-boards/{id}/duplicate-frame/`
- CRUD `/shadow-sessions/`, `GET /shadow-sessions/{id}/state/`, `POST /shadow-sessions/{id}/set-frame/`
- CRUD `/replay-overlays/`

### Coaching / VOD
- CRUD `/vod-reviews/`, CRUD `/vod-comments/` (filtro per review, ordinamento per timestamp)
- CRUD `/coaching-sessions/`, `/action-items/`

### AI (vedi sezione 7)
- `POST /ai/vod-summary/` `{vod_review_id}`
- `POST /ai/scout-summary/` `{player_card_id}`
- `POST /ai/draft-advice/` `{our_picks[], enemy_picks[], side}`
- `POST /ai/agent/chat/` `{message, conversation_id?}`
- `GET /ai/status/` → provider attivo, modello, raggiungibilità di Ollama

Documenta tutto con `drf-spectacular` (`/api/schema/`, `/api/docs/`).

---

## 6. Frontend (React + Vite + JSX)

Design: tema scuro stile "esports" (sfondi `slate-900`, accenti azzurro/oro Hextech), responsive, componenti riutilizzabili, toast per feedback, loading e error state ovunque.

### Routing
| Route | Pagina |
|---|---|
| `/login`, `/register` | Auth |
| `/` | Dashboard: prossime scrim, tornei attivi, ultimi match di scouting, ultime VOD, **card FantaLol** |
| `/teams`, `/teams/:id` | Lista e dettaglio team, roster, disponibilità |
| `/scrims` | Richieste, pulsante "Trova avversario" (mostra candidati con score e motivazione) e "Auto-match", calendario settimanale |
| `/tournaments`, `/tournaments/:id` | Elenco, iscrizione, **bracket visuale** (single elim con linee di collegamento in SVG/CSS) e classifica round robin, inserimento risultati |
| `/scouting` | **Deck swipe** (card con foto, ruolo, rank, champion pool, mini radar stat) con pulsanti ❤️/✖️ e supporto a trascinamento (drag) e frecce da tastiera |
| `/scouting/browse` | Griglia con filtri avanzati + confronto fra due player (radar chart con Recharts) |
| `/scouting/matches` | Match ottenuti + chat |
| `/tactics`, `/tactics/:id` | **Lavagna tattica**: canvas/SVG sopra l'immagine mappa (usa un SVG semplificato di Summoner's Rift generato nel codice, niente asset con copyright), palette di token campione (icone da Data Dragon con fallback a cerchi colorati con iniziale), ward, frecce, cerchi, testo; timeline dei frame con play/pausa che anima le posizioni tra frame |
| `/tactics/shadow/:sessionId` | Vista **Shadow Coaching**: layout a due modalità — *coach* (modifica e cambia frame) e *player* (sola lettura, polling 2s) |
| `/vod` , `/vod/:id` | Player YouTube (IFrame API) + pannello commenti a timestamp (click sul commento → seek; aggiunta commento al tempo corrente), filtri per categoria/severità, pulsante **"Genera report AI"**, e **Replay Overlay**: i frame tattici collegati compaiono sopra/accanto al video ai timestamp giusti |
| `/coaching` | Sessioni di coaching, action items/homework |
| `/ai` | Chat con l'**assistente agentico** (mostra anche i tool richiamati) |
| `/fantalol` | Pagina con descrizione e bottone verso https://fantalol.win (nuova scheda) |

### Requisiti frontend
- `AuthContext` con token in `localStorage`, interceptor Axios per refresh automatico, `ProtectedRoute`.
- Variabile `VITE_API_URL` (default `/api`, in produzione servito da nginx con proxy).
- Navbar con link a tutte le sezioni e link esterno **FantaLol** sempre visibile.
- Nessuna dipendenza da servizi esterni per far partire l'app (Data Dragon con fallback, YouTube solo per il player).
- Librerie consigliate: `react-router-dom`, `axios`, `@tanstack/react-query`, `recharts`, `tailwindcss`, `lucide-react`, `react-hot-toast`, `date-fns`.

---

## 7. Funzionalità AI (backend)

Implementa in `apps/ai/` un **layer provider-agnostico**:

```
apps/ai/
├── providers/
│   ├── base.py          # class LLMProvider: chat(messages, tools=None, **kw) -> LLMResponse
│   ├── ollama.py        # POST {OLLAMA_BASE_URL}/api/chat (supporta tools)
│   ├── openai_compat.py # usato per OpenAI e OpenRouter (base_url diverso)
│   ├── anthropic.py     # SDK ufficiale `anthropic`
│   └── factory.py       # get_provider() in base a AI_PROVIDER
├── services.py          # vod_summary, scout_summary, draft_advice
├── agent.py             # agente con tool-calling
├── prompts.py
└── tests/
```

**Configurazione** (env): `AI_PROVIDER` ∈ {`ollama` (default), `openai`, `anthropic`, `openrouter`}, `AI_MODEL`, `OLLAMA_BASE_URL=http://ollama:11434`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `AI_TIMEOUT=120`.
Modello Ollama di default: `llama3.2:3b` (leggero); documenta alternative (`qwen2.5:7b`).

**Funzioni AI:**
1. **Riassunto VOD** (`vod_summary`): prende i `VODComment` di una review, li raggruppa per categoria e produce un report in italiano strutturato (punti di forza, errori ricorrenti, 3 priorità di miglioramento, piano di allenamento). Salva in `VODReview.ai_summary` e `AIReport`.
2. **Scouting summary** (`scout_summary`): da `PlayerCard` + `PlayerStats` genera profilo del giocatore, punti di forza/debolezza, ruoli/team-style compatibili.
3. **Draft advice** (`draft_advice`): suggerisce ban/pick data la composizione (usa la lista campioni da Data Dragon/seed come contesto).
4. **Agente (agentic)** in `agent.py`: loop di tool-calling (max 5 iterazioni) con questi tool Python esposti al modello:
   - `search_players(role, min_rank, max_rank, region)` → interroga `PlayerCard`
   - `get_player_stats(player_id)`
   - `find_scrim_opponents(team_id)` → riusa il matchmaking
   - `get_upcoming_scrims(team_id)`
   - `get_vod_comments(vod_id)`
   Il system prompt dice all'agente di rispondere in italiano e di usare i tool per dati reali senza inventarli. La risposta API include `answer` e `tool_calls` (nome, argomenti, risultato sintetico). Se il provider/modello non supporta i tool nativi, fallback a un protocollo JSON testuale (`{"tool": "...", "args": {...}}`) parsato dal backend.

**Robustezza:** timeout, gestione errori con risposta 503 chiara (`"Provider AI non raggiungibile"`), endpoint `/ai/status/`, test con provider **fake** (`AI_PROVIDER=fake` usato solo nei test e come fallback dichiarato) così i test non richiedono un LLM.

---

## 8. Backend di terze parti

1. **Riot Games API** (opzionale, `RIOT_API_KEY`): `apps/riot/client.py` con endpoint `account-v1` (Riot ID → PUUID), `league-v4` (rank), `match-v5` (ultime partite → calcolo KDA, CS/min, vision/min ecc.). Gestire rate limit (429 + `Retry-After`), cache breve. **Senza chiave** o in caso di errore: usare un `MockRiotClient` che genera statistiche deterministiche (seed da nickname), in modo che `import-riot` funzioni sempre in demo. Documentare che le development key scadono ogni 24h.
2. **Data Dragon** (CDN statica Riot, senza chiave): versione da `https://ddragon.leagueoflegends.com/api/versions.json`, campioni da `/cdn/{version}/data/it_IT/champion.json`, icone da `/cdn/{version}/img/champion/{Name}.png`. Il backend espone `GET /api/riot/champions/` con cache in memoria e fallback a un JSON locale con una lista ridotta di campioni.
3. **FantaLol** (https://fantalol.win): solo collegamento esterno da frontend (nessuna API). Specificarlo nel README.
4. **Provider AI online** (OpenAI, Anthropic, OpenRouter): descritti in sezione 7, abilitati tramite env.

---

## 9. Docker Compose

`docker-compose.yml` con questi servizi:

| Servizio | Immagine/Build | Note |
|---|---|---|
| `db` | `postgres:16-alpine` | volume `pgdata`, healthcheck `pg_isready` |
| `backend` | build `./backend` | `depends_on: db (healthy)`, porta `8000`, env da `.env`, esegue `entrypoint.sh` (wait DB → `migrate` → `collectstatic` → `seed_demo` se `SEED_DEMO=1` → `gunicorn`) |
| `frontend` | build `./frontend` (multi-stage node build → nginx) | porta `5173:80`, nginx serve la SPA (fallback `index.html`) e fa proxy `/api/` → `backend:8000` |
| `ollama` | `ollama/ollama` | volume `ollama_data`, porta `11434`, healthcheck |
| `ollama-init` | `curlimages/curl` o `ollama/ollama` | dipende da `ollama`, scarica il modello `AI_MODEL` (`/api/pull`) e termina |

Requisiti:
- Un solo comando: `docker compose up --build`.
- Profilo opzionale `gpu` (commentato/documentato) per Ollama con GPU NVIDIA.
- `.env.example` completo e commentato; il compose deve funzionare anche copiando semplicemente `.env.example` in `.env`.
- L'app deve partire anche se il modello Ollama non è ancora scaricato (l'AI restituisce un errore gestito finché non è pronto).
- Nessun secret hardcoded; `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` da env.

---

## 10. Dati demo (`python manage.py seed_demo`)

Comando idempotente che crea:
- Utenti (password `Demo1234!`): `admin@rifthub.dev` (ADMIN), `manager@rifthub.dev` (MANAGER, owner del team "Nova Academy"), `coach@rifthub.dev` (COACH), `player@rifthub.dev` (PLAYER), `scout@rifthub.dev` (SCOUT).
- 8 team di diversi tier/regioni con roster completi e slot di disponibilità sovrapponibili in modo che il matchmaking dia risultati.
- 30 `PlayerCard` con stats realistiche, mix di ruoli/rank, alcuni con `looking_for_team=True`, e alcune azioni di swipe già presenti per far scattare almeno un match reciproco alla prima prova.
- 2 tornei (uno in `REGISTRATION` con 6 iscritti, uno `RUNNING` con bracket generato e qualche risultato).
- 3 `TacticBoard` di esempio (invade lv1, setup drago, contesto Baron) con 3–5 frame ciascuno, e una `ShadowSession` aperta.
- 3 `VODReview` (link YouTube pubblici di esempio, anche placeholder) con 8–12 commenti ciascuna e un `ReplayOverlay`.
- 2 `CoachingSession` con action items.

---

## 11. Test e qualità

- Backend: test `pytest` per: algoritmo di matchmaking, generazione bracket (2, 5, 8, 13 team), propagazione vincitori, calcolo classifica round robin, logica dei match reciproci di scouting, permessi (un team non può modificare dati di un altro), agente AI con provider fake.
- Frontend: smoke test `vitest` (render App, ProtectedRoute redirect, deck swipe).
- Lint: `ruff` (backend) e `eslint` (frontend) configurati e senza errori.
- Il file `docker-compose.yml` deve validarsi con `docker compose config`.

---

## 12. README.md (da generare, in italiano)

Deve contenere, in quest'ordine:

1. **Titolo e descrizione** del progetto, con elenco delle 5 macro-funzionalità e screenshot/diagramma testuale dell'architettura (diagramma Mermaid).
2. **Informazioni per l'uso del repo** (pensando a un collega sviluppatore):
   - Prerequisiti (Docker ≥ 24 + Compose v2; per sviluppo locale senza Docker: Python 3.12, Node 20+, PostgreSQL 16, Ollama).
   - Setup rapido: `cp .env.example .env` → `docker compose up --build` → URL dei servizi (frontend `:5173`, API `:8000/api`, Swagger `:8000/api/docs/`, Ollama `:11434`).
   - Tempi/risorse: il primo avvio scarica il modello Ollama (indicare dimensione e RAM richiesta) e come verificarne lo stato (`docker compose logs -f ollama-init`).
   - **Credenziali demo** e **percorso guidato** per provare l'intero sistema (es. "1. login come manager → 2. Scrims → trova avversario → auto-match → 3. Tornei → genera bracket → 4. Scouting → swipe → match → 5. Tactics → apri lavagna → 6. VOD → genera report AI → 7. Shadow session con due browser → 8. Chat agente AI").
   - Tabella delle **variabili d'ambiente** (obbligatorie/opzionali, default).
   - Come cambiare provider AI (Ollama / OpenAI / Anthropic / OpenRouter) e come usare la Riot API con chiave reale.
   - Sviluppo locale senza Docker (backend e frontend), comandi per test, lint, migrazioni, reset del DB e re-seed.
   - Struttura del repo e panoramica delle API principali.
   - Descrizione dei backend di terze parti e **come avviene il collegamento** (Riot API, Data Dragon, provider AI, FantaLol come link esterno).
   - Troubleshooting (porte occupate, Ollama lento/no GPU, CORS, DB non pronto).
3. **Funzionalità da sviluppare in futuro** (almeno): WebSocket/Django Channels per shadow coaching realtime; import automatico di replay `.rofl`; integrazione Discord/calendari; notifiche; ranking Elo interno delle scrim; ruoli/permessi granulari; analisi AI multimodale dei VOD (frame + trascrizione); integrazione futura con FantaLol se esporrà API; mobile app; CI/CD e deploy in cloud.
4. **Riferimenti utili**: Riot Developer Portal (https://developer.riotgames.com), Riot API docs (https://developer.riotgames.com/apis), Data Dragon (https://developer.riotgames.com/docs/lol#data-dragon), Django (https://docs.djangoproject.com), DRF (https://www.django-rest-framework.org), drf-spectacular, SimpleJWT, Vite (https://vitejs.dev), React (https://react.dev), TailwindCSS, Recharts, Ollama (https://ollama.com), Ollama API (https://github.com/ollama/ollama/blob/main/docs/api.md), Anthropic docs (https://docs.anthropic.com), OpenAI docs (https://platform.openai.com/docs), OpenRouter (https://openrouter.ai/docs), Leaguepedia/Oracle's Elixir per dati competitivi, FantaLol (https://fantalol.win).
5. **Disclaimer legale**: progetto non affiliato né approvato da Riot Games; League of Legends è marchio di Riot Games, Inc.

---

## 13. Fasi di esecuzione per Claude Code

Esegui in ordine e verifica a ogni fase.

**Fase 0 — Scaffold**: crea la struttura di cartelle, `.gitignore`, `.env.example`, `docker-compose.yml`, Dockerfile di backend e frontend, `entrypoint.sh`.
**Fase 1 — Backend base**: progetto Django, settings via env, app `accounts` e `teams`, JWT, `health`, drf-spectacular. ✔ `python manage.py check` e `makemigrations --check`.
**Fase 2 — Scrims e Tornei**: modelli, servizi matchmaking e bracket, API, test. ✔ `pytest apps/scrims`.
**Fase 3 — Scouting**: modelli, deck/swipe/match/chat, compare, client Riot + mock + Data Dragon. ✔ test.
**Fase 4 — Tactics e Coaching**: board/frame/elementi, shadow session con polling, VOD e commenti, overlay. ✔ test.
**Fase 5 — AI**: provider, servizi, agente, endpoint, `/ai/status/`, test con provider fake.
**Fase 6 — Seed demo**: `seed_demo` idempotente con tutti i dati della sezione 10.
**Fase 7 — Frontend**: setup Vite+Tailwind, auth, layout, poi pagine nell'ordine: dashboard, teams, scrims, tornei (bracket), scouting (swipe), tactics (lavagna + shadow), VOD (player + commenti + overlay + AI), coaching, chat AI, FantaLol. ✔ `npm run build` e `npm run lint`.
**Fase 8 — Integrazione Docker**: `docker compose up --build`, verifica end-to-end con `curl` (login → richiesta scrim → auto-match → bracket → swipe → ai/status) e correggi ogni errore.
**Fase 9 — README** completo come da sezione 12 e checklist finale.

### Checklist di accettazione finale
- [ ] `docker compose up --build` avvia db, backend, frontend, ollama senza errori.
- [ ] Login con le credenziali demo funziona e ogni pagina è raggiungibile.
- [ ] Auto-match di una scrim produce una `Scrim` valida.
- [ ] Il bracket di un torneo si genera e i risultati si propagano.
- [ ] Lo swipe produce almeno un match reciproco con chat funzionante.
- [ ] La lavagna tattica salva frame ed elementi; la shadow session si aggiorna sul secondo client.
- [ ] Una VOD accetta commenti a timestamp e genera il report AI (o errore gestito se il modello non è pronto).
- [ ] L'agente AI usa almeno un tool e ne mostra il risultato.
- [ ] Il link FantaLol apre https://fantalol.win in una nuova scheda.
- [ ] Test backend e frontend passano; lint pulito.
- [ ] README completo secondo la sezione 12.

Al termine, stampa un riepilogo con: comandi per avviare, URL, credenziali demo, e limiti noti.
