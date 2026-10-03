---
name: RiftHub
description: Atlante del competitivo. The whole League of Legends team cycle surveyed onto one atlas of the Rift.
colors:
  paper: "#eef1ea"
  sheet: "#f8faf5"
  sunk: "#e2e7dc"
  ink: "#1c2620"
  ink-2: "#45524a"
  ink-3: "#5b675f"
  grid: "#c2185b"
  grid-deep: "#a3134c"
  river: "#3e8fb0"
  river-ink: "#1d5a78"
  jungle: "#8fb37a"
  jungle-ink: "#33622a"
  lane: "#d9a441"
  lane-ink: "#85570a"
  blue-side: "#2f5da8"
  red-side: "#c8372d"
  bad: "#b42318"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4.6vw, 4rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 0.95
    fontVariation: "'wdth' 68"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.35
  control:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    fontVariation: "'wdth' 87.5"
  reading:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 87.5"
  reading-small:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 87.5"
rounded:
  none: "0px"
  sm: "2px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "20px"
  xl: "32px"
  band: "80px"
components:
  button-primary:
    backgroundColor: "{colors.grid}"
    textColor: "{colors.sheet}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.grid-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-outline-hover:
    backgroundColor: "{colors.sunk}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.bad}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "20px"
  tag:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  tag-selected:
    backgroundColor: "{colors.grid}"
    textColor: "{colors.sheet}"
  badge:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "22px"
  nav-item:
    textColor: "{colors.ink-2}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    backgroundColor: "{colors.grid}"
    textColor: "{colors.sheet}"
---

# Design System: RiftHub

## Overview

**Creative North Star: "The Surveyed Atlas"**

RiftHub is set as a printed survey atlas of Summoner's Rift. Every section is a numbered plate (tavola) with a place name, a grid reference and a locator inset; the app's chrome is a coordinate frame, not a dashboard shell. The ground is a cool survey sheet, the ink is green-black, and the only loud colour is a magenta grid overprint that marks where you are and what you can do. Region tints (jungle, river, lane) appear only where they describe real ground or carry status.

Density is that of a reference sheet: flat paper planes divided by one weight of hairline, readings in a monospaced face, headings that get their authority from scale and condensed width rather than colour or decoration. The ornament is the structure itself: the A–H graticule under the header, plate numbers that tick into place, register-style ruled strips, hatching for unsurveyed (empty) ground. This world replaces the earlier dark neon esports theme and explicitly refuses its devices: glass cards, glow, halo shadows and gradients.

**Key Characteristics:**
- Cool paper ground, green-black ink, one magenta overprint for action, selection and routes.
- Flat sheets with a single 1px hairline; square corners on surfaces, a 2px nick on controls.
- Archivo at variable widths for everything; hierarchy from size and condensation alone.
- Martian Mono for every reading: coordinates, plate numbers, ranks, scores, times, counts.
- Outline at rest, filled when active.
- Cartographic structure as ornament: graticule, grid refs, locator insets, dashed routes, hatching.

## Colors

A cool topographic palette: neutral survey paper and green-black ink, three hypsometric tints for real terrain, and a single magenta overprint. Every colour is defined once as an RGB triplet in `src/styles/ds.css` and mapped into Tailwind, so utilities and inline SVG share one source.

### Primary
- **Grid Overprint Magenta** (`grid`): the only action and selection colour. Primary buttons, the active nav item, the active graticule column, the selected tag, focus outlines, text selection, caret, accent-color, score bars and the dashed route on the plate. Its 9% wash marks hovered or chosen choices.
- **Deep Overprint** (`grid-deep`): primary button hover only.

### Secondary
- **River Blue** (`river`) with **River Ink** (`river-ink`): water on the map, thin secondary progress bars, informational tone. River Ink is the body link colour (1px underline at 35% alpha, full on hover) and is the legible text version of river.
- **Jungle Green** (`jungle`) with **Jungle Ink** (`jungle-ink`): terrain fill and the locator inset ground; Jungle Ink carries success tone text.
- **Lane Ochre** (`lane`) with **Lane Ink** (`lane-ink`): lanes on the plate and locator; Lane Ink carries warning and pending tone text.

### Tertiary
- **Blue Side** (`blue-side`) and **Red Side** (`red-side`): team sides only (bases, side badges, side markers). Never used as generic info or error colours.
- **Survey Error Red** (`bad`): errors and destructive actions, as text, 40% border, or 8% wash. Distinct from red side.

### Neutral
- **Survey Paper** (`paper`): page ground and sticky header.
- **Clean Sheet** (`sheet`): the plane data sits on: cards, inputs, dialogs, tags at rest.
- **Sunk Field** (`sunk`): hover fields on rows and ghost/outline buttons, empty bar tracks, skeleton loaders.
- **Survey Ink** (`ink`): headings, body text, structural rules (plate header top rule, header bottom rule, readings strip).
- **Ink Second** (`ink-2`): secondary text, labels, subtitles.
- **Ink Third** (`ink-3`): placeholders, captions, inactive graticule letters.
- **Hairline** (ink at 16%) for every divider and resting card border; **Strong Line** (ink at 50%) for control borders.

### Named Rules
**The One Overprint Rule.** Magenta means "here" or "do this": action, selection, focus, route. It never decorates, never colours a heading, and never stands in for a status.

**The Ink Twin Rule.** Each terrain tint has an ink twin. Tints fill areas and washes; text, borders and icons on paper use the ink twin (`river-ink`, `jungle-ink`, `lane-ink`) so tone text stays legible.

**The Sides Are Sides Rule.** Blue side and red side mean the two teams on the Rift. Errors use `bad`.

## Typography

**Display Font:** Archivo (variable, wdth 62–125, wght 100–900), fallback system-ui
**Body Font:** Archivo
**Label/Mono Font:** Martian Mono (variable, wdth 75–112.5), fallback ui-monospace

**Character:** one grotesque doing every job, stretched from condensed poster headings down to slightly narrowed controls, paired with a squared survey mono for anything that is measured.

### Hierarchy
- **Display** (800, clamp(2.25rem, 4.6vw, 4rem), lh 0.95, width 66–68%): plate titles in the page header and the home hero. Tight negative tracking; balanced wrap.
- **Headline** (800, clamp(2rem, 4vw, 3.4rem), lh 0.95, width 68%): band headings on the home plate; smaller steps of the same setting (clamp(1.8rem, 3vw, 2.6rem); dialog titles at 24px / width 75%) sit below it.
- **Title** (700, 15px, lh 1.25): the legend header of a sheet, list row titles.
- **Body** (400, 15px, lh 1.625): running text in ink-2; subtitles cap at 58–62ch.
- **Label** (600, 13px): form labels and reading labels in ink-2; sentence case.
- **Control** (600, 14px, width 87.5%): buttons, nav items, tags, badges (12px). Any stretched setting gets 0.14em word spacing because condensed Archivo closes up word gaps.
- **Reading** (Martian Mono 500, 20px, tabular): stat values; **Reading small** (12px) for plate refs, coordinates, dates, scale bars, axis ticks.

### Named Rules
**The Scale-Only Rule.** Hierarchy comes from size, weight and width. Headings are ink, never coloured.

**The Reading Rule.** If it is a measurement (rank, KDA, score, time, date, count, grid ref, plate number), it is set in Martian Mono with tabular figures.

**The Water Italic Rule.** Place names, water names and map captions (the plate's place under its grid ref, "Fiume", the atlas tagline) are set in italic, as on a map.

## Layout

A single centred sheet, max 1320px, with 16px gutters (24px from 640px). The sticky header (56px, paper, ink rule beneath) carries the wordmark and plate nav, then the graticule: an 18px strip of eight mono column letters A–H divided by hairlines, with the current plate's column filled magenta. Below 1280px the inline nav gives way to an "Indice" button that opens a full-screen index of plates.

Each page opens with the plate header: an ink top rule, display title and subtitle on the left, and in the right margin the plate number and grid reference (mono), the place name (italic) and a 40px locator inset. Content follows in sheets on a 16–20px gap grid; home bands are separated by 80px. Inside sheets the rhythm is 20px padding, 14px between blocks, 10×12px list rows. Grids collapse to one column on mobile; the locator and actions move under the title.

### Named Rules
**The Plate Rule.** Every routed section is a plate: it has a number, a place on the Rift, a grid ref derived from its coordinates, and a header that shows them. New sections are added to the atlas index, not invented as free pages.

## Elevation & Depth

Flat by default. Depth is tonal: paper ground, sheet planes, sunk fields for hover and wells, all separated by hairlines rather than shadows. There is one shadow, and it belongs only to things that genuinely float above the sheet.

### Shadow Vocabulary
- **Lift** (`box-shadow: 0 18px 40px -16px rgb(28 38 32 / .32), 0 2px 6px -2px rgb(28 38 32 / .16)`): dialogs, toasts, the sign-in sheet on the auth page, the swipe card. Always paired with a full ink border, never with a tint.

### Named Rules
**The Flat Sheet Rule.** Cards, rows, readings and the map rest flat. A shadow means the element is lifted off the page (modal, toast, draggable card); nothing glows, and no surface uses a gradient (the skeleton shimmer is the only moving fill).

## Shapes

Square surfaces, nearly square controls. Sheets, dialogs, readings strips, locator insets and plate frames have 0 radius; buttons, inputs, tags, badges and nav items take a 2px nick so they read as pressable. The only circles are map features: status dots, base and pin markers.

Lines are hairlines: 1px at 16% ink for dividers and resting borders, 1px at 50% ink for control borders, 1px full ink for structural rules and floating panels. On the map, SVG strokes use non-scaling 1px hairlines for contours and outlines; lanes are drawn as roads (wider ochre with an ink casing) and the route as a 2px dashed magenta line, both features of the terrain rather than rules. Empty ground is shown with a dashed strong-line border over 135° hatching.

### Named Rules
**The One Hairline Rule.** All rules and borders are 1px. Emphasis is a darker line (16% to 50% to full ink), never a thicker one. Roads and routes on the plate are terrain, not rules, and are exempt.

## Components

Every component is a flat sheet object: outline at rest, filled when active, magenta when it is the action.

### Buttons
- **Shape:** 2px nick, 40px tall (32px small, 48px large), 16px side padding, condensed control type, optional 16px Lucide trailing icon at stroke 1.6.
- **Primary:** grid magenta fill and border, white text; hover deep overprint. One per view region.
- **Outline:** transparent with strong-line border, ink text; hover full ink border and sunk fill. The default secondary action.
- **Ghost:** borderless ink-2 text; hover sunk fill and ink text. Toolbars and dismissals.
- **Danger:** transparent with 40% bad border and bad text; hover bad wash.
- **States:** active nudges down 1px; disabled is 40% opacity with a not-allowed cursor; focus is the global 2px magenta outline at 2px offset. Colour transitions 150ms.
- **Icon button:** square (36px default), outline or ghost, icon at 48% of size.

### Chips (Tags)
- **Style:** 32px, 2px nick, sheet ground, strong-line border, ink-2 control type.
- **State:** selected fills grid magenta with white text (`aria-pressed`); hover darkens border and text to ink. Grouped under a 13px label with 6px gaps.

### Badges
- **Style:** 22px outline pills with a 2px nick: tone ink text, tone border at 45%, tone wash fill; optional 6px dot. `solid` fills with the tone ink for the lit state. Tones: river, magenta, lane (warning/pending), jungle (success), bad, blue side, red side, neutral.

### Cards / Containers
- **Corner Style:** square (0).
- **Background:** clean sheet on paper.
- **Shadow Strategy:** none (see Flat Sheet Rule).
- **Border:** 1px hairline; magenta when the card is the chosen one; ink on hover when interactive.
- **Internal Padding:** 20px. An optional legend header (min 48px, title left, action link right) is ruled off by a hairline.

### Inputs / Fields
- **Style:** 44px, sheet ground, strong-line border, 2px nick, 15px ink text, ink-3 placeholder, optional 17px leading icon in ink-3. Label above at 13px/600 ink-2. Selects use the same field with an ink chevron.
- **Focus:** border turns magenta with a 2px magenta ring at 25%; caret is magenta.
- **Error / Disabled:** bad border plus a 13px bad message with `role="alert"`; disabled at 50% opacity.

### Navigation
- **Header:** wordmark (mark plus "RiftHub" at 800, width 72%), inline plate links as 32px control-type items in ink-2; hover sunk fill; active fills magenta with white text. External FantaLol link carries an up-right arrow.
- **Graticule:** the A–H ruler under the header; the current plate's column slides to its position (500ms, ease-out) in magenta with a white letter.
- **Mobile:** an "Indice" outline button opens a full-screen paper index: numbered plates (mono), condensed 1.65rem names, one-line blurbs, a boxed mono grid ref per row; the current plate is magenta.

### Plate Header (signature)
Ink top rule; display title; ink-2 subtitle; in the margin "Tav. NN · REF" in mono (the number counts up from 00 on arrival), the italic place name, and the 40px locator: an 8×8 jungle-wash grid with ochre lanes and the plate's cell overprinted magenta.

### Readings Strip (signature)
A ruled strip between two ink rules, cells divided by hairlines; each cell is a 13px label followed by a 20px mono value. Used for page-level counts instead of stat cards.

### Rift Plate (signature)
The generated topographic map: hypsometric jungle contours, river with italic name, ochre lanes, blue and red base quadrants, a coordinate frame lettered A–H and numbered 1–8, a mono scale bar and an italic caption. Legend entries and pins are diamonds; hovering or focusing one draws a dashed magenta route from the blue fountain to that locality (900ms stroke draw). Pins are outline at rest and filled magenta when active.

### Feedback
- **Empty:** hatched unsurveyed ground with a dashed border and the next step in words.
- **Loading:** sheet-shaped skeletons with a sunk-to-paper shimmer.
- **Error:** bad text on bad wash with a 50% bad border and an alert icon.
- **Toast:** 360px sheet, full ink border, lift shadow, tone-coloured icon.
- **Dialog:** ink border, lift shadow, 38% ink scrim; title in condensed 24px, optional mono caption beneath, actions ruled off at the foot. Esc and scrim close.

### Motion
Content is visible by default; motion only shapes arrival. Sheets rise 10px and fade (480ms), plate headers stagger title, subtitle and actions, pages arrive as a sheet clipped up from below (560ms), bars grow from the left (800ms), routes draw (900ms), all on `cubic-bezier(.16, 1, .3, 1)`. One `--rh-k` multiplier scales every duration, and reduced-motion collapses all of it to 1ms.

## Do's and Don'ts

### Do:
- **Do** put every new colour through `ds.css` as an RGB triplet and map it in Tailwind; reach for `paper`, `sheet`, `sunk` and the ink steps before anything else.
- **Do** use grid magenta only for the primary action, the active/selected state, focus and routes.
- **Do** set every measured value in Martian Mono with tabular figures, and place and water names in italic.
- **Do** separate with 1px hairlines and darken the line for emphasis (16% to 50% to full ink).
- **Do** show state as outline at rest and fill when active (tags, nav, badges `solid`, map pins).
- **Do** give every routed section a plate number, place, grid ref and locator through the atlas index and the plate header.
- **Do** render empty states as hatched unsurveyed ground with the next step in words.
- **Do** honour `--rh-k` and reduced motion in any new animation.

### Don't:
- **Don't** bring back the dark neon esports look: no glass cards, backdrop blur, glow, halo shadows or gradient fills.
- **Don't** add shadows to resting surfaces; the lift shadow is for floating layers only.
- **Don't** colour headings or make hierarchy with colour; use size, weight and width.
- **Don't** use blue side or red side for info and error states, or tint fills (`river`, `jungle`, `lane`) as text colour on paper.
- **Don't** round sheets, or round controls past the 2px nick.
- **Don't** thicken rules for emphasis; rules are 1px (map roads and routes excepted).
- **Don't** put small uppercase tracked labels above titles; captions sit beneath the title, in mono, and only when they carry a reading.
