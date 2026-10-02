import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarWeeks, format, subWeeks } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { results } from "../api/client";
import { Icon } from "../components/ds";
import { Badge, Card, Empty, PageHeader, QueryState, Script, Stat } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fmtDate, fromNow } from "../lib/format";
import { useMyTeams } from "../lib/hooks";

const get = (url, params) => () => api.get(url, { params }).then((r) => results(r.data));
const WEEKS = 10;

/** Ease a number from 0 to target once it is known. */
function useCountUp(target, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Played scrims → totals and win rate per week (null when no games that week). */
export function scrimStats(played, myTeamIds) {
  const now = new Date();
  const weeks = Array.from({ length: WEEKS }, () => [0, 0]);
  let wins = 0;
  for (const s of played) {
    const mineA = myTeamIds.has(s.team_a.id);
    const won = mineA ? s.score_a > s.score_b : s.score_b > s.score_a;
    if (won) wins++;
    const ago = differenceInCalendarWeeks(now, new Date(s.scheduled_at), { weekStartsOn: 1 });
    if (ago >= 0 && ago < WEEKS) {
      weeks[WEEKS - 1 - ago][1]++;
      if (won) weeks[WEEKS - 1 - ago][0]++;
    }
  }
  return {
    played: played.length,
    winRate: played.length ? Math.round((wins / played.length) * 100) : 0,
    weekly: weeks.map(([w, n]) => (n ? Math.round((w / n) * 100) : null)),
  };
}

function WinRateChart({ weekly }) {
  const pts = weekly.map((v, i) => (v === null ? null : [i * (600 / (WEEKS - 1)), 160 - (v / 100) * 150])).filter(Boolean);
  if (pts.length < 2) return <Empty>Servono scrim giocate in almeno due settimane per il grafico.</Empty>;
  const line = "M" + pts.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" L");
  const labels = Array.from({ length: WEEKS }, (_, i) => format(subWeeks(new Date(), WEEKS - 1 - i), "'S'II"));
  return (
    <>
      <svg viewBox="0 0 600 180" preserveAspectRatio="none" className="h-[180px] w-full overflow-visible">
        <defs>
          <linearGradient id="rhArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3dbfeb" stopOpacity=".35" /><stop offset="1" stopColor="#3dbfeb" stopOpacity="0" /></linearGradient>
        </defs>
        {[10, 85, 160].map((y) => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="rgba(255,255,255,.06)" />)}
        <path d={`${line} L${pts.at(-1)[0]},170 L${pts[0][0]},170 Z`} fill="url(#rhArea)" style={{ animation: "rhFade calc(var(--rh-k) * 900ms) ease calc(var(--rh-k) * 900ms) both" }} />
        <path d={line} pathLength="1" fill="none" stroke="#6fd6f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
          style={{ strokeDasharray: 1, filter: "drop-shadow(0 0 6px rgba(61,191,235,.8))", animation: "rhDraw calc(var(--rh-k) * 1400ms) var(--ease-out) calc(var(--rh-k) * 400ms) both" }} />
      </svg>
      <div className="rh-mono flex justify-between text-[11px] font-semibold text-slate-500">{labels.map((l) => <span key={l}>{l}</span>)}</div>
    </>
  );
}

const More = ({ to, children }) => <Link to={to} className="text-xs font-semibold">{children}</Link>;

export default function Dashboard() {
  const { user } = useAuth();
  const mine = useMyTeams();
  const scrims = useQuery({ queryKey: ["dash", "scrims"], queryFn: get("/scrims/", { upcoming: 1, page_size: 5 }) });
  const played = useQuery({ queryKey: ["dash", "played"], queryFn: get("/scrims/", { status: "PLAYED", page_size: 200 }) });
  const tournaments = useQuery({ queryKey: ["dash", "tournaments"], queryFn: get("/tournaments/", { page_size: 50 }) });
  const matches = useQuery({ queryKey: ["dash", "matches"], queryFn: get("/scouting/matches/", { page_size: 4 }) });
  const vods = useQuery({ queryKey: ["dash", "vods"], queryFn: get("/vod-reviews/", { page_size: 4 }) });
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: () => api.get("/ai/status/").then((r) => r.data) });

  const stats = scrimStats(played.data || [], new Set((mine.data || []).map((t) => t.id)));
  const nPlayed = useCountUp(stats.played);
  const wr = useCountUp(stats.winRate);
  const nUpcoming = useCountUp(scrims.data?.length || 0);
  const aiOk = ai.data?.reachable && ai.data.model_available !== false;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={<>Ciao, <Script glow>{user.display_name || user.email}</Script></>} subtitle="Panoramica della tua attività competitiva">
        {ai.data && (
          <Badge color={aiOk ? "green" : "amber"} dot>
            AI: {ai.data.provider} · {ai.data.model}
            {ai.data.reachable ? (ai.data.model_available === false ? " (in download)" : "") : " (offline)"}
          </Badge>
        )}
      </PageHeader>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <Stat label="Scrim giocate" value={nPlayed} hint="Totale registrate dai tuoi team" delay={120} />
        <Stat label="Win rate" value={`${wr}%`} hint="Su tutte le scrim registrate" color="var(--cyan-400)" glow delay={180} />
        <Stat label="Prossime scrim" value={nUpcoming} hint="In programma" color="var(--gold-300)" delay={240} />
      </div>

      <Card title="Win rate settimanale" action={<span className="rh-mono text-xs font-semibold text-slate-400">0–100%</span>} delay={280}>
        <QueryState query={played} cards={1}>{() => <WinRateChart weekly={stats.weekly} />}</QueryState>
      </Card>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
        <Card title={<><Icon name="swords" size={16} color="var(--cyan-400)" />Prossime scrim</>} action={<More to="/scrims">Tutte</More>} delay={340}>
          <QueryState query={scrims} cards={1}>
            {(list) => list.length ? (
              <div className="flex flex-col gap-2">
                {list.map((s, i) => (
                  <div key={s.id} className="rh-row" style={{ animation: `rhUp calc(var(--rh-k) * 420ms) var(--ease-out) calc(var(--rh-k) * ${260 + i * 70}ms) both` }}>
                    <span>{s.team_a.tag} <span className="text-slate-500">vs</span> {s.team_b.tag}</span>
                    <span className="text-xs font-medium text-slate-400">{fmtDate(s.scheduled_at)} · {s.format}</span>
                  </div>
                ))}
              </div>
            ) : <Empty>Nessuna scrim in programma.</Empty>}
          </QueryState>
        </Card>
        <Card title={<><Icon name="trophy" size={16} color="var(--gold-500)" />Tornei attivi</>} action={<More to="/tournaments">Tutti</More>} delay={400}>
          <QueryState query={tournaments} cards={1}>
            {(list) => {
              const active = list.filter((t) => ["RUNNING", "REGISTRATION"].includes(t.status));
              return active.length ? (
                <div className="flex flex-col gap-2">
                  {active.map((t) => (
                    <Link key={t.id} to={`/tournaments/${t.id}`} className="rh-row">
                      <span>{t.name}</span>
                      <Badge color={t.status === "RUNNING" ? "green" : "gold"}>{t.status === "RUNNING" ? "In corso" : "Iscrizioni aperte"}</Badge>
                    </Link>
                  ))}
                </div>
              ) : <Empty>Nessun torneo attivo.</Empty>;
            }}
          </QueryState>
        </Card>
        <Card title={<><Icon name="heart" size={16} color="var(--magenta-400)" />Match di scouting</>} action={<More to="/scouting/matches">Chat</More>} delay={460}>
          <QueryState query={matches} cards={1}>
            {(list) => list.length ? (
              <div className="flex flex-col gap-2">
                {list.map((m) => (
                  <Link key={m.id} to={`/scouting/matches?m=${m.id}`} className="rh-row">
                    <span>{m.player.nickname} <span className="text-slate-500">·</span> {m.team.tag}</span>
                    <span className="text-xs font-medium text-slate-400">{fromNow(m.matched_at)}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty>Ancora nessun match: prova lo swipe!</Empty>}
          </QueryState>
        </Card>
        <Card title={<><Icon name="video" size={16} color="var(--cyan-400)" />Ultime VOD</>} action={<More to="/vod">Tutte</More>} className="col-[1/-1]" delay={520}>
          <QueryState query={vods} cards={2}>
            {(list) => list.length ? (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
                {list.map((v) => (
                  <Link key={v.id} to={`/vod/${v.id}`} className="rh-row flex-col !items-start gap-1 border border-transparent hover:-translate-y-0.5 hover:border-hex/45">
                    <span className="font-bold text-white">{v.title}</span>
                    <span className="text-xs font-medium text-slate-400">{v.team_name} · {v.champion} · {v.comment_count} commenti</span>
                  </Link>
                ))}
              </div>
            ) : <Empty>Nessuna VOD.</Empty>}
          </QueryState>
        </Card>
      </div>
    </div>
  );
}
