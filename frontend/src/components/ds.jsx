// Gaming Design System components, ported from the Claude Design bundle (GamingDesignSystem_a5ff6c).
import {
  ArrowUpRight, Calendar, Check, ChevronLeft, ChevronRight, Clapperboard, Gamepad2, GraduationCap, Layers, Lock, Mail, Map,
  MessageSquareMore, Play, Search, Swords, Trophy, Users, X,
} from "lucide-react";
import { useEffect, useState } from "react";

const ICONS = {
  "arrow-up-right": ArrowUpRight, calendar: Calendar, check: Check, "chevron-left": ChevronLeft, "chevron-right": ChevronRight,
  clapperboard: Clapperboard, "gamepad-2": Gamepad2, "graduation-cap": GraduationCap, layers: Layers, lock: Lock, mail: Mail,
  map: Map, "message-square-more": MessageSquareMore, play: Play, search: Search, swords: Swords, trophy: Trophy, users: Users, x: X,
};

const label = { fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "var(--ls-label)" };
const ease = "all var(--dur-base) var(--ease-out)";

function useHover() {
  const [h, setH] = useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) }];
}

export function Icon({ name, size = 20, color = "currentColor", style }) {
  const C = ICONS[name];
  return C ? <C aria-hidden="true" size={size} color={color} strokeWidth={2} style={{ flex: "none", ...style }} /> : null;
}

const BADGE = {
  cyan: ["var(--cyan-500)", "rgba(61,191,235,.16)", "var(--cyan-200)"],
  magenta: ["var(--magenta-500)", "rgba(194,59,212,.18)", "var(--magenta-400)"],
  gold: ["var(--gold-500)", "rgba(224,164,58,.18)", "var(--gold-300)"],
};

export function Badge({ tone = "cyan", dot, children }) {
  const [solid, soft, fg] = BADGE[tone] || BADGE.cyan;
  return (
    <span style={{ ...label, display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 10px", borderRadius: "var(--radius-pill)", fontSize: 10, background: soft, color: fg, border: "1px solid " + soft, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: solid, boxShadow: "0 0 8px " + solid }} />}
      {children}
    </span>
  );
}

const SIZES = { sm: { h: 36, px: 18, fs: 11, c: 26, ic: 12 }, md: { h: 48, px: 28, fs: 12, c: 34, ic: 14 }, lg: { h: 60, px: 36, fs: 13, c: 44, ic: 18 } };

export function Button({ variant = "primary", size = "md", trailingIcon, disabled, fullWidth, children, style, ...rest }) {
  const [h, hover] = useHover();
  const [p, setP] = useState(false);
  const s = SIZES[size];
  const circle = variant === "primary" && trailingIcon;
  const v = variant === "primary"
    ? {
      background: "var(--grad-cta)", color: "var(--ink-0)", border: "1px solid rgba(255,255,255,.35)",
      boxShadow: h ? "0 10px 36px rgba(61,191,235,.65),inset 0 1px 0 rgba(255,255,255,.6)" : "var(--glow-cta)",
      textShadow: "0 1px 6px rgba(20,40,110,.45)", filter: h ? "brightness(1.06)" : "none",
    }
    : { background: h ? "rgba(255,255,255,.08)" : "transparent", color: "var(--ink-0)", border: "1px solid " + (h ? "var(--ink-0)" : "var(--border-strong)") };
  return (
    <button
      {...rest} {...hover} disabled={disabled}
      onMouseDown={() => setP(true)} onMouseUp={() => setP(false)}
      style={{
        ...label, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 12, height: s.h,
        padding: circle ? `0 ${(s.h - s.c) / 2}px 0 ${s.px}px` : `0 ${s.px}px`, width: fullWidth ? "100%" : undefined,
        borderRadius: "var(--radius-pill)", fontSize: s.fs, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
        transform: p && !disabled ? "scale(.97)" : "none", transition: ease, whiteSpace: "nowrap", ...v, ...style,
      }}
    >
      <span style={{ padding: circle ? `0 ${s.px * 0.6}px` : 0 }}>{children}</span>
      {trailingIcon && (circle ? (
        <span style={{ width: s.c, height: s.c, borderRadius: "50%", background: "var(--ink-0)", display: "grid", placeItems: "center", boxShadow: "0 2px 8px rgba(20,40,110,.35)" }}>
          <Icon name={trailingIcon} size={s.ic} color="var(--blue-500)" style={{ marginLeft: trailingIcon === "play" ? 2 : 0 }} />
        </span>
      ) : <Icon name={trailingIcon} size={s.ic + 2} />)}
    </button>
  );
}

export function IconButton({ icon, size = 40, variant = "glass", label: aria, style, ...rest }) {
  const [h, hover] = useHover();
  const v = variant === "glass"
    ? { background: h ? "var(--surface-hover)" : "var(--surface-glass)", border: "1px solid var(--border-subtle)", backdropFilter: "var(--blur-glass)" }
    : { background: h ? "var(--surface-raised)" : "transparent", border: "1px solid transparent" };
  return (
    <button {...rest} {...hover} type="button" aria-label={aria} title={aria}
      style={{ width: size, height: size, borderRadius: "50%", display: "inline-grid", placeItems: "center", cursor: "pointer", color: h ? "var(--ink-0)" : "var(--ink-200)", transition: ease, padding: 0, ...v, ...style }}>
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}

export function Input({ label: text, icon, error, ...rest }) {
  const [f, setF] = useState(false);
  const bc = error ? "var(--red-500)" : f ? "var(--cyan-400)" : "var(--border-subtle)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ ...label, fontSize: 10, color: "var(--text-muted)" }}>{text}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 18px", borderRadius: "var(--radius-md)", background: "var(--surface-input)", border: "1px solid " + bc, boxShadow: f && !error ? "0 0 0 3px rgba(61,191,235,.18)" : "none", transition: ease }}>
        {icon && <Icon name={icon} size={18} color="var(--ink-300)" />}
        <input {...rest} onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15, color: "var(--text-primary)" }} />
      </span>
      {error && <span role="alert" style={{ fontSize: 12, fontWeight: 500, color: "var(--red-500)" }}>{error}</span>}
    </label>
  );
}

function RailItem({ item, onSelect }) {
  const [h, hover] = useHover();
  return (
    <button {...hover} type="button" title={item.label} aria-label={item.label} onClick={() => onSelect(item)}
      style={{ position: "relative", width: 44, height: 44, display: "grid", placeItems: "center", background: "transparent", border: "none", cursor: "pointer", padding: 0, color: item.active ? "var(--cyan-400)" : h ? "var(--ink-0)" : "var(--ink-300)", filter: item.active ? "drop-shadow(0 0 6px rgba(61,191,235,.8))" : "none", transition: "color var(--dur-fast) var(--ease-out)" }}>
      <Icon name={item.icon} size={20} />
      {item.active && <span style={{ position: "absolute", left: -14, top: 12, width: 3, height: 20, borderRadius: 2, background: "var(--cyan-400)" }} />}
    </button>
  );
}

export function SideRail({ items, onSelect }) {
  return (
    <aside style={{ width: "var(--rail-width)", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {items.map((i) => <RailItem key={i.label} item={i} onSelect={onSelect} />)}
    </aside>
  );
}

function NavLink({ item, onSelect }) {
  const [h, hover] = useHover();
  const lit = item.active || h;
  return (
    <a {...hover} href="#" onClick={(e) => { e.preventDefault(); onSelect(item); }}
      style={{ ...label, position: "relative", fontSize: 11, color: lit ? "var(--ink-0)" : "var(--ink-100)", opacity: lit ? 1 : 0.8, textShadow: item.active ? "var(--text-glow)" : "none", padding: "8px 0", transition: "all var(--dur-fast) var(--ease-out)" }}>
      {item.label}
      {item.active && <span style={{ position: "absolute", left: "50%", bottom: -4, width: 4, height: 4, marginLeft: -2, borderRadius: "50%", background: "var(--cyan-400)", boxShadow: "0 0 8px var(--cyan-400)" }} />}
    </a>
  );
}

export function TopNav({ brand, links, onSelect, actions }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 56, height: "var(--nav-height)", padding: "0 40px 0 0" }}>
      <div style={{ width: "var(--rail-width)", display: "grid", placeItems: "center", flex: "none", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 14, letterSpacing: ".04em", color: "var(--ink-0)" }}>{brand}</div>
      <div style={{ display: "flex", gap: 44, flex: 1 }}>
        {links.map((l) => <NavLink key={l.label} item={l} onSelect={onSelect} />)}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{actions}</div>
    </nav>
  );
}

export function Card({ padding = 24, interactive, glow, children, onClick }) {
  const [h, hover] = useHover();
  const lit = glow || (interactive && h);
  return (
    <div {...hover} onClick={onClick}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
      style={{ padding, borderRadius: "var(--radius-lg)", background: "var(--surface-glass)", backdropFilter: "var(--blur-glass)", border: "1px solid " + (lit ? "rgba(111,214,246,.55)" : "var(--border-subtle)"), boxShadow: lit ? "var(--shadow-card),0 0 24px rgba(61,191,235,.25)" : "var(--shadow-card)", transform: interactive && h ? "translateY(-4px)" : "none", cursor: interactive ? "pointer" : "default", transition: ease, color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

export function Dialog({ open, title, eyebrow, children, actions, onClose, width = 440 }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(8,6,24,.6)", backdropFilter: "blur(6px)" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "calc(100% - 32px)", padding: 32, borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-frame),0 0 60px rgba(84,34,115,.6)", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: 20 }}>
        <IconButton icon="x" label="Chiudi" size={36} variant="ghost" onClick={onClose} style={{ position: "absolute", top: 16, right: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {eyebrow && <span style={{ ...label, fontSize: 10, color: "var(--cyan-400)" }}>{eyebrow}</span>}
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 28, lineHeight: 1.1, textTransform: "uppercase", color: "inherit" }}>{title}</h2>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" }}>{children}</div>
        {actions && <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>{actions}</div>}
      </div>
    </div>
  );
}

const TINT = { magenta: "var(--grad-tint-magenta)", cyan: "var(--grad-tint-cyan)", violet: "var(--grad-tint-violet)", gold: "var(--grad-tint-gold)" };

export function HeroCard({ name, title, tint = "violet", active, width = 270, height = 190, onClick }) {
  const [h, hover] = useHover();
  const lit = active || h;
  return (
    <button {...hover} type="button" onClick={onClick}
      style={{ position: "relative", width, height, flex: "none", padding: 0, borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "pointer", textAlign: "left", background: TINT[tint], border: "1px solid " + (lit ? "rgba(127,227,255,.75)" : "rgba(255,255,255,.16)"), boxShadow: lit ? "0 0 0 1px rgba(127,227,255,.35),0 0 28px rgba(61,191,235,.45),var(--shadow-card)" : "var(--shadow-card)", transform: h ? "translateY(-4px)" : "none", transition: ease }}>
      <span style={{ position: "absolute", inset: 0, background: "var(--grad-scrim-bottom)" }} />
      <span style={{ position: "absolute", left: 18, bottom: 16, right: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 19, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-0)" }}>{name}</span>
        {title && <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 12, color: "var(--ink-100)" }}>{title}</span>}
      </span>
    </button>
  );
}
