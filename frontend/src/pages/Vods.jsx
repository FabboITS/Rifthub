import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Badge, Empty, Field, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { ROLES, fmtDate, label } from "../lib/format";
import { useList, useManagedTeams } from "../lib/hooks";

export default function Vods() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const vods = useList("vods", "/vod-reviews/", { page_size: 60 });
  const teams = useManagedTeams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", video_url: "", team: "", champion: "", role: "MID", result: "WIN", match_date: "" });
  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v });
  const create = useMutation({
    mutationFn: () => api.post("/vod-reviews/", { ...form, team: form.team || teams.data[0]?.id, match_date: form.match_date || null }).then((r) => r.data),
    onSuccess: (v) => { qc.invalidateQueries({ queryKey: ["vods"] }); navigate(`/vod/${v.id}`); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <div>
      <PageHeader title="VOD review" subtitle="Analisi video con commenti a timestamp e report AI">
        {teams.data.length > 0 && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuova VOD</button>}
      </PageHeader>
      <QueryState query={vods}>
        {(list) => list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <Link key={v.id} to={`/vod/${v.id}`} className="card transition hover:border-hex/60">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{v.title}</h2>
                  {v.result && <Badge color={v.result === "WIN" ? "green" : "red"}>{v.result === "WIN" ? "Vittoria" : "Sconfitta"}</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-400">{v.team_name} · {v.champion} {v.role} · {fmtDate(v.match_date, "d MMM yyyy")}</p>
                <div className="mt-2 flex gap-2">
                  <Badge color="hex">{v.comment_count} commenti</Badge>
                  <Badge>{label(v.video_platform)}</Badge>
                  {v.ai_summary && <Badge color="gold">Report AI</Badge>}
                </div>
              </Link>
            ))}
          </div>
        ) : <Empty>Nessuna VOD.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuova VOD review">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Titolo"><input className="input" value={form.title} onChange={set("title")} required /></Field>
          <Field label="URL video (YouTube o Twitch)"><input className="input" type="url" value={form.video_url} onChange={set("video_url")} required placeholder="https://www.youtube.com/watch?v=..." /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Team"><Select value={form.team || teams.data[0]?.id} onChange={set("team")} options={teams.data.map((t) => [t.id, t.name])} /></Field>
            <Field label="Data"><input className="input" type="date" value={form.match_date} onChange={set("match_date")} /></Field>
            <Field label="Campione"><input className="input" value={form.champion} onChange={set("champion")} /></Field>
            <Field label="Ruolo"><Select value={form.role} onChange={set("role")} options={ROLES} /></Field>
            <Field label="Risultato"><Select value={form.result} onChange={set("result")} options={[["WIN", "Vittoria"], ["LOSS", "Sconfitta"]]} /></Field>
          </div>
          <button className="btn-primary w-full">Crea e apri</button>
        </form>
      </Modal>
    </div>
  );
}
