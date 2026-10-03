import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../api/client";
import { Brand } from "../components/Brand";
import { Button, Input, Tag } from "../components/ds";
import RiftBackground from "../components/RiftBackground";
import { LiveRift } from "../components/RiftMap";
import { ChipGroup } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const ROLES = [["PLAYER", "Player"], ["COACH", "Coach"], ["MANAGER", "Manager"], ["SCOUT", "Scout"]];
const tab = "relative z-[1] h-10 cursor-pointer border-none bg-transparent transition-colors";

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
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <RiftBackground intensity="full" />

      {/* colonna sinistra: la mappa come manifesto */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex" style={{ borderRight: "1px solid var(--border-subtle)" }}>
        <Link to="/" className="relative z-[1] self-start" aria-label="Torna alla home"><Brand size={30} /></Link>
        <div className="relative z-[1] grid place-items-center">
          <LiveRift className="w-full max-w-[520px]" style={{ filter: "drop-shadow(0 30px 80px rgba(255,107,26,.18))", animation: "rhScale 900ms var(--ease-out) both" }} />
        </div>
        <p className="relative z-[1] m-0 max-w-[420px]" style={{ font: "800 30px/1.05 var(--font-display)", color: "var(--bone)" }}>
          Scrim, tornei, scouting e review. Tutto il lavoro del team, su una sola mappa.
        </p>
      </aside>

      <div className="relative flex flex-col items-center gap-10 px-5 py-8">
        <Link to="/" className="relative self-start lg:hidden" aria-label="Torna alla home"><Brand size={26} /></Link>
        {/* nomi di keyframe alternati: lo shake riparte a ogni tentativo fallito */}
        <div className="relative my-auto w-full max-w-[420px]" style={{ animation: shakes ? `rhShake${shakes % 2 ? "" : "2"} 420ms var(--ease-out)` : "none" }}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-8"
            style={{ borderRadius: "var(--radius-xl)", background: "var(--surface-glass-strong)", backdropFilter: "var(--blur-glass)", border: "1px solid var(--border-subtle)", borderTop: "2px solid var(--forge)", boxShadow: "var(--shadow-frame), 0 -24px 70px -30px rgba(255,107,26,.55)", animation: "rhModalIn calc(var(--rh-k) * 600ms) var(--ease-out) both" }}>
            <div className="relative grid grid-cols-2 rounded-[8px] border p-1" style={{ background: "var(--obsidian)", borderColor: "var(--border-subtle)" }}>
              <span aria-hidden="true" className="absolute bottom-1 left-1 top-1 rounded-[6px]"
                style={{ width: "calc(50% - 4px)", background: "var(--forge)", boxShadow: "0 6px 20px -6px rgba(255,107,26,.8)", transform: register ? "translateX(100%)" : "none", transition: "transform calc(var(--rh-k) * 460ms) var(--ease-out)" }} />
              <button type="button" className={tab} style={{ font: "800 17px var(--font-display)", color: register ? "var(--sand)" : "#1a0a02" }} onClick={() => navigate("/login")}>Accedi</button>
              <button type="button" className={tab} style={{ font: "800 17px var(--font-display)", color: register ? "#1a0a02" : "var(--sand)" }} onClick={() => navigate("/register")}>Registrati</button>
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0" style={{ font: "900 44px/.95 var(--font-display)" }}>{register ? "Entra nella Rift" : "Bentornato"}</h1>
              <p className="m-0 text-[15px]" style={{ color: "var(--smoke)" }}>{register ? "Crea il tuo profilo e scegli il ruolo nel team." : "Accedi per vedere scrim, tornei e review del tuo team."}</p>
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
            <Input label={register ? "Password (almeno 8 caratteri)" : "Password"} icon="lock" type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="••••••••" value={form.password} onChange={set("password")} error={error} />
            <Button type="submit" fullWidth size="lg" disabled={busy}>{busy ? (register ? "Creazione account…" : "Accesso in corso…") : register ? "Crea account" : "Accedi"}</Button>
            {!register && (
              <p className="m-0 text-center text-[13px]" style={{ color: "var(--smoke)" }}>
                Account demo: <code>manager@rifthub.dev</code>, password <code>Demo1234!</code>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export const Login = () => <AuthPage />;
export const Register = () => <AuthPage register />;
