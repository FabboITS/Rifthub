import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Button, Input } from "../components/ds";
import { Badge, Empty, Field, Modal, PageHeader, QueryState, Select, up } from "../components/ui";
import { REGIONS, TIERS, label } from "../lib/format";
import { useList } from "../lib/hooks";

const TINTS = ["cyan", "violet", "gold", "magenta"];

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
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
      <Input label="Nome del team" icon="users" placeholder="Es. Nova Esports" value={form.name} onChange={set("name")} required />
      <Input label="Tag" icon="hash" placeholder="NOV" value={form.tag} onChange={(e) => set("tag")(e.target.value.toUpperCase())} maxLength={5} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Regione"><Select value={form.region} onChange={set("region")} options={REGIONS} /></Field>
        <Field label="Tier"><Select value={form.tier} onChange={set("tier")} options={TIERS.map((t) => [t, label(t)])} /></Field>
      </div>
      <Field label="Descrizione"><textarea className="input" rows={3} value={form.description} onChange={set("description")} /></Field>
      <Button type="submit" fullWidth disabled={create.isPending}>Crea team</Button>
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
      <PageHeader title="Team" subtitle="I team di cui fai parte e che gestisci">
        <Button size="sm" onClick={() => setOpen(true)}>Crea team</Button>
      </PageHeader>
      <div className="mb-5 grid gap-3 sm:grid-cols-3" style={up(140)}>
        <input className="input" placeholder="Cerca per nome o tag..." value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        <Select value={filters.region} onChange={set("region")} options={REGIONS} placeholder="Tutte le regioni" />
        <Select value={filters.tier} onChange={set("tier")} options={TIERS.map((t) => [t, label(t)])} placeholder="Tutti i tier" />
      </div>
      <QueryState query={teams}>
        {(list) => list.length ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
            {list.map((t, i) => (
              <Link key={t.id} to={`/teams/${t.id}`} style={up(80 + Math.min(i, 8) * 80, 560)}
                className="card group !p-0 overflow-hidden !text-white transition duration-200 hover:-translate-y-1 hover:border-hex/55 hover:shadow-[var(--shadow-card),0_0_24px_rgba(61,191,235,.25)]">
                <div className="relative h-[110px]" style={{ background: `var(--grad-tint-${TINTS[i % TINTS.length]})` }}>
                  <div className="absolute inset-0" style={{ background: "var(--grad-scrim-bottom)" }} />
                  <span className="absolute bottom-3 left-5 text-[44px] font-black leading-none tracking-[.02em]">{t.tag}</span>
                </div>
                <div className="flex flex-col gap-3 px-5 py-[18px]">
                  <span className="text-[15px] font-extrabold uppercase tracking-[.06em]">{t.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge color="hex">{t.region}</Badge>
                    <Badge color="gold">{label(t.tier)}</Badge>
                    {t.can_edit && <Badge color="green">Gestisci</Badge>}
                  </div>
                  <div className="flex justify-between gap-3 text-[13px] text-slate-400">
                    <span>{t.members.length} membri</span>
                    <span className="truncate">{t.description}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : <Empty>Nessun team trovato.</Empty>}
      </QueryState>
      <Modal open={open} onClose={() => setOpen(false)} eyebrow="Nuovo team" title="Crea team"><TeamForm onDone={() => setOpen(false)} /></Modal>
    </div>
  );
}
