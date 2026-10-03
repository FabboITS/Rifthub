// Blocchi condivisi delle pagine, tema "Forge" (nero + arancio).
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { errMsg } from "../api/client";
import { Badge as DsBadge, IconButton } from "./ds";
import { Reveal } from "./Transitions";

const delay = (ms) => `calc(var(--rh-k) * ${ms}ms)`;
export const up = (ms = 0, dur = 520) => ({ animation: `rhUp calc(var(--rh-k) * ${dur}ms) var(--ease-out) ${delay(ms)} both` });

export function Card({ title, action, children, className = "", style, delay: d = 0 }) {
  return (
    <Reveal as="section" delay={d} className={`card flex flex-col gap-3.5 ${className}`} style={style}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2">
          {title && <h2 className="m-0 flex items-center gap-2" style={{ font: "800 21px/1.1 var(--font-display)", letterSpacing: ".01em" }}>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </Reveal>
  );
}

export function PageHeader({ title, subtitle, eyebrow, tone = "forge", children }) {
  const accent = { magenta: "#ff8a5c", gold: "var(--molten)", ice: "var(--ice)" }[tone] || "var(--forge)";
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
      <div className="flex flex-col gap-3">
        {eyebrow && (
          <span className="flex items-center gap-2.5" style={{ font: "600 14px var(--font-body)", color: accent, ...up(0) }}>
            <span style={{ width: 22, height: 2, background: accent, boxShadow: `0 0 10px ${accent}` }} />{eyebrow}
          </span>
        )}
        <h1 style={{ margin: 0, font: "900 clamp(40px,5.4vw,68px)/.92 var(--font-display)", letterSpacing: "-.005em", color: "var(--bone)", ...up(50, 600) }}>{title}</h1>
        {subtitle && <p className="max-w-xl" style={{ margin: 0, font: "400 17px/1.55 var(--font-body)", color: "var(--sand)", ...up(110, 600) }}>{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2" style={up(170, 600)}>{children}</div>}
    </div>
  );
}

/** Compatibilità: in passato una parola in corsivo script; ora il titolo resta tipograficamente uniforme. */
export function Script({ children }) {
  return <>{children}</>;
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
      style={{ borderColor: "rgba(255,75,62,.4)", background: "rgba(255,75,62,.1)", color: "#ffb3a8" }}>
      <AlertTriangle className="h-4 w-4 shrink-0" /> {typeof error === "string" ? error : errMsg(error)}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="m-0 rounded-[10px] border border-dashed p-6 text-center text-[15px]" style={{ borderColor: "var(--ash)", color: "var(--smoke)" }}>{children}</p>;
}

/** Renders loading / error / content for a react-query result. */
export function QueryState({ query, children, cards }) {
  // isPending (not isLoading): a disabled query has no data yet but isLoading=false.
  if (query.isPending) return <Loading cards={cards} />;
  if (query.isError) return <ErrorBox error={query.error} />;
  return children(query.data);
}

// Legacy color names used across pages, mapped onto the design-system tones.
const TONE = { hex: "forge", cyan: "forge", gold: "gold", red: "danger", green: "success", slate: "neutral", amber: "warning", magenta: "magenta", blue: "ice", sky: "ice" };

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
      style={{ background: "rgba(3,2,2,.72)", backdropFilter: "blur(6px)", animation: "rhFade calc(var(--rh-k) * 240ms) ease both" }}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[88vh] w-full flex-col gap-5 overflow-y-auto p-7 ${wide ? "max-w-[660px]" : "max-w-[480px]"}`}
        style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", borderTop: "2px solid var(--forge)", boxShadow: "var(--shadow-frame), 0 -20px 60px -30px rgba(255,107,26,.6)", animation: "rhModalIn calc(var(--rh-k) * 420ms) var(--ease-out) both" }}>
        <IconButton icon="x" label="Chiudi" size={36} variant="ghost" onClick={onClose} style={{ position: "absolute", top: 16, right: 16 }} />
        <div className="flex flex-col gap-2 pr-10">
          {eyebrow && <span style={{ font: "600 13px var(--font-body)", color: "var(--forge)" }}>{eyebrow}</span>}
          <h2 className="m-0" style={{ font: "900 32px/1 var(--font-display)" }}>{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Conferma in-app al posto di window.confirm. ask = { title, body, label, danger, run } oppure null. */
export function Confirm({ ask, onClose }) {
  return (
    <Modal open={!!ask} onClose={onClose} title={ask?.title} eyebrow="Conferma">
      {ask?.body && <p className="m-0 text-[15px]" style={{ color: "var(--sand)" }}>{ask.body}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Annulla</button>
        <button type="button" autoFocus className={`${ask?.danger ? "btn-danger" : "btn-primary"} flex-1`}
          onClick={() => { ask.run(); onClose(); }}>{ask?.label || "Conferma"}</button>
      </div>
    </Modal>
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

/** Small label above a group of chips. */
export function ChipGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span style={{ font: "600 13px var(--font-body)", color: "var(--smoke)" }}>{label}</span>
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
        style={{ width: `${pct}%`, background: thin ? "var(--forge)" : "var(--grad-cta)", boxShadow: thin ? "none" : "0 0 12px rgba(255,107,26,.6)", animation: `rhGrow calc(var(--rh-k) * 900ms) var(--ease-out) ${delay(d)} both` }} />
    </div>
  );
}

/** Big glowing number tile (dashboard). */
export function Stat({ label, value, hint, color = "var(--bone)", glow, delay: d = 0 }) {
  return (
    <div className="card flex flex-col gap-2" style={up(d)}>
      <span style={{ font: "600 14px var(--font-body)", color: "var(--smoke)" }}>{label}</span>
      <span style={{ font: "900 56px/.9 var(--font-display)", fontVariantNumeric: "tabular-nums", color, textShadow: glow ? "var(--text-glow)" : "none" }}>{value}</span>
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
          className="h-12 cursor-pointer rounded-[8px] border border-white/10 text-[17px] text-[color:var(--bone)] transition hover:-translate-y-0.5 hover:border-hex/70 hover:bg-hex/10 hover:shadow-[0_0_20px_rgba(255,107,26,.3)] active:scale-[.97] disabled:opacity-40"
          style={{ background: "rgba(12,9,8,.7)", fontFamily: "var(--font-display)", fontWeight: 800 }}>
          {sa === sb ? `Pareggio ${sa}–${sb}` : `${sa > sb ? a : b} vince ${Math.max(sa, sb)}–${Math.min(sa, sb)}`}
        </button>
      ))}
    </div>
  );
}
