import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import api, { errMsg, results } from "../api/client";
import BoardCanvas from "../components/BoardCanvas";
import YouTubePlayer from "../components/YouTubePlayer";
import { Badge, Card, Empty, Loading, PageHeader, QueryState, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { SEVERITIES, SEVERITY_COLOR, VOD_CATEGORIES, label, mmss, youtubeId } from "../lib/format";
import { useList } from "../lib/hooks";

function Overlay({ vodId, time, canEdit }) {
  const qc = useQueryClient();
  const overlays = useList("overlays", "/replay-overlays/", { vod_review: vodId });
  const boards = useList("boards", "/tactic-boards/", { page_size: 100 }, { enabled: canEdit });
  const [form, setForm] = useState({ board: "", offset_seconds: 0 });
  const add = useMutation({
    mutationFn: () => api.post("/replay-overlays/", { ...form, vod_review: vodId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["overlays"] }),
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Card title={<span className="flex items-center gap-2"><Layers className="h-4 w-4 text-gold" /> Replay overlay</span>}>
      <QueryState query={overlays}>
        {(list) => list.length ? list.map((o) => {
          const frames = o.board_detail.frames;
          const current = [...frames].reverse().find((f) => f.game_time_seconds + o.offset_seconds <= time);
          return (
            <div key={o.id} className="mb-3">
              <p className="mb-1 text-xs text-slate-400">{o.board_detail.title} · offset {o.offset_seconds}s</p>
              {current ? (
                <>
                  <BoardCanvas elements={current.elements} />
                  <p className="mt-1 text-sm"><Badge color="gold">{mmss(current.game_time_seconds + o.offset_seconds)}</Badge> {current.label}</p>
                </>
              ) : <Empty>Il primo frame compare a {mmss(frames[0]?.game_time_seconds + o.offset_seconds || 0)}.</Empty>}
            </div>
          );
        }) : <Empty>Nessuna lavagna collegata.</Empty>}
      </QueryState>
      {canEdit && (
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Select value={form.board} onChange={(v) => setForm({ ...form, board: v })} options={(boards.data || []).map((b) => [b.id, b.title])} placeholder="Collega lavagna" required />
          <input className="input w-20" type="number" value={form.offset_seconds} onChange={(e) => setForm({ ...form, offset_seconds: +e.target.value })} aria-label="Offset secondi" />
          <button className="btn-ghost" disabled={!form.board}>Aggiungi</button>
        </form>
      )}
    </Card>
  );
}

export default function VodDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const player = useRef(null);
  const [time, setTime] = useState(0);
  const onTime = useCallback((t) => setTime(t), []);
  const [filters, setFilters] = useState({ category: "", severity: "" });
  const [form, setForm] = useState({ category: "MACRO", severity: "INFO", text: "", manual: "" });

  const vod = useQuery({ queryKey: ["vod", id], queryFn: () => api.get(`/vod-reviews/${id}/`).then((r) => r.data) });
  const teams = useQuery({ queryKey: ["teams", "mine"], queryFn: () => api.get("/teams/mine/").then((r) => r.data) });
  const comments = useQuery({
    queryKey: ["vod-comments", id, filters],
    queryFn: () => api.get("/vod-comments/", { params: { review: id, ...filters, page_size: 200 } }).then((r) => results(r.data)),
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["vod-comments", id] }); qc.invalidateQueries({ queryKey: ["vod", id] }); };

  const addComment = useMutation({
    mutationFn: () => {
      const ts = form.manual !== "" ? +form.manual : Math.floor(player.current?.getCurrentTime() || time);
      return api.post("/vod-comments/", { review: id, timestamp_seconds: ts, category: form.category, severity: form.severity, text: form.text });
    },
    onSuccess: () => { setForm({ ...form, text: "", manual: "" }); refresh(); toast.success("Commento aggiunto"); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const delComment = useMutation({ mutationFn: (cid) => api.delete(`/vod-comments/${cid}/`), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const ai = useMutation({
    mutationFn: () => api.post("/ai/vod-summary/", { vod_review_id: id }),
    onSuccess: () => { toast.success("Report AI generato"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <QueryState query={vod}>
      {(v) => {
        const yt = youtubeId(v.video_url);
        const canEdit = (teams.data || []).some((t) => t.id === v.team && t.can_edit);
        return (
          <div className="space-y-4">
            <PageHeader title={v.title} subtitle={`${v.team_name} · ${v.champion} ${v.role} · reviewer ${v.reviewer_name}`}>
              {v.result && <Badge color={v.result === "WIN" ? "green" : "red"}>{v.result === "WIN" ? "Vittoria" : "Sconfitta"}</Badge>}
              <button className="btn-gold" onClick={() => ai.mutate()} disabled={ai.isPending}><Sparkles className="h-4 w-4" /> Genera report AI</button>
            </PageHeader>
            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              <div className="space-y-4">
                {yt ? <YouTubePlayer ref={player} videoId={yt} onTime={onTime} /> : (
                  <Card><p className="text-sm">Video non YouTube: <a className="text-hex underline" href={v.video_url} target="_blank" rel="noopener noreferrer">apri il video</a> e indica il minuto a mano nei commenti.</p></Card>
                )}
                {(ai.isPending || v.ai_summary) && (
                  <Card title="Report AI">
                    {ai.isPending ? <Loading label="Generazione del report in corso (può richiedere fino a un paio di minuti con Ollama in CPU)..." />
                      : <div className="whitespace-pre-wrap text-sm leading-relaxed">{v.ai_summary}</div>}
                  </Card>
                )}
                <Overlay vodId={id} time={time} canEdit={canEdit} />
              </div>
              <Card title={`Commenti · ${mmss(time)}`} className="h-fit">
                <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); addComment.mutate(); }}>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={form.category} onChange={(c) => setForm({ ...form, category: c })} options={VOD_CATEGORIES.map((c) => [c, label(c)])} />
                    <Select value={form.severity} onChange={(s) => setForm({ ...form, severity: s })} options={SEVERITIES.map((s) => [s, label(s)])} />
                    <input className="input" type="number" min={0} placeholder={yt ? "auto" : "sec"} value={form.manual}
                      onChange={(e) => setForm({ ...form, manual: e.target.value })} aria-label="Secondi (vuoto = tempo corrente)" />
                  </div>
                  <textarea className="input" rows={2} placeholder="Commento al tempo corrente..." value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} required />
                  <button className="btn-primary w-full" disabled={addComment.isPending}>Aggiungi a {form.manual !== "" ? mmss(+form.manual) : mmss(time)}</button>
                </form>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <Select value={filters.category} onChange={(c) => setFilters({ ...filters, category: c })} options={VOD_CATEGORIES.map((c) => [c, label(c)])} placeholder="Tutte le categorie" />
                  <Select value={filters.severity} onChange={(s) => setFilters({ ...filters, severity: s })} options={SEVERITIES.map((s) => [s, label(s)])} placeholder="Tutte le gravità" />
                </div>
                <QueryState query={comments}>
                  {(list) => list.length ? (
                    <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                      {list.map((c) => (
                        <li key={c.id} className={`group rounded-lg p-2 text-sm transition ${Math.abs(c.timestamp_seconds - time) < 3 ? "bg-hex/15" : "bg-slate-900/60 hover:bg-slate-900"}`}>
                          <button className="w-full text-left" onClick={() => player.current?.seekTo(c.timestamp_seconds)}>
                            <span className="flex flex-wrap items-center gap-1">
                              <span className="font-mono text-hex">{mmss(c.timestamp_seconds)}</span>
                              <Badge>{label(c.category)}</Badge>
                              <Badge color={SEVERITY_COLOR[c.severity]}>{label(c.severity)}</Badge>
                            </span>
                            <span className="mt-1 block">{c.text}</span>
                            <span className="text-[10px] text-slate-500">{c.author_name}</span>
                          </button>
                          {(c.author === user.id || canEdit) && (
                            <button className="float-right -mt-5 hidden text-rose-400 group-hover:block" aria-label="Elimina commento" onClick={() => delComment.mutate(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <Empty>Nessun commento.</Empty>}
                </QueryState>
              </Card>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
