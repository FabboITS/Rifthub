# AUDIT_REPORT — RiftHub

Data: 2026-10-05 · Commit auditato: `126a864` · Fase 1 (solo lettura + esecuzione)

**Ambiente di prova:** WSL2 Linux, Docker 29.8.1, Compose v5.5.1, Node 26, Python 3.14 (host).
**Prova da zero:** `git clone` locale in una cartella temporanea → `cp .env.example .env` → `docker compose up --build -d`.
Lo stack dell'utente (`rifthub`) era già in esecuzione sulle porte 5173/8000/11434, quindi la prova è stata fatta con
`-p rifthub-audit` e un override che rimappa solo le porte (18000, 15173, 21434). Nessun altro intervento. Stack di prova
rimosso al termine (`down -v`).

Legenda: ✅ presente e ok · ⚠️ parziale · ❌ assente

## A. Struttura

| # | Requisito | Stato | Evidenza / note |
|---|---|---|---|
| A1 | Monorepo con servizi in sottocartelle | ✅ | `backend/`, `frontend/`, `docker-compose.yml` in root. Niente `db/`: lo schema sta nelle migrazioni Django (`backend/apps/*/migrations/`) e il seed in `backend/apps/core/management/commands/seed_demo.py`, scelta valida. |
| A2 | Un solo `.git` alla root | ✅ | `find . -name .git -not -path ./.git` → nessun risultato; nessun `.gitmodules`. |
| A3 | `.gitignore` completo | ✅ | `.gitignore` copre `.env`, `__pycache__/`, `node_modules/`, `frontend/dist/`, `backend/staticfiles/`, `db.sqlite3`, `.venv/`. I volumi sono volumi Docker con nome (non cartelle). `git check-ignore -v .env` → `.gitignore:1:.env`. |
| A4 | Nessun file inutile/sensibile | ⚠️ | Nessun segreto (`.env` non è tracciato e coincide con `.env.example`). Però ci sono file di lavoro tracciati: `.impeccable/` (6,1 MB, 48 PNG di review del design tool), `frontend/rifthub-redesign.patch` (180 KB), `frontend/REDESIGN.md`, `.claude/settings.json` (tracciato anche se `.claude/` è in `.gitignore`). |

## B. README.md

| # | Requisito | Stato | Evidenza / note |
|---|---|---|---|
| B1 | Titolo e descrizione | ✅ | `README.md:1-11`. |
| B2 | Architettura | ✅ | Diagramma Mermaid `README.md:13-29` + tabella URL/porte. |
| B3 | Prerequisiti con versioni | ✅ | Docker ≥ 24, Compose v2, Python 3.12, Node 20+, PostgreSQL 16. |
| B4 | Dipendenze fuori da Docker | ✅ | Sezione "Sviluppo locale senza Docker"; versioni bloccate in `backend/requirements.txt` e `frontend/package-lock.json`. |
| B5 | Variabili d'ambiente una per una | ✅ | Tabella `README.md:87-105` (obbligatorietà, default, descrizione) + commenti in `.env.example`. |
| B6 | Servizi da avere attivi | ✅ | DB, Ollama e ollama-init descritti in "Tempi e risorse" e nel compose. |
| B7 | Dati demo / credenziali | ✅ | "Credenziali demo" (5 utenti, password `Demo1234!`) + "Percorso guidato". |
| B8 | Passi da `git clone` al sistema funzionante | ⚠️ | Il Quick start parte da `cp .env.example .env`: manca la riga `git clone … && cd Rifthub`. URL finali presenti. |
| B9 | Come eseguire i test | ✅ | "Test, lint, migrazioni". Il numero è sbagliato: dice "50 test", in realtà sono 56. |
| B10 | Roadmap | ✅ | "Funzionalità da sviluppare in futuro". |
| B11 | Riferimenti utili | ✅ | `README.md:291-310`. |
| B12 | Troubleshooting | ✅ | `README.md:263-276` (porte, Ollama, CORS, DB, host). |
| B13 | Screenshot / GIF | ⚠️ | Ci sono `docs/Screenshot 2026-10-03 180701.png` e `…180744.png` ma il README non li usa (`grep -c 'docs/Screenshot' README.md` → 0). I nomi dei file contengono spazi. |

## C. Codice fullstack

| # | Requisito | Stato | Evidenza / note |
|---|---|---|---|
| C1 | DB: schema + dati iniziali | ✅ | Migrazioni `0001_initial` per ogni app; `seed_demo` idempotente lanciato da `backend/entrypoint.sh` se `SEED_DEMO=1`. |
| C2 | Backend con logica | ✅ | Django + DRF; logica in `apps/scrims/services/` (matchmaking, bracket), `apps/scouting/services.py`, `apps/ai/agent.py`. |
| C3 | API documentata | ✅ | drf-spectacular: `GET /api/docs/` → 200, `/api/schema/`. |
| C4 | Frontend che consuma le API | ✅ | React + Vite, `frontend/src/api/client.js` (axios, `VITE_API_URL` con default `/api`), proxy nginx `/api/` → backend. |
| C5 | Compose che lancia tutto | ✅ | `db`, `backend`, `frontend`, `ollama`, `ollama-init`. `docker compose config -q` → OK. |
| C6 | Healthcheck + `service_healthy` | ⚠️ | `db` e `ollama` hanno healthcheck, `backend` dipende da `db: service_healthy`. Però `backend` non ha un healthcheck e `frontend` ha `depends_on: [backend]` senza condizione. |
| C7 | AI integrata nel backend | ✅ | Agente con tool-calling (`apps/ai/agent.py`), provider `ollama`/`openai`/`anthropic`/`openrouter`/`fake` (`apps/ai/providers/`), prompt in `apps/ai/prompts.py`. Endpoint `ai/agent/chat`, `ai/vod-summary`, `ai/scout-summary`, `ai/draft-advice`, `ai/status`. |
| C8 | Servizio di terze parti online | ✅ | Riot Games API (`apps/riot/client.py`, header `X-Riot-Token`, `RIOT_API_KEY`) e Data Dragon CDN (`apps/riot/datadragon.py`). Documentati in "Backend di terze parti e collegamenti". |
| C9 | Errori e fallback | ⚠️ | I fallback ci sono: AI → `503` con un messaggio chiaro, Riot → mock (`source: "mock"`), Data Dragon → JSON locale. **Manca il retry** sulle chiamate AI (`providers/ollama.py:37`, `openai_compat.py:40`: solo timeout), che la checklist (Fase 2 §5) richiede. Non c'è nemmeno una configurazione `LOGGING`: `getLogger` compare solo in `apps/riot/client.py`, quindi le chiamate AI e gli errori non vengono loggati. |
| C10 | Il frontend mostra AI e terze parti | ✅ (statico) | `pages/AIChat.jsx`, report AI in `VodDetail.jsx`/`Scouting*.jsx`, icone campioni in `components/ChampionIcon.jsx`. Verificato solo leggendo il codice e chiamando le API, non nel browser. |

## D. Prova di funzionamento (eseguita davvero)

| # | Verifica | Stato | Evidenza / note |
|---|---|---|---|
| D1 | `docker compose up` senza interventi | ✅ | `up --build -d` → exit 0. Tutti i servizi sono saliti (`db` e `ollama` healthy). Le immagini base erano già in cache locale: su una macchina pulita il primo avvio è più lento. ⚠️ Le porte sono fisse nel compose e `name: rifthub` è hardcoded: due copie del progetto, o porte già occupate, richiedono di modificare il compose. |
| D2 | DB inizializzato automaticamente | ✅ | Log backend: tutte le migrazioni `OK` e poi `Dati demo pronti. Password per tutti: Demo1234!`. |
| D3 | API rispondono | ✅ | `GET /api/health/` → `{"status":"ok"} 200`. Login `manager@rifthub.dev` → JWT. `teams/` count 8, `scouting/cards/` count 69, `tournaments/` count 3, `vod-reviews/` count 3, `riot/champions/` `source: ddragon`. `POST auth/login/` con input non valido → 400 con un messaggio di validazione. |
| D4 | Frontend raggiungibile e funzionante | ⚠️ | `GET /` → 200, proxy `GET /api/health/` via nginx → 200. Il flusso end-to-end nel browser è **NON VERIFICATO**: in questo ambiente non c'è un browser automatizzato. |
| D5 | AI risponde o fallisce chiaramente | ✅ | Prima che il modello fosse pronto: `503 {"detail":"Provider AI non raggiungibile","error":"Modello 'llama3.2:3b' non ancora disponibile: attendi il download (ollama-init)."}`. Dopo `Modello pronto.`: `ai/agent/chat` → 200 in 34 s, con la tool call `search_players` eseguita. |
| D6 | README coincide con la realtà | ⚠️ | (1) Al passo 8 del percorso guidato ("support almeno Diamond in EUW che cercano team") il tool restituisce `[]`: nel seed le uniche support EUW che cercano team sono Fennec (PLATINUM_2) e Solace (GOLD_1). Il modello risponde comunque con suggerimenti generici inventati. (2) Il README dice "50 test", sono 56. (3) Manca il passo `git clone`. |

## E. Qualità

| # | Requisito | Stato | Evidenza / note |
|---|---|---|---|
| E1 | Test automatici | ✅ | `docker compose exec backend pytest` → `56 passed in 19.93s`. Frontend `npm test` → `9 passed (3 files)`. `npm run build` ok. |
| E2 | `.env.example` completo e commentato | ✅ | Tutte le variabili usate dal compose/settings sono presenti e commentate. Mancano solo le variabili per le porte, che però oggi non esistono. |
| E3 | `LICENSE` | ❌ | Il file non c'è. |
| E4 | `docs/` con architettura/API | ⚠️ | `docs/` contiene solo i 2 screenshot. Il diagramma sta nel README e l'API è su Swagger. |
| E5 | Lint/format configurati | ⚠️ | `backend/ruff.toml` e `frontend/eslint.config.js` ci sono. `npm run lint` → pulito. **`ruff check .` → 1 errore**: `apps/riot/urls.py:1:1 I001 Import block is un-sorted` (si sistema con `--fix`). `makemigrations --check` → `No changes detected`. |
| E6 | CI GitHub Actions | ❌ | Non esiste `.github/workflows/` (la CI è elencata nella roadmap). |
| E7 | Sicurezza di base | ⚠️ | ✅ CORS configurato da env (`settings.py:18`), input validato dai serializer DRF, `SECRET_KEY` non hardcoded (`settings.py:16`), `DEBUG=0` di default. ⚠️ Il container backend gira come **root** (`whoami` → `root`, il Dockerfile non ha `USER`). L'utente DB `rifthub` è **superuser** (`rolsuper = t`, è l'utente creato da `POSTGRES_USER`). Ollama è esposto sull'host (11434) senza autenticazione. |
| E8 | Volumi per la persistenza del DB | ✅ | Volumi `pgdata` e `ollama_data` in `docker-compose.yml`. |

## Altre osservazioni

- Il modello di default è `llama3.2:3b` (~2 GB). La checklist consiglia un modello piccolo (`llama3.2:1b` / `qwen2.5:0.5b`) per macchine modeste. Nel README la scelta è motivata (tool-calling migliore), quindi è un punto da decidere, non un errore.
- `.env.example` imposta `OLLAMA_NUM_THREAD=8`, un valore tarato sulla CPU dell'autore. Su macchine con meno core può peggiorare le prestazioni (nel README è documentato).
- Le porte non si possono configurare da `.env` (la Fase 2 §2 lo richiede).

## Riepilogo prioritizzato

**Bloccanti:** nessuno. Un collega che clona il repo e segue il README ottiene frontend, API, DB con i dati demo e AI funzionanti (verificato).

**Importanti**
1. C9: retry con backoff sulle chiamate ai provider AI e configurazione `LOGGING` (richieste, errori, chiamate AI/Riot).
2. E7: backend Docker come utente non root. Valutare un utente applicativo Postgres non superuser e non esporre la porta 11434 di Ollama.
3. C6: healthcheck sul `backend` e `frontend` con `depends_on: backend: service_healthy`.
4. E5: errore ruff in `apps/riot/urls.py` (CI rossa appena verrà aggiunta).
5. D6: allineare il percorso guidato al seed (aggiungere una support Diamond+ EUW che cerca team, o cambiare la domanda d'esempio), correggere "50 test" → 56, aggiungere `git clone` al Quick start.
6. D1/§2: porte configurabili da `.env` (`FRONTEND_PORT`, `BACKEND_PORT`, `OLLAMA_PORT`).

**Nice-to-have**
7. E6: CI GitHub Actions (pytest + ruff, vitest + eslint + build).
8. E3: `LICENSE`.
9. B13/E4: spostare gli screenshot in `docs/screenshots/` con nomi senza spazi, mostrarli nel README e aggiungere `docs/architecture.md`.
10. A4: togliere dal repo `.impeccable/`, `frontend/rifthub-redesign.patch`, `.claude/settings.json` (`git rm --cached`) e aggiungerli a `.gitignore`.
11. Opzionale: `Makefile` (`up`, `down`, `seed`, `test`). Valutare un modello di default più piccolo.

### Non verificato
- Flusso end-to-end nel browser (D4): nessun browser automatizzato disponibile.
- Provider AI online (OpenAI/Anthropic/OpenRouter) e Riot API con chiave reale: nessuna chiave disponibile. È stato verificato solo il fallback mock di Riot.
- GPU NVIDIA, Windows/macOS nativi, primo avvio senza immagini Docker in cache.

---

# Fase 2 + 3 — Completamento e verifica finale

Verifica finale da **clone pulito** del commit `96ffa66` seguendo il README alla lettera (`git clone` → `cp .env.example .env` → `docker compose up --build -d`).
Per non toccare lo stack dell'utente già acceso ho usato la procedura ora documentata nel Troubleshooting: porte cambiate in `.env`
(`FRONTEND_PORT=15173`, `BACKEND_PORT=18000`, `OLLAMA_PORT=21434`) e `COMPOSE_PROJECT_NAME=rifthub-audit`. **Nessuna modifica al compose.**

Evidenze della verifica finale:
- `docker compose up --build -d` → exit 0. `docker compose ps`: `db (healthy)`, `backend (healthy)`, `ollama (healthy)`, `frontend` partito solo dopo che il backend è diventato healthy. `ollama` esposto su `127.0.0.1:21434`; dall'IP LAN non è raggiungibile.
- `whoami` nel container backend → `app`.
- `GET /api/health/` → 200, `/api/docs/` → 200, frontend `/` → 200, proxy `/api/health/` → 200, login demo ok.
- Support EUW che cercano team nel seed: `Halo DIAMOND_2`, `Fennec PLATINUM_2`, `Solace GOLD_1`.
- AI prima del modello: `503` con un messaggio chiaro. Nei log compaiono `INFO apps.ai: ollama llama3.2:3b -> 404 in 0.0s`, `ERROR apps.ai.views: AI provider error: …` e la riga di access log di gunicorn.
- AI dopo `Modello pronto.`: con la domanda del percorso guidato, 3 esecuzioni su 3 usano `min_rank: DIAMOND_4` e la risposta cita *Halo*.
- `pytest` → `58 passed`. `ruff check .` → `All checks passed!`. `makemigrations --check` → `No changes detected`.
- Frontend (codice non modificato in fase 2): `npm test` 9 passed, `npm run lint` pulito, `npm run build` ok (fase 1).

## Stato finale (prima → dopo)

| # | Prima | Dopo | Cosa è cambiato |
|---|---|---|---|
| A1 | ✅ | ✅ | — |
| A2 | ✅ | ✅ | — |
| A3 | ✅ | ✅ | aggiunti `.impeccable/` e `*.patch` |
| A4 | ⚠️ | ✅ | non più tracciati `.impeccable/`, `frontend/rifthub-redesign.patch`, `.claude/settings.json` (restano sul disco) |
| B1–B7 | ✅ | ✅ | tabella variabili: aggiunte porte e `LOG_LEVEL` |
| B8 | ⚠️ | ✅ | Quick start da `git clone` |
| B9 | ✅ | ✅ | numero test corretto (58), sezione CI |
| B10–B12 | ✅ | ✅ | Troubleshooting: porte da `.env`, seconda copia, frontend in attesa |
| B13 | ⚠️ | ✅ | 3 screenshot in `docs/screenshots/` mostrati nel README |
| C1–C5, C7, C8, C10 | ✅ | ✅ | — |
| C6 | ⚠️ | ✅ | healthcheck `backend`, `frontend` → `backend: service_healthy` |
| C9 | ⚠️ | ✅ | `post_with_retry` (3 tentativi su errore di connessione/429/502–504), `LOGGING` + `LOG_LEVEL`, access log gunicorn, test con requests mockato |
| D1 | ✅ | ✅ | porte e nome progetto configurabili da `.env` |
| D2, D3, D5 | ✅ | ✅ | — |
| D4 | ⚠️ | ⚠️ | E2E nel browser ancora NON VERIFICATO (verificate solo le API via proxy nginx) |
| D6 | ⚠️ | ✅ | seed allineato al percorso guidato (card *Halo*), descrizioni dei parametri rank nel tool |
| E1 | ✅ | ✅ | 56 → 58 test backend |
| E2 | ✅ | ✅ | porte e `LOG_LEVEL` in `.env.example` |
| E3 | ❌ | ✅ | `LICENSE` (MIT) |
| E4 | ⚠️ | ✅ | `docs/architecture.md` (diagramma, servizi, avvio, flusso AI) |
| E5 | ⚠️ | ✅ | ruff pulito |
| E6 | ❌ | ✅ (non eseguita) | `.github/workflows/ci.yml`: ruff + migrations check + pytest, eslint + vitest + build, build Docker. Va eseguita su GitHub dopo il push |
| E7 | ⚠️ | ⚠️ | ✅ backend non root, ✅ Ollama solo su localhost. Resta: l'utente Postgres è superuser (vedi sotto) |
| E8 | ✅ | ✅ | — |

## Cosa non è stato fatto, e perché

- **Utente Postgres non superuser:** non implementato. Gli script in `docker-entrypoint-initdb.d` girano solo su un volume vuoto: su un DB già esistente (come il tuo `rifthub_pgdata`) il backend non troverebbe il nuovo utente e non partirebbe. Va fatto insieme a una migrazione dei volumi; è in Roadmap.

## Da verificare a mano

- Il flusso completo nel browser (login → scrim → bracket → swipe → lavagna → VOD → chat AI).
- La CI su GitHub dopo il push (in questo ambiente non può girare).
- I provider online (OpenAI/Anthropic/OpenRouter) e la Riot API con chiave reale (nessuna chiave disponibile; verificato solo il fallback mock di Riot).
- GPU NVIDIA, Windows/macOS nativi, primo avvio su una macchina senza immagini Docker in cache.
- La licenza: ho scelto MIT con titolare "Massimiliano". Cambiala se il corso o l'ITS richiede altro.
- `frontend/REDESIGN.md` cita ancora `rifthub-redesign.patch`, che ora non è più nel repo.
- Il tuo stack locale `rifthub` gira ancora con le immagini vecchie: `docker compose up --build -d` per aggiornarlo. Ollama passerà su `127.0.0.1`.
