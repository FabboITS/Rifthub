import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Badge, Empty, Field, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { REGIONS, TIERS, label } from "../lib/format";
import { useList } from "../lib/hooks";

function TeamForm({ onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", tag: "", region: "EUW", tier: "AMATEUR", description: "" });
  const set = (k) => (v) => setForm({ ...form, [k]: v?.target ? v.target.value : v });
  const create = useMutation({
    mutationFn: () => api.post("/teams/", form),
    onSuccess: () => {
      toast.success("Team creato");
      qc.invalidateQueries({ queryKey: ["teams"] });
      onDone();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Field label="Nome"><input className="input" value={form.name} onChange={set("name")} required /></Field></div>
        <Field label="Tag"><input className="input" value={form.tag} onChange={set("tag")} maxLength={5} required /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Regione"><Select value={form.region} onChange={set("region")} options={REGIONS} /></Field>
        <Field label="Tier"><Select value={form.tier} onChange={set("tier")} options={TIERS.map((t) => [t, label(t)])} /></Field>
      </div>
      <Field label="Descrizione"><textarea className="input" rows={3} value={form.description} onChange={set("description")} /></Field>
      <button className="btn-primary w-full" disabled={create.isPending}>Crea team</button>
    </form>
  );
}

export default function Teams() {
  const [filters, setFilters] = useState({ region: "", tier: "", search: "" });
  const [open, setOpen] = useState(false);
  const teams = useList("teams", "/teams/", { ...filters, page_size: 100 });
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });

  return (
    <div>
      <PageHeader title="Team" subtitle="Roster, tier e disponibilità dei team">
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo team</button>
      </PageHeader>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Cerca per nome o tag..." value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        <Select value={filters.region} onChange={set("region")} options={REGIONS} placeholder="Tutte le regioni" />
        <Select value={filters.tier} onChange={set("tier")} options={TIERS.map((t) => [t, label(t)])} placeholder="Tutti i tier" />
      </div>
      <QueryState query={teams}>
        {(list) => list.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <Link key={t.id} to={`/teams/${t.id}`} className="card transition hover:border-hex/60">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{t.name}</h2>
                  <span className="font-display text-lg text-gold">{t.tag}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Badge color="hex">{t.region}</Badge>
                  <Badge color="gold">{label(t.tier)}</Badge>
                  {t.can_edit && <Badge color="green">Gestisci</Badge>}
                </div>
                <p className="mt-2 text-sm text-slate-400">{t.members.length} membri · {t.description}</p>
              </Link>
            ))}
          </div>
        ) : <Empty>Nessun team trovato.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuovo team"><TeamForm onDone={() => setOpen(false)} /></Modal>
    </div>
  );
}
