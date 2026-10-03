/**
 * Summoner's Rift stilizzata, disegnata interamente in codice (nessun asset Riot).
 * viewBox 0..100. Base blu in basso a sinistra, base rossa in alto a destra, fiume sulla diagonale
 * alto-sinistra → basso-destra, Baron a nord del fiume, Drago a sud. Il lato rosso è il lato blu
 * ruotato di 180° attorno al centro (la Rift è quasi simmetrica per rotazione).
 *
 * Export:
 *  - default RiftMap({ animated })          → <g> da inserire in un <svg viewBox="0 0 100 100">
 *  - RiftPositions({ highlight, onRole })   → le 10 posizioni dei giocatori (come lo screenshot di riferimento)
 *  - LiveRift({ highlight, onRole })        → <svg> autonomo con mappa + posizioni (landing page)
 */

export const RIFT = {
  void: "#030202",
  ground: "#14100c",
  wall: "#060403",
  wallEdge: "rgba(255,150,80,.16)",
  lane: "#3b2b1f",
  laneHi: "#5a412c",
  river: "#0f2433",
  riverHi: "#1b3d55",
  brush: "#1f2611",
  blue: "#5aa9ff",
  red: "#ff6b1a",
  camp: "#ffb547",
};

export const SIDE = { BLUE: RIFT.blue, RED: RIFT.red };

/** Catmull-Rom chiusa → path SVG morbido. */
function blob(pts) {
  const n = pts.length;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d + "Z";
}

/** Il fiume: banchi calcolati lungo la diagonale y = x, con anse e allargamento al centro. */
function riverPath() {
  const ne = [], sw = [];
  for (let s = 13; s <= 87; s += 2.5) {
    const center = Math.exp(-((s - 50) ** 2) / 90) * 2.2;
    const hw = 3.4 + center + Math.sin(s * 0.45) * 0.7;
    const wob = Math.sin(s * 0.21) * 0.35;
    ne.push([s + hw * 0.707 + wob, s - hw * 0.707 + wob]);
    sw.push([s - hw * 0.707 + wob, s + hw * 0.707 + wob]);
  }
  return blob([...ne, ...sw.reverse()].map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]));
}
const RIVER = riverPath();

// Corsie dritte: top e bot sono due segmenti ad angolo retto, mid è la diagonale tra le basi.
export const LANES = {
  top: "M11,84 L11,11 L84,11",
  mid: "M15,85 L85,15",
  bot: "M16,89 L89,89 L89,16",
};

// Muri della giungla del lato BLU (il rosso è la rotazione di 180°).
const WALLS_BLUE = [
  // top-side blu (tra top lane e mid)
  [[15.5, 30], [20.5, 29.5], [22, 35.5], [18.5, 41], [15.5, 39.5]],
  [[23.5, 39.5], [29.5, 41], [30.5, 47.5], [26, 50.5], [22, 46.5]],
  [[15.5, 48.5], [19.5, 47.5], [20.5, 55], [17, 60], [15.5, 57]],
  [[27, 56.5], [33.5, 53], [36, 56], [32, 60], [27, 62]],
  [[32, 45.5], [37, 44.5], [40, 49.5], [36.5, 53], [33, 51.5]],
  [[16, 64], [22, 64.5], [21, 68.5], [16.5, 68.5]],
  // bot-side blu (tra mid e bot lane)
  [[35, 74], [41, 71], [44, 75], [40, 80], [35, 79]],
  [[46, 82.5], [52, 81], [56, 83.5], [50, 85.5], [45, 85.5]],
  [[47, 66], [53, 64], [57, 69], [53, 74], [48, 72]],
  [[61, 79], [67, 77.5], [71, 80], [66, 84.5], [60, 83]],
  [[56, 75.5], [59, 74.5], [60, 78], [57, 79]],
  // lungo il fiume
  [[21, 29], [25, 31.5], [24, 35], [20.5, 33]],
  [[69, 75], [73, 77], [71, 79], [68, 77.5]],
];
const BRUSH_BLUE = [
  [[13.5, 43], [15, 43], [15, 47], [13.5, 47]],
  [[27.5, 36], [30, 35], [31, 37.5], [28.5, 38.5]],
  [[60, 66], [63, 65.5], [63.5, 67.5], [60.5, 68]],
  [[37.5, 59.5], [40, 58.5], [41, 61], [38.5, 62]],
];
const CAMPS_BLUE = [[18.5, 44.5], [25, 53.5], [24.5, 63], [44.5, 78], [54.5, 77.5], [60.5, 86.5]];
const TOWERS_BLUE = [
  [11, 64], [11, 46], [11, 27],
  [27, 73], [33, 67], [40, 60],
  [36, 89], [54, 89], [73, 89],
  [14.5, 83.5], [16.5, 85.5],
];

const ROT = "rotate(180 50 50)";

function SideBase({ team }) {
  const c = SIDE[team];
  return (
    <g transform={team === "RED" ? ROT : undefined}>
      <path d="M3,68 L19,68 Q22,68 24,70 L32,78 Q34,80 34,83 L34,97 L3,97 Z" fill="#0d0b0a" />
      <path d="M3,68 L19,68 Q22,68 24,70 L32,78 Q34,80 34,83 L34,97" fill="none" stroke={c} strokeOpacity=".35" strokeWidth=".35" />
      <path d="M5,70 L5,95 L32,95" fill="none" stroke={c} strokeOpacity=".05" strokeWidth="3" />
    </g>
  );
}

function Side({ team }) {
  const c = SIDE[team];
  return (
    <g transform={team === "RED" ? ROT : undefined}>
      <g transform="translate(11.5 88.5)">
        <circle r="5.5" fill={c} opacity=".08" />
        <path d="M0,-3.2 L3.2,0 L0,3.2 L-3.2,0 Z" fill="#0d0b0a" stroke={c} strokeWidth=".6" />
        <path d="M0,-1.6 L1.6,0 L0,1.6 L-1.6,0 Z" fill={c} />
      </g>
      {[[11, 75], [23.5, 77], [25.5, 89]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#0d0b0a" stroke={c} strokeWidth=".45" />
      ))}
      {WALLS_BLUE.map((p, i) => <path key={i} d={blob(p)} fill={RIFT.wall} stroke={RIFT.wallEdge} strokeWidth=".35" />)}
      {BRUSH_BLUE.map((p, i) => <path key={i} d={blob(p)} fill={RIFT.brush} />)}
      {CAMPS_BLUE.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="1.6" fill={RIFT.camp} opacity=".12" />
          <circle cx={x} cy={y} r=".6" fill={RIFT.camp} opacity=".85" />
        </g>
      ))}
      {TOWERS_BLUE.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <rect x="-.9" y="-.9" width="1.8" height="1.8" transform="rotate(45)" fill="#0d0b0a" stroke={c} strokeWidth=".4" />
          <circle r=".35" fill={c} />
        </g>
      ))}
    </g>
  );
}

/** Ondate di minion che camminano lungo le corsie verso il centro. */
function MinionWaves() {
  return (
    <g>
      {Object.values(LANES).flatMap((d, li) =>
        [0, 1].map((side) =>
          [0, 0.6, 1.2].map((off) => (
            <circle key={`${li}-${side}-${off}`} r=".45" fill={side ? RIFT.red : RIFT.blue} opacity=".9">
              <animateMotion dur="12s" repeatCount="indefinite" begin={`${-(li * 2.7 + off)}s`} path={d}
                keyPoints={side ? "1;0.5" : "0;0.5"} keyTimes="0;1" calcMode="linear" />
            </circle>
          )),
        ),
      )}
    </g>
  );
}

export default function RiftMap({ animated = false }) {
  return (
    <g>
      <defs>
        <pattern id="rift-grain" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx=".7" cy=".7" r=".18" fill="#2a1f17" />
          <circle cx="2.2" cy="2" r=".12" fill="#22190f" />
        </pattern>
        <linearGradient id="rift-river" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={RIFT.riverHi} />
          <stop offset=".5" stopColor={RIFT.river} />
          <stop offset="1" stopColor={RIFT.riverHi} />
        </linearGradient>
        <radialGradient id="rift-heat" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff6b1a" stopOpacity=".18" />
          <stop offset="1" stopColor="#ff6b1a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="100" fill={RIFT.void} />
      <rect x="2.5" y="2.5" width="95" height="95" rx="5" fill={RIFT.ground} />
      <rect x="2.5" y="2.5" width="95" height="95" rx="5" fill="url(#rift-grain)" />
      <rect x="2.5" y="2.5" width="95" height="95" rx="5" fill="none" stroke="rgba(255,140,70,.18)" strokeWidth=".4" />

      <path d={RIVER} fill="url(#rift-river)" />
      <path d={RIVER} fill="none" stroke="#2c5b7a" strokeOpacity=".5" strokeWidth=".35" />
      {animated && (
        <path d="M16,16 L84,84" stroke="#5aa9ff" strokeOpacity=".25" strokeWidth=".35" strokeDasharray="1.5 3"
          style={{ animation: "rhFlow 5s linear infinite" }} />
      )}

      {/* Baron (nord del fiume) e Drago (sud) */}
      <circle cx="36.5" cy="30.5" r="4.6" fill="#0a1820" stroke="#9b7bff" strokeOpacity=".55" strokeWidth=".4" />
      <circle cx="36.5" cy="30.5" r="2.2" fill="#9b7bff" opacity=".25" />
      <circle cx="63.5" cy="69.5" r="4.6" fill="#0a1820" stroke={RIFT.red} strokeOpacity=".6" strokeWidth=".4" />
      <circle cx="63.5" cy="69.5" r="2.2" fill={RIFT.red} opacity=".28" />
      <circle cx="27" cy="26" r=".7" fill="#7fd1c4" opacity=".8" />
      <circle cx="73" cy="74" r=".7" fill="#7fd1c4" opacity=".8" />

      <SideBase team="BLUE" />
      <SideBase team="RED" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {Object.values(LANES).map((d) => <path key={d} d={d} stroke={RIFT.lane} strokeWidth="4.6" />)}
        {Object.values(LANES).map((d) => <path key={"h" + d} d={d} stroke={RIFT.laneHi} strokeWidth="2" opacity=".5" />)}
      </g>

      <Side team="BLUE" />
      <Side team="RED" />

      <circle cx="50" cy="50" r="10" fill="url(#rift-heat)" />
      {animated && <MinionWaves />}
    </g>
  );
}

// --- posizioni dei giocatori (dallo screenshot di riferimento) --------------
export const ROLES = [
  { key: "T", name: "Top" },
  { key: "J", name: "Jungle" },
  { key: "M", name: "Mid" },
  { key: "A", name: "ADC" },
  { key: "S", name: "Support" },
];

export const POSITIONS = [
  { team: "BLUE", role: "T", x: 13.6, y: 18.3 },
  { team: "RED", role: "T", x: 17.2, y: 15.1 },
  { team: "BLUE", role: "J", x: 23.1, y: 47.1 },
  { team: "RED", role: "J", x: 77.6, y: 53.7 },
  { team: "BLUE", role: "M", x: 47.6, y: 53.8 },
  { team: "RED", role: "M", x: 53.3, y: 48.0 },
  { team: "BLUE", role: "A", x: 78.1, y: 85.2 },
  { team: "RED", role: "A", x: 82.6, y: 80.6 },
  { team: "BLUE", role: "S", x: 81.7, y: 91.9 },
  { team: "RED", role: "S", x: 88.6, y: 83.4 },
];

const VISION = [
  { x: 15.5, y: 17, r: 8 }, { x: 23, y: 47, r: 8 }, { x: 50.5, y: 51, r: 8.5 },
  { x: 77.5, y: 53.5, r: 7.5 }, { x: 82.5, y: 85, r: 10.5 },
];

export function RiftPositions({ highlight, animated = true, onRole }) {
  return (
    <g>
      {VISION.map((v, i) => (
        <circle key={i} cx={v.x} cy={v.y} r={v.r} fill="#5aa9ff" fillOpacity=".09" stroke="#9ccaff" strokeOpacity=".2" strokeWidth=".3"
          style={animated ? { transformBox: "fill-box", transformOrigin: "center", animation: `rhVision ${4 + i * 0.6}s ease-in-out ${i * -0.8}s infinite` } : undefined} />
      ))}
      {POSITIONS.map((p, i) => {
        const c = SIDE[p.team];
        const dim = highlight && highlight !== p.role;
        const on = highlight === p.role;
        return (
          <g key={p.team + p.role} transform={`translate(${p.x} ${p.y})`}
            style={{ opacity: dim ? 0.22 : 1, transition: "opacity 300ms", cursor: onRole ? "pointer" : undefined }}
            onMouseEnter={onRole ? () => onRole(p.role) : undefined}
            onMouseLeave={onRole ? () => onRole(null) : undefined}>
            <g style={animated ? { animation: `rhDrift${i % 3} ${5 + (i % 4)}s ease-in-out ${-i * 0.7}s infinite alternate` } : undefined}>
              {on && <circle r="2.6" fill="none" stroke={c} strokeWidth=".35" style={{ transformBox: "fill-box", transformOrigin: "center", animation: "rhPing 1.4s ease-out infinite" }} />}
              <circle r="2.8" fill={c} opacity=".22" />
              <circle r="2.15" fill={c} stroke="#fff" strokeOpacity={on ? 0.95 : 0.35} strokeWidth=".25" />
              <text y=".95" textAnchor="middle" fontSize="2.7" fontWeight="800" fill={p.team === "BLUE" ? "#06121f" : "#1a0a02"}
                style={{ fontFamily: "var(--font-display, sans-serif)", pointerEvents: "none" }}>{p.role}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function LiveRift({ highlight, onRole, className, style, showPositions = true }) {
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} role="img"
      aria-label="Mappa stilizzata di Summoner's Rift con le posizioni dei dieci giocatori">
      <style>{`
        @keyframes rhDrift0 { from { transform: translate(-.5px,.3px) } to { transform: translate(.6px,-.4px) } }
        @keyframes rhDrift1 { from { transform: translate(.4px,.5px) } to { transform: translate(-.5px,-.3px) } }
        @keyframes rhDrift2 { from { transform: translate(0,-.5px) } to { transform: translate(.3px,.6px) } }
      `}</style>
      <RiftMap animated />
      {showPositions && <RiftPositions highlight={highlight} onRole={onRole} />}
    </svg>
  );
}
