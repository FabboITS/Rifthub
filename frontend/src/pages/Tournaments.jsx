import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Badge, Empty, Field, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { fmtDate, label } from "../lib/format";
import { useList } from "../lib/hooks";

const STATUS_COLOR = { REGISTRATION: "gold", RUNNING: "green", FINISHED: "slate", DRAFT: "slate" };

export default function Tournaments() {
  const qc = useQueryClient();
  const list = useList("tournaments", "/tournaments/", { page_size: 50 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", format: "SINGLE_ELIM", start_date: new Date().toISOString().slice(0, 10), max_teams: 8, description: "" });
  const create = useMutation({
    mutationFn: () => api.post("/tournaments/", form),
    onSuccess: () => { toast.success("Torneo creato"); setOpen(false); qc.invalidateQueries({ queryKey: ["tournaments"] }); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div>
      <PageHeader title="Tornei" subtitle="Eliminazione diretta o girone all'italiana, con bracket automatico">
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo torneo</button>
      </PageHeader>
      <QueryState query={list}>
        {(ts) => ts.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ts.map((t) => (
              <Link key={t.id} to={`/tournaments/${t.id}`} className="card transition hover:border-gold/60">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{t.name}</h2>
                  <Badge color={STATUS_COLOR[t.status]}>{label(t.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {t.format === "SINGLE_ELIM" ? "Eliminazione diretta" : "Round robin"} · {fmtDate(t.start_date, "d MMM yyyy")} · {t.entries.length}/{t.max_teams} team
                </p>
                <p className="mt-2 text-sm text-slate-300">{t.description}</p>
                <p className="mt-2 text-xs text-slate-500">Organizzatore: {t.organizer_name}</p>
              </Link>
            ))}
          </div>
        ) : <Empty>Nessun torneo.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuovo torneo">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="Nome"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Formato"><Select value={form.format} onChange={(v) => setForm({ ...form, format: v })} options={[["SINGLE_ELIM", "Eliminazione"], ["ROUND_ROBIN", "Round robin"]]} /></Field>
            <Field label="Inizio"><input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Max team"><input type="number" min={2} max={64} className="input" value={form.max_teams} onChange={(e) => setForm({ ...form, max_teams: +e.target.value })} /></Field>
          </div>
          <Field label="Descrizione"><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button className="btn-primary w-full" disabled={create.isPending}>Crea (iscrizioni aperte)</button>
        </form>
      </Modal>
    </div>
  );
}
