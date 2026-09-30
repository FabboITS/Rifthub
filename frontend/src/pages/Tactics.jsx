import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Radio } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Badge, Card, Empty, Field, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { fromNow } from "../lib/format";
import { useList, useManagedTeams } from "../lib/hooks";

export default function Tactics() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const boards = useList("boards", "/tactic-boards/", { page_size: 100 });
  const sessions = useList("shadow", "/shadow-sessions/", { page_size: 50 });
  const teams = useManagedTeams();
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ title: "", team: "", description: "" });
  const [shadow, setShadow] = useState({ player: "" });
  const members = teams.data.flatMap((t) => t.members.map((m) => [m.user.id, `${m.user.display_name || m.user.email} (${t.tag})`]));

  const create = useMutation({
    mutationFn: () => api.post("/tactic-boards/", { ...form, team: form.team || teams.data[0]?.id }).then((r) => r.data),
    onSuccess: async (b) => {
      await api.post(`/tactic-boards/${b.id}/frames/`, { label: "Inizio", game_time_seconds: 0 });
      qc.invalidateQueries({ queryKey: ["boards"] });
      navigate(`/tactics/${b.id}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const startShadow = useMutation({
    mutationFn: () => api.post("/shadow-sessions/", { board: open.id, player: shadow.player }).then((r) => r.data),
    onSuccess: (s) => navigate(`/tactics/shadow/${s.id}`),
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Lavagna tattica" subtitle="Setup, rotazioni e shadow coaching sulla mappa">
        {teams.data.length > 0 && <button className="btn-primary" onClick={() => setOpen("new")}><Plus className="h-4 w-4" /> Nuova lavagna</button>}
      </PageHeader>
      <QueryState query={sessions}>
        {(list) => list.filter((s) => s.status === "OPEN").length > 0 && (
          <Card title={<span className="flex items-center gap-2"><Radio className="h-4 w-4 animate-pulse text-rose-400" /> Shadow session aperte</span>}>
            <ul className="space-y-1 text-sm">
              {list.filter((s) => s.status === "OPEN").map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.board_title} · coach {s.coach_name} → {s.player_name}</span>
                  <Link className="btn-gold py-1" to={`/tactics/shadow/${s.id}`}>Entra</Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </QueryState>
      <QueryState query={boards}>
        {(list) => list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <div key={b.id} className="card">
                <Link to={`/tactics/${b.id}`} className="font-semibold hover:text-hex">{b.title}</Link>
                <p className="mt-1 text-xs text-slate-400">{b.team_name} · {b.frame_count} frame · aggiornata {fromNow(b.updated_at)}</p>
                <p className="mt-2 text-sm text-slate-300">{b.description}</p>
                <div className="mt-3 flex gap-2">
                  {b.is_shared && <Badge color="hex">Condivisa</Badge>}
                  <button className="btn-ghost ml-auto py-1 text-xs" onClick={() => { setShadow({ player: members[0]?.[0] || "" }); setOpen(b); }}>
                    <Radio className="h-3 w-3" /> Shadow session
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty>Nessuna lavagna.</Empty>}
      </QueryState>
      <Modal open={open === "new"} onClose={() => setOpen(null)} title="Nuova lavagna">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Titolo"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Team"><Select value={form.team || teams.data[0]?.id} onChange={(v) => setForm({ ...form, team: v })} options={teams.data.map((t) => [t.id, t.name])} /></Field>
          <Field label="Descrizione"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="btn-primary w-full">Crea e apri</button>
        </form>
      </Modal>
      <Modal open={!!open && open !== "new"} onClose={() => setOpen(null)} title="Avvia shadow session">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); startShadow.mutate(); }}>
          <p className="text-sm text-slate-400">Il player vedrà in sola lettura la lavagna e i frame che scegli, aggiornati ogni 2 secondi.</p>
          <Field label="Player"><Select value={shadow.player} onChange={(v) => setShadow({ player: v })} options={members} /></Field>
          <button className="btn-primary w-full" disabled={!shadow.player}>Avvia</button>
        </form>
      </Modal>
    </div>
  );
}
