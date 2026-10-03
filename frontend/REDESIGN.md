# RiftHub — Redesign "Forge" (frontend)

## Come applicarlo
1. Sostituisci la cartella `frontend/` del repo con quella di questo zip (oppure applica `rifthub-redesign.patch` dalla root con `git apply rifthub-redesign.patch`).
2. `cd frontend && npm install` (nuove dipendenze: `motion`, `@fontsource/big-shoulders-display`, `@fontsource/barlow`).
3. `npm run dev`, oppure `docker compose up --build` come prima. Backend e API sono invariati.

Verificato: `npm run lint`, `npm test` (9/9) e `npm run build` passano.

## File nuovi
- `src/components/RiftBackground.jsx` — sfondo animato su canvas (braci, strati topografici, calore, alone del cursore). Rispetta `prefers-reduced-motion` e si mette in pausa a tab nascosta.
- `src/components/Transitions.jsx` — `RouteWipe` (lama diagonale lungo la mid lane a ogni cambio pagina) e `PageTransition` (uscita/entrata delle pagine).
- `src/components/Brand.jsx` — marchio RiftHub (top lane + mid lane).

## File riscritti
- `src/components/RiftMap.jsx` — Summoner's Rift vettoriale (basi, corsie, fiume, Baron/Drago, giungla, torri, minion animati) + `RiftPositions` (le 10 posizioni T/J/M/A/S dell'immagine di riferimento) + `LiveRift` (mappa autonoma per la landing).
- `src/styles/ds.css`, `src/styles/index.css`, `tailwind.config.js` — token del tema. I vecchi nomi (`--cyan-400`, `text-hex`, `slate-*`…) sono alias del nuovo tema, quindi tutte le pagine lo ereditano.
- `src/components/ds.jsx`, `src/components/ui.jsx`, `src/components/Navbar.jsx`.
- `src/pages/Home.jsx`, `src/pages/Auth.jsx`, `src/App.jsx`.

## Ritocchi
Colori fissi e etichette maiuscole delle altre pagine migrati al nuovo tema. `lib/tactics.js`: blu `#5aa9ff`, rosso `#ff6b1a`. Test aggiornati e polyfill jsdom per `motion` e canvas.

## Note
- I font sono self-hosted (Fontsource): nessuna chiamata a Google Fonts.
- Nessun asset di Riot Games: mappa, icone e marchio sono disegnati in codice.
