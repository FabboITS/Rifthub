import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { errMsg } from "../api/client";

export function Card({ title, action, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Loading({ label = "Caricamento..." }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-slate-400" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
      <AlertTriangle className="h-4 w-4 shrink-0" /> {typeof error === "string" ? error : errMsg(error)}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="p-4 text-center text-sm text-slate-500">{children}</p>;
}

/** Renders loading / error / content for a react-query result. */
export function QueryState({ query, children }) {
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorBox error={query.error} />;
  return children(query.data);
}

const BADGE = {
  hex: "bg-hex/15 text-hex",
  gold: "bg-gold/15 text-gold-light",
  red: "bg-rose-500/15 text-rose-300",
  green: "bg-emerald-500/15 text-emerald-300",
  slate: "bg-slate-600/40 text-slate-300",
  amber: "bg-amber-500/15 text-amber-300",
};

export function Badge({ color = "slate", children }) {
  return <span className={`badge ${BADGE[color]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-4xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
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

export function ScoreBar({ value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-hex" : pct >= 30 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
