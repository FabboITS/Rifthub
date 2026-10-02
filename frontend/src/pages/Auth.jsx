import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../api/client";
import { ErrorBox, Field, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";

function Shell({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md rounded-[28px] p-8 shadow-[var(--shadow-frame),0_0_60px_rgba(84,34,115,.6)]">
        <Link to="/" className="text-sm font-black tracking-[.14em] text-white">RIFTHUB</Link>
        <p className="mb-6 mt-1 text-xs text-slate-400">Il gestionale per il League of Legends competitivo</p>
        <h1 className="mb-6 text-3xl font-black uppercase leading-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("manager@rifthub.dev");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.status === 401 ? "Credenziali non valide." : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Accedi">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <ErrorBox error={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Accesso..." : "Accedi"}</button>
      </form>
      <p className="mt-4 text-xs text-slate-400">
        Demo: <code>manager@rifthub.dev</code> / <code>Demo1234!</code> (anche coach, player, scout, admin).
      </p>
      <p className="mt-2 text-sm">Non hai un account? <Link className="text-hex hover:underline" to="/register">Registrati</Link></p>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", display_name: "", role: "PLAYER" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Crea un account">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome visualizzato"><input className="input" value={form.display_name} onChange={set("display_name")} /></Field>
        <Field label="Email"><input className="input" type="email" value={form.email} onChange={set("email")} required /></Field>
        <Field label="Password (min 8 caratteri)"><input className="input" type="password" value={form.password} onChange={set("password")} required minLength={8} /></Field>
        <Field label="Ruolo">
          <Select value={form.role} onChange={set("role")} options={[["PLAYER", "Player"], ["COACH", "Coach"], ["MANAGER", "Manager"], ["SCOUT", "Scout"]]} />
        </Field>
        <ErrorBox error={error} />
        <button className="btn-primary w-full" disabled={busy}>Registrati</button>
      </form>
      <p className="mt-4 text-sm">Hai già un account? <Link className="text-hex hover:underline" to="/login">Accedi</Link></p>
    </Shell>
  );
}
