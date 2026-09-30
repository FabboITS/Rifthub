import { Heart, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { prettyRank } from "../lib/format";
import ChampionIcon from "./ChampionIcon";
import { MiniRadar } from "./Radar";
import { Badge } from "./ui";

const THRESHOLD = 110;

function PlayerCardView({ card }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-hex-deep to-hex text-2xl font-bold text-slate-950">
          {card.avatar_url ? <img src={card.avatar_url} alt="" className="h-16 w-16 rounded-full" /> : card.nickname[0]}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold">{card.nickname}</h2>
          <p className="text-sm text-slate-400">{card.real_name || "—"}{card.age ? `, ${card.age} anni` : ""}</p>
        </div>
        {card.fit_score !== undefined && (
          <div className="ml-auto text-right">
            <p className="font-display text-2xl text-hex">{card.fit_score}</p>
            <p className="text-[10px] uppercase text-slate-400">fit</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge color="hex">{card.role}</Badge>
        <Badge color="gold">{prettyRank(card.rank)}</Badge>
        <Badge>{card.region}</Badge>
        {card.looking_for_team && <Badge color="green">Cerca team</Badge>}
      </div>
      <div className="mt-3 flex gap-1">{card.champion_pool.map((c) => <ChampionIcon key={c} name={c} size={30} />)}</div>
      <MiniRadar data={card.radar} />
      <p className="text-sm text-slate-300">{card.bio}</p>
    </>
  );
}

/** Tinder-style deck: drag, buttons or ←/→ keys. Calls onSwipe(card, "LIKE"|"PASS"). */
export default function SwipeDeck({ cards, onSwipe, disabled }) {
  const [drag, setDrag] = useState({ x: 0, active: false });
  const start = useRef(0);
  const top = cards[0];

  const swipe = useCallback((direction) => {
    if (!top || disabled) return;
    setDrag({ x: 0, active: false });
    onSwipe(top, direction);
  }, [top, disabled, onSwipe]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") swipe("LIKE");
      if (e.key === "ArrowLeft") swipe("PASS");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe]);

  if (!top) return <p className="p-8 text-center text-slate-400">Hai visto tutti i player disponibili 🎉</p>;

  const onDown = (e) => {
    start.current = e.clientX;
    setDrag({ x: 0, active: true });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => drag.active && setDrag({ x: e.clientX - start.current, active: true });
  const onUp = () => {
    if (drag.x > THRESHOLD) swipe("LIKE");
    else if (drag.x < -THRESHOLD) swipe("PASS");
    else setDrag({ x: 0, active: false });
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative h-[520px]">
        {cards[1] && <div className="card absolute inset-0 translate-y-3 scale-95 opacity-50" aria-hidden />}
        <article
          data-testid="swipe-card"
          className="card absolute inset-0 cursor-grab touch-none select-none overflow-hidden border-gold/30 active:cursor-grabbing"
          style={{
            transform: `translateX(${drag.x}px) rotate(${drag.x / 18}deg)`,
            transition: drag.active ? "none" : "transform 0.25s",
          }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        >
          {drag.x > 40 && <span className="absolute right-4 top-4 rotate-12 rounded border-2 border-emerald-400 px-2 font-bold text-emerald-400">LIKE</span>}
          {drag.x < -40 && <span className="absolute left-4 top-4 -rotate-12 rounded border-2 border-rose-400 px-2 font-bold text-rose-400">PASS</span>}
          <PlayerCardView card={top} />
        </article>
      </div>
      <div className="mt-6 flex justify-center gap-8">
        <button className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400 text-rose-400 transition hover:bg-rose-400/10"
          onClick={() => swipe("PASS")} disabled={disabled} aria-label="Scarta">
          <X className="h-8 w-8" />
        </button>
        <button className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400 text-emerald-400 transition hover:bg-emerald-400/10"
          onClick={() => swipe("LIKE")} disabled={disabled} aria-label="Mi piace">
          <Heart className="h-8 w-8" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Trascina la card o usa le frecce ← →</p>
    </div>
  );
}
