---
version: 1
slug: "frontend-src-pages-home-jsx"
primary_target: "frontend/src/pages/Home.jsx"
related_targets: ["frontend/src/App.jsx","frontend/src/components/Navbar.jsx"]
---

# Surface brief: RiftHub redesign (Home + section pages)

Scope: full redesign of the web app. Home (`/`, first page loaded) is Persuade for guests and a hub for signed-in users. Every section page (Dashboard, Team, Scrim, Tornei, Scouting, Tattiche, Draft, VOD, Coaching, Assistente AI, FantaLol, Auth) is Operate.

Audience/job: team staff and players of the Italian amateur/academy LoL scene. Guests: understand RiftHub and sign in. Members: jump to the right section and see what is live (scrims, matches, sessions).

Constraints: Italian UI, keeps LoL English jargon; all existing behavior, routes, data and copy facts stay; must not feel corporate; it must stay readable during daily use of dense tables, brackets and stats.

## Direction contract

THESIS: RiftHub is a surveyed atlas of the competitive scene. Each section is a numbered plate (tavola) of the Summoner's Rift atlas, with a grid reference, legend and scale. It refuses the category default of a dark neon esports dashboard with glass cards.

OWN-WORLD: cool survey-sheet ground #eef1ea, never cream. Ink is green-black #1c2620. Hypsometric tint fields carry real regions: jungle green #8fb37a, river blue #3e8fb0, lane ochre #d9a441. A magenta grid overprint #c2185b is the active and selection colour, with blue side #2f5da8 and red side #c8372d. Archivo sets everything at variable widths, and hierarchy comes from scale alone; Martian Mono is used for every reading (coordinates, rank, KDA, time). Water names are set in italic. Lines are one weight, fills are flat, and nothing has glow, shadow-as-halo or gradients. Inactive items are outlines and the active one is filled with tint. The ornament is the structure itself: graticule, register ticks and plate numbers.

STORY: a guest understands in one viewport that RiftHub maps the whole competitive cycle onto one atlas and signs in. A member sees live counts on the legend and goes straight to a plate.

FIRST VIEWPORT: a full-width topographic plate of the Rift (contours, river, lanes, bases), drawn in SVG, fills about 70% of the viewport. Its legend lists the sections as surveyed localities with grid references; hovering a legend entry or a map pin draws a dashed route from base to locality. The cartouche at the top left holds the wordmark, the one-line thesis and the primary action (Accedi as a guest; for a member, Entra nella Dashboard plus the next scrim). A thin coordinate frame runs around the plate. The signature move is the route draw. Pages arrive as a sheet sliding under the frame, while the plate number and grid reference tick in place.

FORM: grounded candidate 5 of 7 (Rift cartography atlas), assigned by seed 32dc3b85, raised by ligne-claire (one line weight), lineup (scale-only hierarchy), specimen (mono readings), coptic (structure as ornament) and akari (outline vs filled state).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
