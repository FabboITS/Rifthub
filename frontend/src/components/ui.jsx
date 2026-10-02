// Shared page building blocks, styled after the "RiftHub Prototype" design.
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { errMsg } from "../api/client";
import { Badge as DsBadge, IconButton } from "./ds";

const delay = (ms) => `calc(var(--rh-k) * ${ms}ms)`;
export const up = (ms = 0, dur = 520) => ({ animation: `rhUp calc(var(--rh-k) * ${dur}ms) var(--ease-out) ${delay(ms)} both` });

export function Card({ title, action, children, className = "", style, delay: d = 0 }) {
  return (
    <section className={`card flex flex-col gap-3.5 ${className}`} style={{ ...up(d), ...style }}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2">
          {title && <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[.14em]">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, eyebrow = "RiftHub", tone = "cyan", children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-3">
        {eyebrow && <div className="self-start" style={up(0)}><DsBadge tone={tone} dot>{eyebrow}</DsBadge></div>}
        <h1 style={{ margin: 0, font: "900 clamp(36px,4.5vw,52px)/.95 var(--font-display)", textTransform: "uppercase", letterSpacing: "-.01em", ...up(60, 560) }}>{title}</h1>
        {subtitle && <p className="max-w-xl" style={{ margin: 0, font: "500 15px/1.6 var(--font-body)", color: "var(--ink-200)", ...up(120, 560) }}>{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2" style={up(180, 560)}>{children}</div>}
    </div>
  );
}

/** Inline script word, e.g. <>Scopri <Script>il</Script> talento</>. */
export function Script({ children, glow }) {
  return <span style={{ font: "400 .88em var(--font-script)", textTransform: "none", ...(glow && { color: "var(--cyan-200)", textShadow: "var(--text-glow)" }) }}>{children}</span>;
}

export function Loading({ label = "Caricamento...", cards = 3 }) {
  return (
    <div role="status" className="flex flex-col gap-4" style={{ animation: "rhFade 200ms both" }}>
      <span className="sr-only">{label}</span>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card flex h-[150px] flex-col gap-3.5">
            {["45%", "90%", "75%", "60%"].map((w, j) => <div key={j} className="rh-skel rounded-lg" style={{ width: w, height: j ? 12 : 14 }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-[14px] border p-3 text-sm" role="alert"
      style={{ borderColor: "rgba(255,77,109,.4)", background: "rgba(255,77,109,.1)", color: "#ffb3c1" }}>
      <AlertTriangle className="h-4 w-4 shrink-0" /> {typeof error === "string" ? error : errMsg(error)}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="rounded-[14px] border border-dashed border-white/10 p-5 text-center text-sm text-slate-400">{children}</p>;
}

/** Renders loading / error / content for a react-query result. */
export function QueryState({ query, children, cards }) {
  // isPending (not isLoading): a disabled query has no data yet but isLoading=false.
  if (query.isPending) return <Loading cards={cards} />;
  if (query.isError) return <ErrorBox error={query.error} />;
  return children(query.data);
}

// Legacy color names used across pages, mapped onto the design-system tones.
const TONE = { hex: "cyan", gold: "gold", red: "danger", green: "success", slate: "neutral", amber: "warning", magenta: "magenta" };

export function Badge({ color = "slate", dot, children }) {
  return <DsBadge tone={TONE[color] || color} dot={dot}>{children}</DsBadge>;
}

export function Modal({ open, onClose, title, eyebrow, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" onClick={onClose}
      style={{ background: "rgba(8,6,24,.6)", backdropFilter: "blur(6px)", animation: "rhFade calc(var(--rh-k) * 260ms) ease both" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[88vh] w-full flex-col gap-5 overflow-y-auto p-8 ${wide ? "max-w-[640px]" : "max-w-[460px]"}`}
        style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-frame),0 0 60px rgba(84,34,115,.6)", animation: "rhModalIn calc(var(--rh-k) * 380ms) var(--ease-out) both" }}>
        <IconButton icon="x" label="Chiudi" size={36} variant="ghost" onClick={onClose} style={{ position: "absolute", top: 16, right: 16 }} />
        <div className="flex flex-col gap-2 pr-10">
          {eyebrow && <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-hex">{eyebrow}</span>}
          <h2 className="m-0 text-[28px] font-black uppercase leading-[1.1]">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/** Small uppercase label above a group of chips. */
export function ChipGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o, o];
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function ScoreBar({ value, max = 100, thin, delay: d = 0 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`${thin ? "h-[3px]" : "h-1.5"} w-full overflow-hidden rounded-full bg-white/10`}>
      <div className="h-full origin-left rounded-full"
        style={{ width: `${pct}%`, background: thin ? "var(--cyan-400)" : "var(--grad-cta)", boxShadow: thin ? "none" : "0 0 10px rgba(61,191,235,.6)", animation: `rhGrow calc(var(--rh-k) * 900ms) var(--ease-out) ${delay(d)} both` }} />
    </div>
  );
}

/** Big glowing number tile (dashboard). */
export function Stat({ label, value, hint, color = "#fff", glow, delay: d = 0 }) {
  return (
    <div className="card flex flex-col gap-2" style={up(d)}>
      <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</span>
      <span className="rh-mono" style={{ font: "700 40px/1 var(--font-mono)", color, textShadow: glow ? "var(--text-glow)" : "none" }}>{value}</span>
      {hint && <span className="text-[13px] text-slate-400">{hint}</span>}
    </div>
  );
}

/** One big button per possible series score; onPick({ score_a, score_b }). */
export function ResultPicker({ a, b, options, onPick, disabled }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm text-slate-300">Scegli il risultato della serie.</span>
      {options.map(([sa, sb]) => (
        <button key={`${sa}-${sb}`} type="button" disabled={disabled} onClick={() => onPick({ score_a: sa, score_b: sb })}
          className="h-12 cursor-pointer rounded-[14px] border border-white/10 text-xs font-extrabold uppercase tracking-[.12em] text-white transition hover:-translate-y-0.5 hover:border-hex/70 hover:bg-hex-dark/10 hover:shadow-[0_0_18px_rgba(61,191,235,.3)] active:scale-[.97] disabled:opacity-40"
          style={{ background: "rgba(11,9,32,.5)" }}>
          {sa === sb ? `Pareggio ${sa}–${sb}` : `${sa > sb ? a : b} vince ${Math.max(sa, sb)}–${Math.min(sa, sb)}`}
        </button>
      ))}
    </div>
  );
}
