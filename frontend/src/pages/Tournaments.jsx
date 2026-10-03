import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Button, Card, Input } from "../components/ds";
import { Badge, Empty, Field, Modal, PageHeader, QueryState, Select, up } from "../components/ui";
import { fmtDate, label } from "../lib/format";
import { useList } from "../lib/hooks";

export const STATUS = { REGISTRATION: ["gold", "Iscrizioni aperte"], RUNNING: ["green", "In corso"], FINISHED: ["slate", "Concluso"], DRAFT: ["slate", "Bozza"] };

export default function Tournaments() {
  const qc = useQueryClient();
  const navigate = useNavigate();
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
      <PageHeader title="Tornei" subtitle="Iscrizioni, bracket live e storico di ogni turno">
        <Button size="sm" onClick={() => setOpen(true)}>Nuovo torneo</Button>
      </PageHeader>
      <QueryState query={list}>
        {(ts) => ts.length ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
            {ts.map((t, i) => {
              const [tone, txt] = STATUS[t.status] || ["slate", label(t.status)];
              return (
                <div key={t.id} style={up(80 + Math.min(i, 8) * 70)}>
                  <Card interactive glow={t.status === "RUNNING"} padding={20} onClick={() => navigate(`/tournaments/${t.id}`)} style={{ height: "100%", boxSizing: "border-box" }}>
                    <div className="flex flex-col gap-3">
                      <div className="self-start"><Badge color={tone} dot>{txt}</Badge></div>
                      <span className="font-display text-[22px] font-extrabold leading-tight">{t.name}</span>
                      <span className="text-[13px] text-slate-400">
                        {fmtDate(t.start_date, "d MMM yyyy")} · {t.format === "SINGLE_ELIM" ? "Eliminazione diretta" : "Round robin"} · {t.entries.length}/{t.max_teams} team
                      </span>
                      {t.description && <span className="line-clamp-2 text-[13px] text-slate-300">{t.description}</span>}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        ) : <Empty>Nessun torneo.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} eyebrow="Nuovo torneo" title="Crea torneo">
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Input label="Nome" icon="trophy" placeholder="Es. Coppa Autunno" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Formato"><Select value={form.format} onChange={(v) => setForm({ ...form, format: v })} options={[["SINGLE_ELIM", "Eliminazione"], ["ROUND_ROBIN", "Round robin"]]} /></Field>
            <Field label="Inizio"><input type="date" className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Max team"><input type="number" min={2} max={64} className="input" value={form.max_teams} onChange={(e) => setForm({ ...form, max_teams: +e.target.value })} /></Field>
          </div>
          <Field label="Descrizione"><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Button type="submit" fullWidth disabled={create.isPending}>Crea (iscrizioni aperte)</Button>
        </form>
      </Modal>
    </div>
  );
}
