import { useState } from "react";
import { useChampions } from "../lib/hooks";

const PALETTE = ["var(--grad-tint-cyan)", "var(--grad-tint-gold)", "var(--grad-tint-violet)", "var(--grad-tint-magenta)"];

export function championColor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// "Kai'Sa", "kaisa", "KaiSa" and "Wukong"/"MonkeyKing" all resolve to the same champion.
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findChampion(champions, name) {
  const n = norm(name);
  return champions?.find((c) => norm(c.id) === n || norm(c.name) === n);
}

/** Data Dragon icon with a coloured-initial fallback (offline / unknown champion). */
export default function ChampionIcon({ name, size = 32 }) {
  const { data } = useChampions();
  const champ = findChampion(data?.champions, name);
  // Remember the failed URL, not a flag: a reused instance showing another champion must retry.
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = failedSrc === champ?.icon;
  const style = { width: size, height: size };
  if (!champ?.icon || failed) {
    return (
      <span
        title={name}
        style={{ ...style, background: championColor(name), fontSize: size * 0.45 }}
        className="inline-flex items-center justify-center rounded-[10px] border border-white/15 font-extrabold text-white"
      >
        {(name || "?")[0]}
      </span>
    );
  }
  return (
    <img src={champ.icon} alt={champ.name} title={champ.name} style={style} loading="lazy" decoding="async"
      draggable={false} className="rounded-[10px] border border-white/15" onError={() => setFailedSrc(champ.icon)} />
  );
}
