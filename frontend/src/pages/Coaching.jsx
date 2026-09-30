import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Square } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import api, { errMsg } from "../api/client";
import { Badge, Card, Empty, Field, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { fmtDate, label, toLocalInput } from "../lib/format";
import { useList, useMyTeams } from "../lib/hooks";

const STATUS_COLOR = { PLANNED: "hex", DONE: "green", CANCELLED: "slate" };

function Session({ s, isCoach, onChange }) {
  const [item, setItem] = useState("");
  const m = (fn) => ({ mutationFn: fn, onSuccess: onChange, onError: (e) => toast.error(errMsg(e)) });
  const toggle = useMutation(m((it) => api.patch(`/action-items/${it.id}/`, { done: !it.done })));
  const add = useMutation(m(() => api.post("/action-items/", { session: s.id, text: item }).then(() => setItem(""))));
  const status = useMutation(m((st) => api.patch(`/coaching-sessions/${s.id}/`, { status: st })));
  const done = s.action_items.filter((i) => i.done).length;

  return (
    <Card title={s.topic} action={<Badge color={STATUS_COLOR[s.status]}>{label(s.status)}</Badge>}>
      <p className="text-xs text-slate-400">
        {fmtDate(s.scheduled_at)} · {s.duration_minutes} min · coach {s.coach_detail.display_name} → {s.student_detail.display_name}
      </p>
      {s.notes && <p className="mt-2 text-sm">{s.notes}</p>}
      {s.homework && <p className="mt-2 rounded-lg bg-gold/10 p-2 text-sm"><b className="text-gold">Homework:</b> {s.homework}</p>}
      <p className="label mt-3">Action item ({done}/{s.action_items.length})</p>
      <ul className="space-y-1">
        {s.action_items.map((it) => (
          <li key={it.id}>
            <button className="flex items-center gap-2 text-left text-sm" onClick={() => toggle.mutate(it)}>
              {it.done ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4 text-slate-500" />}
              <span className={it.done ? "text-slate-500 line-through" : ""}>{it.text}</span>
            </button>
          </li>
        ))}
      </ul>
      {isCoach && (
        <>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (item.trim()) add.mutate(); }}>
            <input className="input" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Nuovo action item" />
            <button className="btn-ghost" aria-label="Aggiungi item"><Plus className="h-4 w-4" /></button>
          </form>
          {s.status === "PLANNED" && (
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost text-xs" onClick={() => status.mutate("DONE")}>Segna svolta</button>
              <button className="btn-ghost text-xs" onClick={() => status.mutate("CANCELLED")}>Annulla</button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function Coaching() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sessions = useList("coaching", "/coaching-sessions/", { page_size: 100 });
  const teams = useMyTeams();
  const students = [...new Map((teams.data || []).flatMap((t) => t.members)
    .filter((m) => m.user.id !== user.id).map((m) => [m.user.id, m.user.display_name || m.user.email]))];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student: "", topic: "", scheduled_at: toLocalInput(new Date(Date.now() + 86400000)), duration_minutes: 60, homework: "", notes: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["coaching"] });
  const create = useMutation({
    mutationFn: () => api.post("/coaching-sessions/", { ...form, student: form.student || students[0]?.[0], scheduled_at: new Date(form.scheduled_at).toISOString() }),
    onSuccess: () => { toast.success("Sessione pianificata"); setOpen(false); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <PageHeader title="Coaching" subtitle="Sessioni 1:1, homework e action item">
        {user.role !== "PLAYER" && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuova sessione</button>}
      </PageHeader>
      <QueryState query={sessions}>
        {(list) => list.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((s) => <Session key={s.id} s={s} isCoach={s.coach === user.id} onChange={refresh} />)}
          </div>
        ) : <Empty>Nessuna sessione di coaching.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuova sessione">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Studente"><Select value={form.student || students[0]?.[0]} onChange={(v) => setForm({ ...form, student: v })} options={students} /></Field>
          <Field label="Argomento"><input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Quando"><input className="input" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></Field>
            <Field label="Durata (min)"><input className="input" type="number" min={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></Field>
          </div>
          <Field label="Homework"><textarea className="input" rows={2} value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} /></Field>
          <button className="btn-primary w-full" disabled={!students.length}>Crea</button>
        </form>
      </Modal>
    </div>
  );
}
