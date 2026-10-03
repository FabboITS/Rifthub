const W = 210;
const H = 64;
const GAP_X = 56;
const SLOT_H = 88;
const k = (ms) => `calc(var(--rh-k) * ${ms}ms)`;

function TeamRow({ team, score, winner }) {
  return (
    <span className="flex justify-between px-3 text-xs" style={{ fontWeight: winner ? 800 : 600, color: winner ? "var(--gold-300)" : team ? "var(--ink-200)" : "var(--ink-500)" }}>
      <span className="truncate">{team ? team.name : "da definire"}</span>
      <span className="rh-mono ml-2">{score ?? ""}</span>
    </span>
  );
}

/** Single-elimination bracket: absolute layout + animated SVG elbow connectors; playable matches pulse. */
export default function Bracket({ matches, onMatchClick }) {
  const rounds = Math.max(...matches.map((m) => m.round));
  const first = matches.filter((m) => m.round === 1).length;
  const height = first * SLOT_H;
  const width = rounds * W + (rounds - 1) * GAP_X;
  const pos = (m) => {
    const count = first / 2 ** (m.round - 1);
    return { x: (m.round - 1) * (W + GAP_X), y: (height / count) * (m.position + 0.5) - H / 2 };
  };
  const byId = Object.fromEntries(matches.map((m) => [m.id, m]));
  const roundName = (r) => (r === rounds ? "Finale" : r === rounds - 1 ? "Semifinali" : r === rounds - 2 ? "Quarti" : `Round ${r}`);
  const linked = matches.filter((m) => m.next_match && byId[m.next_match]);
  const path = (m) => {
    const a = pos(m), b = pos(byId[m.next_match]);
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = x1 + GAP_X / 2;
    return `M${x1},${y1} H${mx} V${y2} H${x2}`;
  };

  return (
    <div className="overflow-x-auto pb-1.5">
      <div className="mb-2.5 flex" style={{ gap: GAP_X, width }}>
        {Array.from({ length: rounds }, (_, i) => (
          <span key={i} className="flex-none text-center text-[13px] font-semibold text-gold" style={{ width: W }}>{roundName(i + 1)}</span>
        ))}
      </div>
      <div className="relative" style={{ width, height }}>
        <svg className="absolute inset-0 overflow-visible" width={width} height={height}>
          {linked.map((m) => (
            <path key={m.id} d={path(m)} pathLength="1" fill="none" stroke="#3a3456" strokeWidth="2"
              style={{ strokeDasharray: 1, animation: `rhDraw ${k(700)} var(--ease-out) ${k(300 + m.round * 150)} both` }} />
          ))}
          {linked.filter((m) => m.winner).map((m) => (
            <path key={`g${m.id}`} d={path(m)} pathLength="1" fill="none" stroke="#ffb547" strokeWidth="2"
              style={{ strokeDasharray: 1, filter: "drop-shadow(0 0 5px rgba(255,181,71,.7))", animation: `rhDraw ${k(800)} var(--ease-out) ${k(500)} both` }} />
          ))}
        </svg>
        {matches.map((m) => {
          const { x, y } = pos(m);
          const bye = m.round === 1 && (!m.team_a || !m.team_b);
          const playable = !!(m.team_a && m.team_b && !m.winner && onMatchClick);
          const enter = `rhUp ${k(520)} var(--ease-out) ${k(200 + m.round * 120)} both`;
          return (
            <button key={m.id} type="button" disabled={!playable} onClick={() => onMatchClick(m)}
              className="absolute flex flex-col justify-center gap-1 rounded-xl border py-1.5 text-left transition-colors enabled:cursor-pointer enabled:hover:bg-[rgba(36,31,94,.95)]"
              style={{ left: x, top: y, width: W, height: H, background: "rgba(22,17,15,.9)", borderColor: playable ? "rgba(255,150,80,.6)" : "var(--border-subtle)", opacity: bye ? 0.5 : 1, animation: playable ? `rhPulse 2.4s ease-in-out infinite, ${enter}` : enter }}>
              <TeamRow team={m.team_a} score={m.score_a} winner={m.winner && m.winner.id === m.team_a?.id} />
              <span className="h-px bg-white/10" />
              <TeamRow team={m.team_b} score={m.score_b} winner={m.winner && m.winner.id === m.team_b?.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
