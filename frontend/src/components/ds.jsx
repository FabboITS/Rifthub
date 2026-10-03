// RiftHub "Forge" design system: componenti base. Stili inline basati sui token di styles/ds.css.
import {
  ArrowUpRight, BookOpen, Bot, Calendar, Check, ChevronLeft, ChevronRight, CircleX, Clapperboard, ClipboardList, Crosshair,
  ExternalLink, Gamepad2, GraduationCap, Grid3x3, Hash, Heart, Info, Layers, LayoutDashboard, Lock, LogOut, Mail, Map, Menu,
  MessageCircle, MessageSquareMore, Play, Plus, Search, Sparkles, Swords, Target, Trash2, TriangleAlert, Trophy, User, Users,
  Video, Wand2, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import RiftBackground from "./RiftBackground";

const ICONS = {
  "arrow-up-right": ArrowUpRight, "book-open": BookOpen, bot: Bot, calendar: Calendar, check: Check, "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight, "circle-x": CircleX, clapperboard: Clapperboard, "clipboard-list": ClipboardList, crosshair: Crosshair,
  "external-link": ExternalLink, "gamepad-2": Gamepad2, "graduation-cap": GraduationCap, "grid-3x3": Grid3x3, hash: Hash, heart: Heart,
  info: Info, layers: Layers, "layout-dashboard": LayoutDashboard, lock: Lock, "log-out": LogOut, mail: Mail, map: Map, menu: Menu,
  "message-circle": MessageCircle, "message-square-more": MessageSquareMore, play: Play, plus: Plus, search: Search, sparkles: Sparkles,
  swords: Swords, target: Target, "trash-2": Trash2, "triangle-alert": TriangleAlert, trophy: Trophy, user: User, users: Users,
  video: Video, "wand-2": Wand2, x: X,
};

const ease = "all var(--dur-base) var(--ease-out)";

function useHover() {
  const [h, setH] = useState(false);
  return [h, { onMouseEnter: () => setH(true), onMouseLeave: () => setH(false) }];
}

export function Icon({ name, size = 20, color = "currentColor", style }) {
  const C = ICONS[name];
  return C ? <C aria-hidden="true" size={size} color={color} strokeWidth={2} style={{ flex: "none", ...style }} /> : null;
}

// [colore pieno, sfondo tenue, testo]
const BADGE = {
  forge: ["var(--forge)", "rgba(255,107,26,.14)", "#ffa66b"],
  cyan: ["var(--forge)", "rgba(255,107,26,.14)", "#ffa66b"],
  gold: ["var(--molten)", "rgba(255,181,71,.14)", "var(--molten)"],
  magenta: ["#ff5a36", "rgba(255,90,54,.15)", "#ff9a7c"],
  ice: ["var(--ice)", "rgba(90,169,255,.14)", "#9ccaff"],
  success: ["var(--ok)", "rgba(111,217,155,.13)", "var(--ok)"],
  danger: ["var(--danger)", "rgba(255,75,62,.15)", "#ff8f85"],
  warning: ["var(--warn)", "rgba(255,194,74,.14)", "var(--warn)"],
  neutral: ["var(--smoke)", "rgba(255,230,210,.06)", "var(--sand)"],
};

export function Badge({ tone = "forge", dot, children }) {
  const [solid, soft, fg] = BADGE[tone] || BADGE.forge;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 9px", borderRadius: "var(--radius-xs)", font: "600 12.5px/1 var(--font-body)", background: soft, color: fg, boxShadow: `inset 2px 0 0 ${solid}`, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: solid, boxShadow: "0 0 8px " + solid }} />}
      {children}
    </span>
  );
}

const SIZES = { sm: { h: 38, px: 15, fs: 17, ic: 15 }, md: { h: 46, px: 22, fs: 17, ic: 17 }, lg: { h: 56, px: 28, fs: 20, ic: 19 } };

export function Button({ variant = "primary", size = "md", trailingIcon, disabled, fullWidth, children, style, ...rest }) {
  const [h, hover] = useHover();
  const s = SIZES[size];
  const primary = variant === "primary";
  const v = primary
    ? { background: "var(--grad-cta)", color: "#1a0a02", border: "1px solid rgba(255,190,140,.5)", boxShadow: h ? "0 14px 40px -8px rgba(255,107,26,.85), inset 0 1px 0 rgba(255,230,200,.5)" : "var(--glow-cta)" }
    : { background: h ? "rgba(255,107,26,.07)" : "transparent", color: h ? "var(--forge)" : "var(--bone)", border: "1px solid " + (h ? "var(--forge)" : "var(--border-strong)") };
  return (
    <button {...rest} {...hover} disabled={disabled} className="rh-press"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, height: s.h, padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : undefined, borderRadius: "var(--radius-sm)", font: `800 ${s.fs}px/1 var(--font-display)`, letterSpacing: ".02em",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: ease, whiteSpace: "nowrap", ...v, ...style,
      }}>
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={s.ic} style={{ transform: h ? "translateX(3px)" : "none", transition: ease }} />}
    </button>
  );
}

export function IconButton({ icon, size = 40, variant = "glass", label: aria, style, ...rest }) {
  const [h, hover] = useHover();
  const v = variant === "glass"
    ? { background: h ? "var(--cinder)" : "var(--surface-glass)", border: "1px solid " + (h ? "var(--border-hot)" : "var(--border-subtle)") }
    : { background: h ? "var(--surface-hover)" : "transparent", border: "1px solid transparent" };
  return (
    <button {...rest} {...hover} type="button" aria-label={aria} title={aria}
      style={{ width: size, height: size, borderRadius: "var(--radius-sm)", display: "inline-grid", placeItems: "center", cursor: "pointer", color: h ? "var(--forge)" : "var(--sand)", transition: ease, padding: 0, ...v, ...style }}>
      <Icon name={icon} size={Math.round(size * 0.45)} />
    </button>
  );
}

export function Input({ label: text, icon, error, ...rest }) {
  const [f, setF] = useState(false);
  const bc = error ? "var(--danger)" : f ? "var(--forge)" : "var(--border-subtle)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ font: "600 13px var(--font-body)", color: "var(--smoke)" }}>{text}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 14px", borderRadius: "var(--radius-md)", background: "var(--surface-input)", border: "1px solid " + bc, boxShadow: f && !error ? "0 0 0 3px rgba(255,107,26,.16)" : "none", transition: ease }}>
        {icon && <Icon name={icon} size={17} color={f ? "var(--forge)" : "var(--smoke)"} />}
        <input {...rest} onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", font: "500 15px var(--font-body)", color: "var(--text-primary)" }} />
      </span>
      {error && <span role="alert" style={{ font: "500 13px var(--font-body)", color: "#ff8f85" }}>{error}</span>}
    </label>
  );
}

export function Card({ padding = 22, interactive, glow, children, onClick, style }) {
  const [h, hover] = useHover();
  const lit = glow || (interactive && h);
  return (
    <div {...hover} onClick={onClick}
      role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) : undefined}
      style={{ position: "relative", padding, borderRadius: "var(--radius-lg)", background: "linear-gradient(180deg, rgba(34,26,22,.75), rgba(18,13,11,.8))", backdropFilter: "var(--blur-glass)", border: "1px solid " + (lit ? "var(--border-hot)" : "var(--border-subtle)"), boxShadow: lit ? "var(--shadow-card), 0 0 30px -6px rgba(255,107,26,.35)" : "var(--shadow-card)", transform: interactive && h ? "translateY(-3px)" : "none", cursor: interactive ? "pointer" : "default", transition: ease, color: "var(--text-primary)", ...style }}>
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
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(3,2,2,.7)", backdropFilter: "blur(6px)", animation: "rhFade 220ms both" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "calc(100% - 32px)", padding: 30, borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", borderTop: "2px solid var(--forge)", boxShadow: "var(--shadow-frame), 0 -20px 60px -30px rgba(255,107,26,.6)", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: 20, animation: "rhModalIn calc(var(--rh-k) * 420ms) var(--ease-out) both" }}>
        <IconButton icon="x" label="Chiudi" size={34} variant="ghost" onClick={onClose} style={{ position: "absolute", top: 14, right: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {eyebrow && <span style={{ font: "600 13px var(--font-body)", color: "var(--forge)" }}>{eyebrow}</span>}
          <h2 style={{ margin: 0, font: "900 34px/1 var(--font-display)", color: "inherit" }}>{title}</h2>
        </div>
        <div style={{ font: "400 15px/1.6 var(--font-body)", color: "var(--text-secondary)" }}>{children}</div>
        {actions && <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>{actions}</div>}
      </div>
    </div>
  );
}

export function Tag({ selected, icon, onClick, children, style }) {
  const [h, hover] = useHover();
  return (
    <button {...hover} type="button" onClick={onClick} aria-pressed={!!selected}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 13px", borderRadius: "var(--radius-sm)", font: "600 14px var(--font-body)", cursor: "pointer", color: selected ? "#1a0a02" : h ? "var(--bone)" : "var(--sand)", background: selected ? "var(--forge)" : h ? "var(--cinder)" : "var(--surface-raised)", border: "1px solid " + (selected ? "var(--forge)" : h ? "var(--border-strong)" : "var(--border-subtle)"), boxShadow: selected ? "0 6px 18px -6px rgba(255,107,26,.7)" : "none", transition: ease, ...style }}>
      {icon && <Icon name={icon} size={15} />}{children}
    </button>
  );
}

const TOAST = { info: ["var(--forge)", "info"], success: ["var(--ok)", "check"], warning: ["var(--warn)", "triangle-alert"], danger: ["var(--danger)", "circle-x"], reward: ["var(--molten)", "trophy"] };

export function Toast({ tone = "info", title, message, onClose, style }) {
  const [c, ic] = TOAST[tone] || TOAST.info;
  return (
    <div role="status" style={{ display: "flex", alignItems: "flex-start", gap: 12, width: 360, maxWidth: "100%", padding: "13px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", boxShadow: `inset 3px 0 0 ${c}, var(--shadow-card)`, color: "var(--text-primary)", ...style }}>
      <span style={{ width: 30, height: 30, flex: "none", borderRadius: "var(--radius-sm)", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${c} 18%, transparent)`, color: c }}>
        <Icon name={ic} size={16} />
      </span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, paddingTop: 4, minWidth: 0 }}>
        <span style={{ font: "600 15px var(--font-body)" }}>{title}</span>
        {message && <span style={{ font: "400 13px/1.5 var(--font-body)", color: "var(--text-secondary)" }}>{message}</span>}
      </span>
      {onClose && <button type="button" aria-label="Chiudi notifica" onClick={onClose} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--smoke)" }}><Icon name="x" size={16} /></button>}
    </div>
  );
}

/** Retro-compatibilità: lo sfondo animato ora è RiftBackground (canvas). */
export const Embers = RiftBackground;
