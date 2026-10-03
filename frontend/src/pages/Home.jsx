// Landing pubblica. Protagonista: la minimappa di Summoner's Rift, viva e interattiva.
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { Button, Icon } from "../components/ds";
import RiftBackground from "../components/RiftBackground";
import { Reveal } from "../components/Transitions";
import { LiveRift, ROLES } from "../components/RiftMap";
import { useAuth } from "../context/AuthContext";

const FANTALOL = "https://fantalol.win";
const EASE = [0.16, 1, 0.3, 1];

// Cosa fa RiftHub per ciascun ruolo: compare quando evidenzi il ruolo sulla mappa.
const ROLE_TIPS = {
  T: "Pianifica teleport e rotazioni del lato top sulla lavagna tattica.",
  J: "Disegna il pathing della prima clear e condividilo prima della scrim.",
  M: "Rivedi le roam con i commenti a timestamp nella VOD review.",
  A: "Simula il draft e scegli la bot lane che regge la tua composizione.",
  S: "Segna i ward chiave sulla mappa e salvali come frame animati.",
};

const MODS = [
  { to: "/scrims", name: "Scrim", icon: "swords", body: "Matchmaking per orari, rank e regione. Conferma l'avversario e archivia i risultati." },
  { to: "/tournaments", name: "Tornei", icon: "trophy", body: "Bracket a eliminazione diretta o gironi all'italiana, con classifica aggiornata." },
  { to: "/scouting", name: "Scouting", icon: "heart", body: "Sfoglia i player con lo swipe, filtra per ruolo e confrontali sul radar." },
  { to: "/tactics", name: "Tattiche", icon: "map", body: "Lavagna sulla Rift con frame animati e sessioni live coach → player." },
  { to: "/draft", name: "Draft", icon: "crosshair", body: "Simula pick e ban e ricevi suggerimenti sulla composizione." },
  { to: "/vod", name: "VOD review", icon: "video", body: "Commenti a timestamp, filtri per categoria e report generato dall'AI." },
  { to: "/coaching", name: "Coaching", icon: "clipboard-list", body: "Sessioni, homework e action item per ogni giocatore." },
  { ext: FANTALOL, name: "FantaLol", icon: "gamepad-2", body: "La lega fantasy sui pro della stagione, da giocare con il team." },
];

const WEEK = [
  ["Lunedì", "Scrim contro un team del tuo livello, trovato in automatico."],
  ["Martedì", "VOD review: il coach commenta i momenti chiave."],
  ["Giovedì", "Lavagna tattica e draft per il prossimo avversario."],
  ["Sabato", "Partita di torneo. Il bracket si aggiorna da solo."],
];

function TiltMap({ highlight, onRole }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 120, damping: 18 });
  const move = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <div onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }} style={{ perspective: 1400 }} className="w-full">
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, scale: 0.9, clipPath: "circle(0% at 0% 100%)" }}
        animate={{ opacity: 1, scale: 1, clipPath: "circle(150% at 0% 100%)", transitionEnd: { clipPath: "none" } }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.25 }}
        className="relative mx-auto aspect-square w-full max-w-[640px]">
        {/* alone sotto la mappa */}
        <div aria-hidden="true" className="absolute -inset-[6%] -z-[1] rounded-[40px]" style={{ background: "radial-gradient(50% 50% at 50% 55%, rgba(255,107,26,.28), transparent 70%)", filter: "blur(20px)" }} />
        <div className="h-full w-full overflow-hidden rounded-[22px]" style={{ border: "1px solid rgba(255,150,80,.28)", boxShadow: "0 50px 120px -30px rgba(0,0,0,.95), 0 0 0 6px rgba(255,107,26,.05)" }}>
          <LiveRift highlight={highlight} onRole={onRole} className="block h-full w-full" />
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const tip = role ? ROLE_TIPS[role] : null;

  const open = (m) => (m.ext ? window.open(m.ext, "_blank", "noopener,noreferrer") : navigate(user ? m.to : "/login"));
  const line = (i) => ({ initial: { y: "105%" }, animate: { y: 0 }, transition: { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.09 } });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <RiftBackground intensity="full" />

      {/* barra superiore */}
      <header className="relative z-10 mx-auto flex h-20 max-w-[1320px] items-center gap-6 px-5">
        <Link to="/" aria-label="RiftHub"><Brand size={30} /></Link>
        <nav className="ml-6 hidden gap-7 md:flex" style={{ font: "700 19px var(--font-display)" }}>
          <a href="#moduli" style={{ color: "var(--sand)" }}>Funzionalità</a>
          <a href="#settimana" style={{ color: "var(--sand)" }}>Come funziona</a>
          <a href={FANTALOL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--molten)" }}>FantaLol</a>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          {user ? (
            <Button size="sm" trailingIcon="arrow-up-right" onClick={() => navigate("/dashboard")}>Apri la dashboard</Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => navigate("/login")}>Accedi</Button>
              <Button size="sm" onClick={() => navigate("/register")}>Registrati</Button>
            </>
          )}
        </div>
      </header>

      {/* hero */}
      <section className="relative z-[1] mx-auto grid max-w-[1320px] items-center gap-10 px-5 pb-16 pt-6 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1fr_1.05fr] lg:pb-10">
        <div className="flex flex-col gap-7">
          <h1 className="m-0" style={{ font: "900 clamp(64px,8.6vw,136px)/.84 var(--font-display)", letterSpacing: "-.01em", color: "var(--bone)" }}>
            {["Prepara", "il team.", "Prendi", "la Rift."].map((w, i) => (
              <span key={w} className="block overflow-hidden pb-[.04em]">
                <motion.span className="block" {...line(i)} style={i > 1 ? { color: "var(--forge)" } : undefined}>{w}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="m-0 max-w-[460px]" style={{ font: "400 19px/1.55 var(--font-body)", color: "var(--sand)" }}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}>
            La piattaforma per team e accademie di League of Legends: scrim, tornei, scouting, tattiche e VOD review in un unico posto.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.65 }}>
            <Button size="lg" trailingIcon="arrow-up-right" onClick={() => navigate(user ? "/teams" : "/register")}>Crea il tuo team</Button>
            <Button size="lg" variant="outline" onClick={() => navigate(user ? "/scrims" : "/login")}>Cerca una scrim</Button>
          </motion.div>

          {/* selettore di ruolo: evidenzia le posizioni sulla mappa */}
          <motion.div className="flex flex-col gap-3 pt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }}>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Evidenzia un ruolo sulla mappa">
              {ROLES.map((r) => {
                const on = role === r.key;
                return (
                  <button key={r.key} type="button" aria-pressed={on}
                    onMouseEnter={() => setRole(r.key)} onMouseLeave={() => setRole(null)} onFocus={() => setRole(r.key)} onBlur={() => setRole(null)}
                    onClick={() => setRole(on ? null : r.key)}
                    className="flex h-10 items-center gap-2 rounded-[6px] px-3.5 transition"
                    style={{ font: "700 16px var(--font-display)", cursor: "pointer", color: on ? "#1a0a02" : "var(--sand)", background: on ? "var(--forge)" : "rgba(22,17,15,.7)", border: `1px solid ${on ? "var(--forge)" : "var(--border-subtle)"}` }}>
                    <span className="grid h-5 w-5 place-items-center rounded-full text-[12px]" style={{ background: on ? "#1a0a02" : "var(--cinder)", color: on ? "var(--forge)" : "var(--molten)" }}>{r.key}</span>
                    {r.name}
                  </button>
                );
              })}
            </div>
            <p className="m-0 min-h-[3em] max-w-[460px] text-[15px]" style={{ color: tip ? "var(--bone)" : "var(--smoke)", transition: "color 200ms" }} aria-live="polite">
              {tip || "Scegli un ruolo, o un giocatore sulla mappa, per vedere come RiftHub lo aiuta."}
            </p>
          </motion.div>
        </div>

        <TiltMap highlight={role} onRole={setRole} />
      </section>

      {/* moduli: indice a due colonne, non una griglia di card */}
      <section id="moduli" className="relative z-[1] mx-auto max-w-[1320px] px-5 py-24">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className="m-0" style={{ font: "900 clamp(44px,6vw,84px)/.9 var(--font-display)" }}>Tutto il lavoro<br />del team.</h2>
          <p className="m-0 max-w-[380px] text-[17px]">Ogni ruolo trova il suo spazio: il manager organizza, il coach analizza, lo scout cerca, i player si allenano.</p>
        </Reveal>
        <motion.ul className="m-0 grid list-none gap-x-10 p-0 md:grid-cols-2" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
          {MODS.map((m) => (
            <motion.li key={m.name} variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
              <button type="button" onClick={() => open(m)} className="group relative flex w-full items-start gap-5 border-t py-6 text-left"
                style={{ borderColor: "var(--border-subtle)", background: "none", cursor: "pointer", color: "inherit" }}>
                <span aria-hidden="true" className="absolute left-0 top-[-1px] h-[2px] w-0 transition-all duration-500 group-hover:w-full" style={{ background: "var(--forge)", boxShadow: "0 0 14px var(--forge)" }} />
                <span className="mt-1 grid h-11 w-11 flex-none place-items-center rounded-[8px] transition-colors duration-300 group-hover:bg-[color:var(--forge)] group-hover:text-[#1a0a02]"
                  style={{ background: "var(--cinder)", color: "var(--forge)" }}><Icon name={m.icon} size={20} /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="transition-transform duration-300 group-hover:translate-x-1" style={{ font: "800 32px/1 var(--font-display)", color: "var(--bone)" }}>{m.name}</span>
                  <span className="text-[16px]" style={{ color: "var(--sand)" }}>{m.body}</span>
                </span>
                <Icon name="arrow-up-right" size={22} color="var(--forge)" style={{ marginTop: 6, opacity: 0.5 }} />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* una settimana tipo: è davvero una sequenza, quindi la mostriamo come percorso */}
      <section id="settimana" className="relative z-[1] mx-auto max-w-[1320px] px-5 pb-24">
        <Reveal as="h2" className="m-0 mb-10" style={{ font: "900 clamp(36px,4.6vw,60px)/.95 var(--font-display)" }}>Una settimana su RiftHub</Reveal>
        <ol className="relative m-0 grid list-none gap-8 p-0 md:grid-cols-4">
          {/* il percorso si "traccia" da sinistra a destra mentre i giorni compaiono in sequenza */}
          <motion.span aria-hidden="true" className="absolute left-0 right-0 top-[9px] hidden h-[2px] origin-left md:block" style={{ background: "linear-gradient(90deg, var(--ice), var(--forge))", opacity: 0.6 }}
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: "0px 0px -60px 0px" }} transition={{ duration: 1.2, ease: EASE }} />
          {WEEK.map(([day, text], i) => (
            <Reveal as="li" key={day} delay={150 + i * 220} className="relative flex flex-col gap-3">
              <span className="relative h-5 w-5 rounded-full" style={{ background: i === WEEK.length - 1 ? "var(--forge)" : "var(--void)", border: "2px solid var(--forge)", boxShadow: "0 0 14px rgba(255,107,26,.5)" }} />
              <span style={{ font: "800 26px/1 var(--font-display)", color: "var(--bone)" }}>{day}</span>
              <span className="max-w-[260px] text-[16px]">{text}</span>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* chiusura */}
      <section className="relative z-[1] mx-auto max-w-[1320px] px-5 pb-16">
        <Reveal y={32} className="relative overflow-hidden rounded-[18px] px-8 py-14 md:px-14" style={{ background: "linear-gradient(115deg, #1a0d06 0%, #0c0908 55%)", border: "1px solid rgba(255,150,80,.22)" }}>
          <div aria-hidden="true" className="absolute -right-20 -top-24 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,107,26,.35), transparent)" }} />
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="flex max-w-[560px] flex-col gap-3">
              <h2 className="m-0" style={{ font: "900 clamp(40px,5vw,72px)/.9 var(--font-display)" }}>La prima scrim può essere stasera.</h2>
              <p className="m-0 text-[17px]">Crea il team in due minuti, invita i compagni e lascia che RiftHub trovi l&apos;avversario.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="outline" trailingIcon="arrow-up-right" onClick={() => window.open(FANTALOL, "_blank", "noopener,noreferrer")}>Scopri FantaLol</Button>
              <Button size="lg" onClick={() => navigate(user ? "/teams" : "/register")}>Crea il tuo team</Button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-[1] mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-5 pb-10 text-[14px]" style={{ color: "var(--smoke)" }}>
        <Brand size={22} />
        <span>© 2026 RiftHub. Progetto indipendente, non affiliato a Riot Games. League of Legends è un marchio di Riot Games, Inc.</span>
      </footer>
    </div>
  );
}
