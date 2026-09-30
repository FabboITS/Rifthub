import { useState } from "react";
import { useChampions } from "../lib/hooks";

const PALETTE = ["#0ac8b9", "#c8aa6e", "#a78bfa", "#f87171", "#34d399", "#60a5fa", "#fbbf24"];

export function championColor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Data Dragon icon with a coloured-initial fallback (offline / unknown champion). */
export default function ChampionIcon({ name, size = 32 }) {
  const { data } = useChampions();
  const [failed, setFailed] = useState(false);
  const champ = data?.champions?.find((c) => c.id === name || c.name === name);
  const style = { width: size, height: size };
  if (!champ || failed) {
    return (
      <span
        title={name}
        style={{ ...style, background: championColor(name), fontSize: size * 0.45 }}
        className="inline-flex items-center justify-center rounded-full font-bold text-slate-900"
      >
        {(name || "?")[0]}
      </span>
    );
  }
  return (
    <img src={champ.icon} alt={champ.name} title={champ.name} style={style}
      className="rounded-full border border-gold/40" onError={() => setFailed(true)} />
  );
}
