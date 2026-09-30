import { useQuery } from "@tanstack/react-query";
import { Bot, Heart, Swords, Trophy, Video } from "lucide-react";
import { Link } from "react-router-dom";
import api, { results } from "../api/client";
import { Badge, Card, Empty, PageHeader, QueryState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fmtDate, fromNow, label } from "../lib/format";
import { FantaLolCard } from "./FantaLol";

const get = (url, params) => () => api.get(url, { params }).then((r) => results(r.data));

export default function Dashboard() {
  const { user } = useAuth();
  const scrims = useQuery({ queryKey: ["dash", "scrims"], queryFn: get("/scrims/", { upcoming: 1, page_size: 5 }) });
  const tournaments = useQuery({ queryKey: ["dash", "tournaments"], queryFn: get("/tournaments/", { page_size: 50 }) });
  const matches = useQuery({ queryKey: ["dash", "matches"], queryFn: get("/scouting/matches/", { page_size: 4 }) });
  const vods = useQuery({ queryKey: ["dash", "vods"], queryFn: get("/vod-reviews/", { page_size: 4 }) });
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: () => api.get("/ai/status/").then((r) => r.data) });

  return (
    <div>
      <PageHeader title={`Ciao, ${user.display_name || user.email}`} subtitle="Panoramica della tua attività competitiva">
        {ai.data && (
          <Badge color={ai.data.reachable && ai.data.model_available !== false ? "green" : "amber"}>
            <Bot className="mr-1 h-3 w-3" /> AI: {ai.data.provider} · {ai.data.model}
            {ai.data.reachable ? (ai.data.model_available === false ? " (modello in download)" : "") : " (offline)"}
          </Badge>
        )}
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title={<span className="flex items-center gap-2"><Swords className="h-4 w-4 text-hex" /> Prossime scrim</span>}
          action={<Link to="/scrims" className="text-xs text-hex hover:underline">Tutte</Link>}>
          <QueryState query={scrims}>
            {(list) => list.length ? (
              <ul className="space-y-2">
                {list.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span>{s.team_a.tag} <span className="text-slate-500">vs</span> {s.team_b.tag}</span>
                    <span className="text-slate-400">{fmtDate(s.scheduled_at)} · {s.format}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nessuna scrim in programma.</Empty>}
          </QueryState>
        </Card>
        <Card title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-gold" /> Tornei attivi</span>}
          action={<Link to="/tournaments" className="text-xs text-hex hover:underline">Tutti</Link>}>
          <QueryState query={tournaments}>
            {(list) => {
              const active = list.filter((t) => ["RUNNING", "REGISTRATION"].includes(t.status));
              return active.length ? (
                <ul className="space-y-2">
                  {active.map((t) => (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <Link to={`/tournaments/${t.id}`} className="hover:text-hex">{t.name}</Link>
                      <Badge color={t.status === "RUNNING" ? "green" : "gold"}>{label(t.status)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nessun torneo attivo.</Empty>;
            }}
          </QueryState>
        </Card>
        <FantaLolCard />
        <Card title={<span className="flex items-center gap-2"><Heart className="h-4 w-4 text-rose-400" /> Ultimi match di scouting</span>}
          action={<Link to="/scouting/matches" className="text-xs text-hex hover:underline">Chat</Link>}>
          <QueryState query={matches}>
            {(list) => list.length ? (
              <ul className="space-y-2">
                {list.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span>{m.player.nickname} ↔ {m.team.tag}</span>
                    <span className="text-slate-400">{fromNow(m.matched_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty>Ancora nessun match: prova lo swipe!</Empty>}
          </QueryState>
        </Card>
        <Card title={<span className="flex items-center gap-2"><Video className="h-4 w-4 text-hex" /> Ultime VOD</span>}
          action={<Link to="/vod" className="text-xs text-hex hover:underline">Tutte</Link>} className="xl:col-span-2">
          <QueryState query={vods}>
            {(list) => list.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((v) => (
                  <li key={v.id}>
                    <Link to={`/vod/${v.id}`} className="block rounded-lg bg-slate-900/60 p-3 hover:bg-slate-900">
                      <p className="font-medium">{v.title}</p>
                      <p className="text-xs text-slate-400">{v.team_name} · {v.champion} · {v.comment_count} commenti</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nessuna VOD.</Empty>}
          </QueryState>
        </Card>
      </div>
    </div>
  );
}
