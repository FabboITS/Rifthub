// Public landing page, implemented from the Claude Design file "RiftHub Home.dc.html".
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errMsg } from "../api/client";
import { Badge, Button, Card, Dialog, HeroCard, Icon, IconButton, Input, SideRail, TopNav } from "../components/ds";
import { useAuth } from "../context/AuthContext";

const FANTALOL = "https://fantalol.win";

const MODS = [
  { key: "scrim", to: "/scrims", name: "Scrim", title: "Il campo d'allenamento", tint: "cyan", icon: "swords", a: "Trova", c: "la", b: "scrim", cta: "Cerca una scrim", body: "Prenota partite d'allenamento con team del tuo livello, conferma l'orario e raccogli i risultati in un'unica bacheca.", short: "Prenota allenamenti con team del tuo livello e archivia i risultati." },
  { key: "tornei", to: "/tournaments", name: "Tornei", title: "La strada per la coppa", tint: "gold", icon: "trophy", a: "Conquista", c: "il", b: "torneo", cta: "Vedi i tornei", body: "Iscrivi il team, segui il bracket in tempo reale e tieni traccia di ogni turno fino alla finale.", short: "Iscrizioni, bracket live e storico di ogni turno." },
  { key: "scouting", to: "/scouting", name: "Scouting", title: "Il cacciatore di talenti", tint: "magenta", icon: "search", a: "Scopri", c: "il", b: "talento", cta: "Inizia lo scouting", body: "Sfoglia i profili dei giocatori, filtra per ruolo e rank e trova chi completa la tua line-up.", short: "Profili giocatore filtrati per ruolo, rank e disponibilità." },
  { key: "tattiche", to: "/tactics", name: "Tattiche", title: "La mappa del comandante", tint: "violet", icon: "map", a: "Disegna", c: "la", b: "vittoria", cta: "Apri la lavagna", body: "Prepara rotazioni e piani di gioco sulla mappa, lato blu o rosso, e condividili con il team prima della partita.", short: "Rotazioni e piani di gioco sulla mappa, condivisi col team." },
  { key: "draft", to: "/draft", name: "Draft", title: "Il tavolo delle scelte", tint: "cyan", icon: "layers", a: "Vinci", c: "il", b: "draft", cta: "Simula un draft", body: "Simula pick e ban, salva le composizioni migliori e arriva alla selezione campioni con un piano chiaro.", short: "Simulatore di pick e ban con composizioni salvate." },
  { key: "vod", to: "/vod", name: "VOD Review", title: "L'archivio delle giocate", tint: "magenta", icon: "clapperboard", a: "Rivedi", c: "ogni", b: "giocata", cta: "Carica una VOD", body: "Carica le registrazioni, commenta i momenti chiave con timestamp e trasforma ogni errore in una lezione.", short: "Registrazioni commentate con timestamp sui momenti chiave." },
  { key: "coaching", to: "/coaching", name: "Coaching", title: "La voce dalla panchina", tint: "gold", icon: "graduation-cap", a: "Cresci", c: "col", b: "coach", cta: "Trova un coach", body: "Assegna obiettivi ai giocatori, programma le sessioni e misura i progressi settimana dopo settimana.", short: "Obiettivi, sessioni e progressi di ogni giocatore." },
  { key: "fantalol", name: "FantaLol", title: "Il gioco nel gioco", tint: "violet", icon: "gamepad-2", a: "Sfida", c: "i", b: "campioni", cta: "Apri FantaLol", body: "Schiera la tua formazione fantasy con i pro della stagione e sfida i compagni di squadra giornata dopo giornata.", short: "La lega fantasy sui pro, giocata con il tuo team.", ext: FANTALOL },
];

const NAV = ["Scrim", "Tornei", "Scouting", "Tattiche", "FantaLol"];
const RAIL = [
  { icon: "gamepad-2", label: "Home", active: true },
  { icon: "users", label: "Team", to: "/teams" },
  { icon: "message-square-more", label: "Chat", to: "/ai" },
  { icon: "calendar", label: "Calendario", to: "/scrims" },
];
const AUTOPLAY_MS = 6000;

const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");
const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const display = (weight, size, lh = 1) => ({ margin: 0, font: `${weight} ${size}/${lh} var(--font-display)`, textTransform: "uppercase", letterSpacing: "-.01em", color: "var(--text-primary)" });
const script = (size, valign) => ({ font: `400 ${size} var(--font-script)`, textTransform: "none", verticalAlign: valign });
const body = { margin: 0, font: "500 15px/1.6 var(--font-body)", color: "var(--text-secondary)", textWrap: "pretty" };
const frame = { position: "relative", width: "100%", maxWidth: 1320, borderRadius: "var(--radius-lg)", background: "var(--surface-frame)", boxShadow: "var(--shadow-frame)", border: "1px solid var(--border-subtle)" };

// Deterministic pseudo-random so embers don't jump between renders.
const rnd = (k, q) => ((Math.sin(k * 99.13 + q) * 43758.5) % 1 + 1) % 1;
const EMBERS = Array.from({ length: 46 }, (_, k) => {
  const s = 2 + rnd(k, 3) * 4;
  return (
    <span key={k} style={{ position: "absolute", left: rnd(k, 1) * 100 + "%", top: rnd(k, 2) * 100 + "%", width: s, height: s, borderRadius: "50%", background: "var(--ember-300)", boxShadow: `0 0 ${s * 3}px var(--ember-500)`, animation: `emberDrift ${8 + rnd(k, 5) * 10}s linear ${-rnd(k, 6) * 18}s infinite` }} />
  );
});

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

function SignInDialog({ open, onClose }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !pw) return setErr("Inserisci email e password");
    setBusy(true);
    setErr("");
    try {
      await login(email, pw);
      navigate("/dashboard");
    } catch (ex) {
      setErr(ex.response?.status === 401 ? "Credenziali non valide." : errMsg(ex));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} eyebrow="Benvenuto" title="Accedi" width={420}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="Email" icon="mail" type="email" autoComplete="email" placeholder="nome@team.gg" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" icon="lock" type="password" autoComplete="current-password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} error={err} />
        <Button type="submit" fullWidth disabled={busy} style={{ marginTop: 4 }}>{busy ? "Accesso..." : "Accedi"}</Button>
        <a href="/register" onClick={(e) => { e.preventDefault(); navigate("/register"); }} style={{ alignSelf: "center", fontSize: 13, color: "var(--cyan-400)" }}>
          Non hai un account? Registrati
        </a>
      </form>
    </Dialog>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const w = useWidth();
  const [i, setI] = useState(0);
  const [signIn, setSignIn] = useState(false);
  const [tick, setTick] = useState(0); // bumping restarts the autoplay timer after a manual pick
  const m = MODS[i];
  const narrow = w < 760;

  useEffect(() => {
    if (signIn) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % MODS.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [signIn, tick]);

  const sel = (j, top) => { setI(j); setTick((t) => t + 1); if (top) scrollTop(); };
  const go = (mod) => (mod.ext ? openExternal(mod.ext) : sel(MODS.indexOf(mod), true));
  const cta = (mod) => (mod.ext ? openExternal(mod.ext) : user ? navigate(mod.to) : setSignIn(true));
  const closeSignIn = useCallback(() => setSignIn(false), []);

  const shown = Array.from({ length: w < 1180 ? 2 : 3 }, (_, k) => (i + k) % MODS.length);

  const navActions = user ? (
    <button type="button" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: "var(--ink-0)", font: "800 11px var(--font-display)", letterSpacing: ".14em", textTransform: "uppercase" }}>
      <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--grad-tint-cyan)", border: "1px solid var(--cyan-400)" }} />
      {user.display_name || user.username}
    </button>
  ) : <Button variant="outline" size="sm" onClick={() => setSignIn(true)}>Accedi</Button>;

  return (
    <div className="ds-motion" style={{ position: "relative", minHeight: "100vh", background: "var(--grad-page)", padding: "clamp(16px,4vw,48px) clamp(12px,4vw,56px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 40, overflow: "hidden", fontFamily: "var(--font-body)", color: "var(--text-primary)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{EMBERS}</div>

      {/* Hero */}
      <section style={{ ...frame, height: narrow ? 720 : 800, overflow: "hidden" }}>
        {/* ponytail: gradient stands in for the design's key-art image slot; drop an <img> here once art exists */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 65% at 75% 40%, rgba(122,58,168,.55), transparent 70%), radial-gradient(40% 50% at 88% 75%, rgba(31,143,196,.35), transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "var(--grad-scrim-left)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", background: "var(--grad-scrim-bottom)", pointerEvents: "none" }} />

        <div style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 5 }}>
          <TopNav
            brand={<span onClick={scrollTop} style={{ cursor: "pointer" }}>RIFTHUB</span>}
            links={narrow ? [] : NAV.map((l) => ({ label: l, active: m.name === l }))}
            onSelect={(l) => go(MODS.find((x) => x.name === l.label))}
            actions={navActions}
          />
        </div>
        {!narrow && (
          <div style={{ position: "absolute", left: 0, top: "calc(50% - 110px)", zIndex: 5 }}>
            <SideRail items={RAIL} onSelect={(r) => r.to && navigate(r.to)} />
          </div>
        )}

        <div style={{ position: "absolute", left: narrow ? 24 : "calc(var(--rail-width) + 48px)", top: narrow ? 120 : 180, width: narrow ? "calc(100% - 48px)" : "min(480px, calc(100% - var(--rail-width) - 96px))", zIndex: 4 }}>
          <div key={m.key} style={{ display: "flex", flexDirection: "column", gap: 24, animation: "heroIn 450ms cubic-bezier(.2,.8,.2,1)" }}>
            <div style={{ alignSelf: "flex-start" }}><Badge tone="cyan" dot>{"RiftHub · " + m.name}</Badge></div>
            <h1 style={display(900, "clamp(56px,7vw,96px)", 0.92)}>
              {m.a} <span style={script("clamp(42px,5.2vw,72px)", ".28em")}>{m.c}</span><br />{m.b}
            </h1>
            <p style={{ ...body, maxWidth: 380 }}>{m.body}</p>
            <div><Button size="lg" trailingIcon={m.ext ? "arrow-up-right" : "play"} onClick={() => cta(m)}>{m.cta}</Button></div>
          </div>
        </div>

        <div style={{ position: "absolute", right: narrow ? 24 : -60, bottom: 36, display: "flex", alignItems: "center", gap: 16, zIndex: 4 }}>
          <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", gap: 8 }}>
            <IconButton icon="chevron-left" size={36} label="Precedente" onClick={() => sel((i + MODS.length - 1) % MODS.length)} />
            <IconButton icon="chevron-right" size={36} label="Successivo" onClick={() => sel((i + 1) % MODS.length)} />
          </div>
          {!narrow && shown.map((j, k) => (
            <HeroCard key={MODS[j].key} name={MODS[j].name} title={MODS[j].title} tint={MODS[j].tint} active={k === 0} width={200} height={260} onClick={() => sel(j)} />
          ))}
        </div>
      </section>

      {/* Moduli */}
      <section style={{ ...frame, padding: "clamp(32px,5vw,72px) clamp(20px,5vw,72px)", display: "flex", flexDirection: "column", gap: 48 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
          <h2 style={display(900, "clamp(48px,6vw,72px)", 0.92)}>Una <span style={script("clamp(40px,5vw,60px)", ".2em")}>sola</span><br />base</h2>
          <p style={{ ...body, maxWidth: 380 }}>Scrim, tornei, scouting, tattiche e VOD review in un unico posto. Ogni ruolo del team trova il suo spazio, dal primo allenamento all&apos;ultima finale.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {MODS.map((x, j) => (
            <Card key={x.key} interactive glow={j === i} onClick={() => go(x)}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Icon name={x.icon} size={24} color="var(--cyan-400)" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ font: "800 13px var(--font-display)", letterSpacing: ".14em", textTransform: "uppercase" }}>{x.name}</div>
                  <div style={{ font: "500 13px var(--font-body)", color: "var(--text-muted)" }}>{x.title}</div>
                </div>
                <p style={{ ...body, fontSize: 14 }}>{x.short}</p>
              </div>
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 32, paddingTop: 48, borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
            <h2 style={display(900, "clamp(40px,5vw,56px)", 0.92)}>Pronto <span style={script("clamp(34px,4vw,46px)", ".18em")}>a</span> giocare</h2>
            <p style={body}>Crea il team in due minuti, invita i compagni e prenota la prima scrim già stasera.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <Button variant="outline" trailingIcon="arrow-up-right" onClick={() => openExternal(FANTALOL)}>Scopri FantaLol</Button>
            <Button size="lg" trailingIcon="play" onClick={() => (user ? navigate("/teams") : navigate("/register"))}>Crea il tuo team</Button>
          </div>
        </div>
      </section>

      <footer style={{ position: "relative", width: "100%", maxWidth: 1320, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, padding: "0 8px 8px", font: "500 13px var(--font-body)", color: "var(--text-muted)" }}>
        <span style={{ font: "900 14px var(--font-display)", letterSpacing: ".14em", color: "var(--text-primary)" }}>RIFTHUB</span>
        <span>© 2026 RiftHub · Progetto indipendente, non affiliato a Riot Games.</span>
      </footer>

      <SignInDialog open={signIn} onClose={closeSignIn} />
    </div>
  );
}
