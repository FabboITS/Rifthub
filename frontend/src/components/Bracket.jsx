const W = 210;
const H = 62;
const GAP_X = 56;
const SLOT_H = 84;

function TeamRow({ team, score, winner }) {
  return (
    <div className={`flex items-center justify-between px-2 text-xs ${winner ? "font-bold text-gold-light" : "text-slate-300"}`}>
      <span className="truncate">{team ? team.name : <i className="text-slate-500">da definire</i>}</span>
      <span className="ml-2 w-4 text-right">{score ?? ""}</span>
    </div>
  );
}

/** Single-elimination bracket: absolute layout + SVG elbow connectors. */
export default function Bracket({ matches, onMatchClick }) {
  const rounds = Math.max(...matches.map((m) => m.round));
  const first = matches.filter((m) => m.round === 1).length;
  const height = first * SLOT_H;
  const pos = (m) => {
    const count = first / 2 ** (m.round - 1);
    const x = (m.round - 1) * (W + GAP_X);
    const y = (height / count) * (m.position + 0.5) - H / 2;
    return { x, y };
  };
  const byId = Object.fromEntries(matches.map((m) => [m.id, m]));
  const roundName = (r) => (r === rounds ? "Finale" : r === rounds - 1 ? "Semifinali" : `Round ${r}`);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="mb-2 flex" style={{ gap: GAP_X }}>
        {Array.from({ length: rounds }, (_, i) => (
          <p key={i} className="text-center text-xs font-semibold uppercase text-gold" style={{ width: W }}>{roundName(i + 1)}</p>
        ))}
      </div>
      <div className="relative" style={{ width: rounds * (W + GAP_X), height }}>
        <svg className="absolute inset-0" width={rounds * (W + GAP_X)} height={height}>
          {matches.filter((m) => m.next_match && byId[m.next_match]).map((m) => {
            const a = pos(m);
            const b = pos(byId[m.next_match]);
            const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = x1 + GAP_X / 2;
            return <path key={m.id} d={`M${x1},${y1} H${mx} V${y2} H${x2}`} fill="none"
              stroke={m.winner ? "#e0a43a" : "#4a4370"} strokeWidth="2" />;
          })}
        </svg>
        {matches.map((m) => {
          const { x, y } = pos(m);
          const bye = m.round === 1 && (!m.team_a || !m.team_b);
          const playable = m.team_a && m.team_b && !m.winner;
          return (
            <button key={m.id} type="button" disabled={!playable || !onMatchClick}
              onClick={() => onMatchClick?.(m)}
              className={`absolute flex flex-col justify-center gap-1 rounded-lg border bg-slate-800 py-1 text-left transition ${
                playable && onMatchClick ? "border-hex/60 hover:bg-slate-700" : "border-slate-700"} ${bye ? "opacity-50" : ""}`}
              style={{ left: x, top: y, width: W, height: H }}>
              <TeamRow team={m.team_a} score={m.score_a} winner={m.winner && m.winner.id === m.team_a?.id} />
              <div className="border-t border-slate-700" />
              <TeamRow team={m.team_b} score={m.score_b} winner={m.winner && m.winner.id === m.team_b?.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
