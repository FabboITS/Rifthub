import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api, { errMsg, results } from "../api/client";
import { Badge, Card, Empty, PageHeader, QueryState } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fmtDate, fromNow, prettyRank } from "../lib/format";

function Chat({ match }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottom = useRef(null);
  const msgs = useQuery({
    queryKey: ["scout-messages", match.id],
    queryFn: () => api.get(`/scouting/matches/${match.id}/messages/`, { params: { page_size: 200 } }).then((r) => results(r.data)),
    refetchInterval: 5000,
  });
  const send = useMutation({
    mutationFn: () => api.post(`/scouting/matches/${match.id}/messages/`, { text }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["scout-messages", match.id] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  useEffect(() => bottom.current?.scrollIntoView?.({ behavior: "smooth" }), [msgs.data]);

  return (
    <Card title={`${match.player.nickname} ↔ ${match.team.name}`} className="flex h-[70vh] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        <QueryState query={msgs}>
          {(list) => list.length ? list.map((m) => {
            const mine = m.sender.id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-hex/20" : "bg-slate-700/60"}`}>
                  <p className="text-[10px] text-slate-400">{m.sender.display_name || m.sender.email} · {fmtDate(m.created_at, "d MMM HH:mm")}</p>
                  {m.text}
                </div>
              </div>
            );
          }) : <Empty>Scrivi il primo messaggio!</Empty>}
        </QueryState>
        <div ref={bottom} />
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio..." />
        <button className="btn-primary" aria-label="Invia" disabled={send.isPending}><Send className="h-4 w-4" /></button>
      </form>
    </Card>
  );
}

export default function ScoutingMatches() {
  const matches = useQuery({ queryKey: ["scout-matches"], queryFn: () => api.get("/scouting/matches/").then((r) => results(r.data)) });
  const [active, setActive] = useState(null);
  return (
    <div>
      <PageHeader title="Match di scouting" subtitle="Team e player che si sono piaciuti a vicenda" />
      <QueryState query={matches}>
        {(list) => list.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <ul className="space-y-2">
              {list.map((m) => (
                <li key={m.id}>
                  <button className={`card w-full text-left transition hover:border-hex/60 ${active?.id === m.id ? "border-hex" : ""}`} onClick={() => setActive(m)}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{m.player.nickname}</span>
                      <Badge color="gold">{prettyRank(m.player.rank)}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{m.player.role} · {m.team.name} · {fromNow(m.matched_at)}</p>
                    {m.last_message && <p className="mt-1 truncate text-xs text-slate-300">“{m.last_message.text}”</p>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="lg:col-span-2">{active ? <Chat key={active.id} match={active} /> : <Empty>Seleziona un match per aprire la chat.</Empty>}</div>
          </div>
        ) : <Empty>Nessun match ancora: vai allo swipe!</Empty>}
      </QueryState>
    </div>
  );
}
