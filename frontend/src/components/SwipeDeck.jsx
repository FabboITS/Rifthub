import { useCallback, useEffect, useRef, useState } from "react";
import { prettyRank } from "../lib/format";
import ChampionIcon from "./ChampionIcon";
import { Badge, Icon } from "./ds";
import { MiniRadar } from "./Radar";

const THRESHOLD = 110;
const FLY = { LIKE: "translateX(140%) rotate(26deg)", PASS: "translateX(-140%) rotate(-26deg)" };

function PlayerCardView({ card, drag }) {
  return (
    <>
      <span className="absolute right-[18px] top-[18px] rotate-12 rounded-lg border-2 px-2.5 text-lg font-black tracking-[.1em]"
        style={{ borderColor: "var(--green-500)", color: "var(--green-500)", opacity: Math.max(0, Math.min(1, drag / 90)) }}>LIKE</span>
      <span className="absolute left-[18px] top-[18px] -rotate-12 rounded-lg border-2 px-2.5 text-lg font-black tracking-[.1em]"
        style={{ borderColor: "var(--red-500)", color: "var(--red-500)", opacity: Math.max(0, Math.min(1, -drag / 90)) }}>PASS</span>
      <div className="flex items-center gap-3.5">
        <span className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-full border border-hex text-[26px] font-black"
          style={{ background: "var(--grad-tint-cyan)", boxShadow: "0 0 18px rgba(255,107,26,.4)" }}>
          {card.avatar_url ? <img src={card.avatar_url} alt="" className="h-16 w-16" draggable={false} /> : card.nickname[0]}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="m-0 truncate font-display text-[34px] font-black leading-none">{card.nickname}</h2>
          <span className="text-[13px] text-slate-400">{card.real_name || "—"}{card.age ? `, ${card.age} anni` : ""}</span>
        </div>
        {card.fit_score !== undefined && (
          <div className="ml-auto text-right">
            <div className="rh-mono text-[26px] font-bold leading-none text-hex" style={{ textShadow: "var(--text-glow)" }}>{card.fit_score}</div>
            <div className="text-[13px] font-semibold text-slate-500">fit</div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="cyan">{card.role}</Badge>
        <Badge tone="gold">{prettyRank(card.rank)}</Badge>
        <Badge tone="neutral">{card.region}</Badge>
        {card.looking_for_team && <Badge tone="success">Cerca team</Badge>}
      </div>
      <div className="flex gap-2">{card.champion_pool.map((c) => <ChampionIcon key={c} name={c} size={34} />)}</div>
      <MiniRadar data={card.radar} />
      <p className="m-0 text-sm leading-relaxed text-slate-300">{card.bio}</p>
    </>
  );
}

const cardClass = "absolute inset-0 flex select-none flex-col gap-3.5 overflow-hidden rounded-[20px] border p-[22px] touch-none";
const cardStyle = { borderColor: "rgba(255,181,71,.3)", background: "rgba(22,17,15,.82)", backdropFilter: "var(--blur-glass)", boxShadow: "var(--shadow-card),0 0 40px rgba(92,34,8,.5)" };

/** Tinder-style deck: drag, buttons or ←/→ keys. Calls onSwipe(card, "LIKE"|"PASS") right away; the card flies out on its own. */
export default function SwipeDeck({ cards, onSwipe, disabled }) {
  const [drag, setDrag] = useState({ x: 0, active: false });
  const [fly, setFly] = useState(null); // { card, dir, x } — a ghost of the swiped card animating out
  const start = useRef(0);
  const top = cards[0];

  const swipe = useCallback((direction, x = 0) => {
    if (!top || disabled) return;
    setFly({ card: top, dir: direction, x });
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

  const onDown = (e) => {
    start.current = e.clientX;
    setDrag({ x: 0, active: true });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => drag.active && setDrag({ x: e.clientX - start.current, active: true });
  const onUp = () => {
    if (drag.x > THRESHOLD) swipe("LIKE", drag.x);
    else if (drag.x < -THRESHOLD) swipe("PASS", drag.x);
    else setDrag({ x: 0, active: false });
  };
  const prog = Math.min(1, Math.abs(drag.x) / THRESHOLD);

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {top ? (
        <>
          <div className="relative h-[540px] w-full max-w-[380px]">
            {cards[1] && <div aria-hidden className="card absolute inset-0" style={{ transform: `translateY(${14 * (1 - prog)}px) scale(${0.94 + 0.06 * prog})`, opacity: 0.5 + 0.5 * prog, transition: "transform 120ms linear, opacity 120ms" }} />}
            <article key={top.id} data-testid="swipe-card" className={`${cardClass} ${drag.active ? "cursor-grabbing" : "cursor-grab"}`}
              style={{ ...cardStyle, transform: `translateX(${drag.x}px) rotate(${drag.x / 18}deg)`, transition: drag.active ? "none" : "transform calc(var(--rh-k) * 450ms) var(--ease-out)" }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <PlayerCardView card={top} drag={drag.x} />
            </article>
            {fly && (
              <article key={`fly-${fly.card.id}`} aria-hidden className={`${cardClass} pointer-events-none`} onAnimationEnd={() => setFly(null)}
                style={{ ...cardStyle, "--from": `translateX(${fly.x}px) rotate(${fly.x / 18}deg)`, "--to": FLY[fly.dir], animation: "rhFly calc(var(--rh-k) * 380ms) cubic-bezier(.4,0,.7,1) both" }}>
                <PlayerCardView card={fly.card} drag={fly.dir === "LIKE" ? 90 : -90} />
              </article>
            )}
          </div>
          <div className="flex gap-7">
            <button type="button" onClick={() => swipe("PASS")} disabled={disabled} aria-label="Scarta"
              className="grid h-16 w-16 cursor-pointer place-items-center rounded-full border-2 transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(255,75,62,.16)] hover:shadow-[0_0_22px_rgba(255,75,62,.45)] active:scale-[.92]"
              style={{ borderColor: "var(--red-500)", background: "rgba(255,75,62,.06)", color: "var(--red-500)" }}>
              <Icon name="x" size={28} />
            </button>
            <button type="button" onClick={() => swipe("LIKE")} disabled={disabled} aria-label="Mi piace"
              className="grid h-16 w-16 cursor-pointer place-items-center rounded-full border-2 transition duration-200 hover:-translate-y-0.5 hover:bg-[rgba(111,217,155,.16)] hover:shadow-[0_0_22px_rgba(111,217,155,.45)] active:scale-[.92]"
              style={{ borderColor: "var(--green-500)", background: "rgba(111,217,155,.06)", color: "var(--green-500)" }}>
              <Icon name="heart" size={28} />
            </button>
          </div>
          <span className="text-xs text-slate-500">Trascina la card o usa le frecce sinistra e destra · {cards.length} profili</span>
        </>
      ) : (
        <div className="flex h-[300px] w-full max-w-[380px] flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-white/10"
          style={{ animation: "rhScale calc(var(--rh-k) * 420ms) var(--ease-out) both" }}>
          <span className="text-[15px] text-slate-400">Hai visto tutti i player disponibili.</span>
        </div>
      )}
    </div>
  );
}
