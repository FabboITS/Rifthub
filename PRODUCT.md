# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two sides of competitive League of Legends, weighted equally:

- **Team staff** (coaches, managers, scouts) of amateur, semi-pro and academy teams. They organise scrims and tournaments, review VODs, plan drafts and tactics, and scout players for open roster spots.
- **Players**. Solo players look for a team through the scouting deck, get coached through VOD reviews and homework, and play scrims with their roster.

The scouting match system (team ↔ player mutual swipe, then chat) is where the two sides meet. Account roles in the code: `PLAYER`, `COACH`, `MANAGER`, `SCOUT`, `ADMIN`.

## Product Purpose

RiftHub brings a competitive team's whole workflow into one web app instead of a pile of Discord channels, spreadsheets and separate tools:

1. scrim matchmaking and tournaments (brackets, round-robin groups);
2. talent scouting marketplace with advanced stats;
3. shadow coaching and replay overlay on a tactics board;
4. VOD coaching with timestamped comments and AI reports;
5. draft advisor and an agentic AI assistant over the team's real data;
6. an external link to FantaLol (fantalol.win), with no integration.

Current stage: a full-stack showcase demo that should grow into a real product. Today, success means the demo convinces whoever sees it end to end. Later, it means real teams adopt it and keep using it.

## Positioning

One tool covering the whole competitive cycle (find players → build the roster → scrim → review → coach → draft), with an AI assistant that acts on that same data. Point tools each cover only one step.

## Operating Context

- Tied to League of Legends: roles (TOP/JUNGLE/MID/ADC/SUPPORT), ranks (Iron → Challenger), regions, champions, Summoner's Rift.
- External sources: Riot Games API (falls back to deterministic mock data when there is no key or it errors, and the response says `source: "mock"`), Data Dragon for champion assets, YouTube IFrame player for VODs.
- AI runs on local Ollama by default, or optionally on OpenAI, Anthropic or OpenRouter.
- Shadow coaching is live coach → player via 2 s polling (no WebSockets yet).

## Capabilities and Constraints

- Stack: React 18 + Vite + Tailwind 3, React Query, Recharts, lucide-react on the frontend; Django + DRF + PostgreSQL behind nginx; Docker Compose.
- **UI language: Italian.** LoL-native English terms (scrim, draft, VOD, ban/pick, champion names, role names) stay in English as the scene uses them.
- Demo data comes from `python manage.py seed_demo` (30 player cards, teams, scrims, swipes that trigger a match).
- Undecided / future (from the spec): realtime WebSockets, `.rofl` replay import, Discord/calendar integration, notifications, internal scrim Elo, granular permissions, multimodal VOD AI, mobile app, cloud deploy.

## Brand Commitments

- Name: **RiftHub**. No logo or brand assets are committed yet.
- Riot Games and FantaLol are third parties. Use their marks only in a referential way, and never imply an affiliation.

## Evidence on Hand

- Seeded demo data and Riot mock stats only. There are no real users, teams, testimonials, metrics or press, so never invent any.

## Product Principles

1. **Both sides first-class.** Every flow should make sense to staff and players alike. Don't design a staff tool with a player afterthought, or the reverse.
2. **One cycle, connected.** Features link to each other (a scouted player → roster → scrim → VOD → coaching); avoid dead-end silos.
3. **Speak the scene's language.** Italian UI with the community's own English jargon. Data is shown the way competitive players read it (KDA, CS/min, rank tiers).
4. **Demo-ready, product-bound.** Every surface must look convincing with seed data today, without shortcuts that would block real use tomorrow.
5. **Honest data.** Always make it clear when stats are mock or AI-generated.
