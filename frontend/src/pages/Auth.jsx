import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../api/client";
import { Button, Embers, Input, Tag } from "../components/ds";
import { ChipGroup } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const ROLES = [["PLAYER", "Player"], ["COACH", "Coach"], ["MANAGER", "Manager"], ["SCOUT", "Scout"]];
const tab = "relative h-9 cursor-pointer border-none bg-transparent text-[11px] font-extrabold uppercase tracking-[.14em] transition-colors";

function AuthPage({ register }) {
  const { user, login, register: signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: register ? "" : "manager@rifthub.dev", password: "", display_name: "", role: "PLAYER" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shakes, setShakes] = useState(0);
  if (user) return <Navigate to="/dashboard" replace />;
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError(""); };
  const fail = (msg) => { setError(msg); setShakes((n) => n + 1); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return fail("Inserisci email e password");
    setBusy(true);
    try {
      if (register) await signUp(form);
      else await login(form.email, form.password);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      fail(!register && err.response?.status === 401 ? "Credenziali non valide." : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-10 px-5 py-8">
      <Embers />
      <Link to="/" className="relative self-start text-sm font-black tracking-[.14em] !text-white" style={{ animation: "rhFade calc(var(--rh-k) * 500ms) both" }}>RIFTHUB</Link>
      {/* alternating keyframe names restart the shake on every failed attempt */}
      <div className="relative my-auto w-full max-w-[440px]" style={{ animation: shakes ? `rhShake${shakes % 2 ? "" : "2"} 420ms var(--ease-out)` : "none" }}>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-8"
          style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-frame),0 0 60px rgba(84,34,115,.6)", animation: "rhModalIn calc(var(--rh-k) * 560ms) var(--ease-out) both" }}>
          <div className="relative grid grid-cols-2 rounded-full border border-white/10 p-1" style={{ background: "rgba(11,9,32,.6)" }}>
            <span aria-hidden="true" className="absolute bottom-1 left-1 top-1 rounded-full"
              style={{ width: "calc(50% - 4px)", background: "rgba(61,191,235,.16)", border: "1px solid rgba(111,214,246,.5)", boxShadow: "0 0 16px rgba(61,191,235,.25)", transform: register ? "translateX(100%)" : "none", transition: "transform calc(var(--rh-k) * 420ms) var(--ease-out)" }} />
            <button type="button" className={tab} style={{ color: register ? "var(--ink-300)" : "#fff" }} onClick={() => navigate("/login")}>Accedi</button>
            <button type="button" className={tab} style={{ color: register ? "#fff" : "var(--ink-300)" }} onClick={() => navigate("/register")}>Registrati</button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-hex">{register ? "Nuovo giocatore" : "Benvenuto"}</span>
            <h1 className="m-0 text-[28px] font-black uppercase leading-[1.1]">{register ? "Crea account" : "Accedi"}</h1>
          </div>
          {register && (
            <div className="flex flex-col gap-5" style={{ animation: "rhUp calc(var(--rh-k) * 420ms) var(--ease-out) both" }}>
              <Input label="Nome visualizzato" icon="user" placeholder="Il tuo nickname" value={form.display_name} onChange={set("display_name")} />
              <ChipGroup label="Ruolo">
                {ROLES.map(([v, l]) => <Tag key={v} selected={form.role === v} onClick={() => setForm({ ...form, role: v })}>{l}</Tag>)}
              </ChipGroup>
            </div>
          )}
          <Input label="Email" icon="mail" type="email" autoComplete="email" placeholder="nome@team.gg" value={form.email} onChange={set("email")} />
          <Input label={register ? "Password (min 8 caratteri)" : "Password"} icon="lock" type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="••••••••" value={form.password} onChange={set("password")} error={error} />
          <Button type="submit" fullWidth disabled={busy}>{busy ? (register ? "Creazione..." : "Accesso...") : register ? "Crea account" : "Accedi"}</Button>
          {!register && (
            <p className="m-0 text-center text-xs text-slate-400">
              Demo: <code>manager@rifthub.dev</code> / <code>Demo1234!</code> (anche coach, player, scout, admin)
            </p>
          )}
          <Link to={register ? "/login" : "/register"} className="self-center text-[13px]">
            {register ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
          </Link>
        </form>
      </div>
    </div>
  );
}

export const Login = () => <AuthPage />;
export const Register = () => <AuthPage register />;
