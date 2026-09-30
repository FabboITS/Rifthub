import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api, { errMsg } from "../api/client";
import { Badge, Loading, Card, Empty, Field, Modal, PageHeader, QueryState, ScoreBar, Select } from "../components/ui";
import { RANK_OPTIONS, TIERS, fmtDate, label, toLocalInput } from "../lib/format";
import { useList, useManagedTeams } from "../lib/hooks";

function Candidates({ data }) {
  if (!data.length) return <Empty>Nessun avversario compatibile (servono altre richieste aperte).</Empty>;
  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.team_id} className="rounded-lg bg-slate-900/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">{c.team_name}</span>
            <span className="font-display text-xl text-hex">{c.score}<span className="text-xs text-slate-500">/100</span></span>
          </div>
          <ScoreBar value={c.score} />
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-slate-400">
            <span>Disponibilità {c.breakdown.availability}/40</span>
            <span>Rank {c.breakdown.rank}/30</span>
            <span>Regione/tier {c.breakdown.region_tier}/15</span>
            <span>Varietà {c.breakdown.variety}/15</span>
          </div>
          <ul className="mt-2 list-inside list-disc text-xs text-slate-300">
            {c.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function WeekCalendar({ scrims }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  return (
    <Card title={`Settimana del ${format(week, "d MMMM", { locale: it })}`} action={
      <div className="flex gap-1">
        <button className="btn-ghost p-1" aria-label="Settimana precedente" onClick={() => setWeek(addWeeks(week, -1))}><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-ghost p-1" aria-label="Settimana successiva" onClick={() => setWeek(addWeeks(week, 1))}><ChevronRight className="h-4 w-4" /></button>
      </div>
    }>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
        {days.map((d) => {
          const today = scrims.filter((s) => isSameDay(new Date(s.scheduled_at), d));
          return (
            <div key={d.toISOString()} className={`min-h-24 rounded-lg border p-2 ${isSameDay(d, new Date()) ? "border-hex/60" : "border-slate-700/60"}`}>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">{format(d, "EEE d", { locale: it })}</p>
              {today.map((s) => (
                <div key={s.id} className={`mb-1 rounded px-1.5 py-1 text-[11px] ${s.status === "PLAYED" ? "bg-slate-700/60" : "bg-hex/15 text-hex"}`}>
                  {format(new Date(s.scheduled_at), "HH:mm")} {s.team_a.tag} v {s.team_b.tag}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ResultForm({ scrim, onSaved }) {
  const [score, setScore] = useState({ score_a: 0, score_b: 0 });
  const save = useMutation({
    mutationFn: () => api.post(`/scrims/${scrim.id}/report-result/`, score),
    onSuccess: () => { toast.success("Risultato salvato"); onSaved(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <input type="number" min={0} className="input w-14 px-2 py-1" value={score.score_a} onChange={(e) => setScore({ ...score, score_a: +e.target.value })} aria-label="Punteggio A" />
      <span>-</span>
      <input type="number" min={0} className="input w-14 px-2 py-1" value={score.score_b} onChange={(e) => setScore({ ...score, score_b: +e.target.value })} aria-label="Punteggio B" />
      <button className="btn-ghost px-2 py-1 text-xs">Salva</button>
    </form>
  );
}

export default function Scrims() {
  const qc = useQueryClient();
  const teams = useManagedTeams();
  const [team, setTeam] = useState("");
  useEffect(() => { if (!team && teams.data.length) setTeam(teams.data[0].id); }, [team, teams.data]);
  const requests = useList("scrim-requests", "/scrim-requests/", { team, page_size: 50 }, { enabled: !!team });
  const scrims = useList("scrims", "/scrims/", { team, page_size: 100, ordering: "scheduled_at" }, { enabled: !!team });
  const [candidates, setCandidates] = useState(null);
  const [form, setForm] = useState({
    format: "BO3", desired_tier: "", min_rank_score: 1600, max_rank_score: 3000,
    preferred_start: toLocalInput(addDays(new Date(), 2).setHours(20, 0, 0, 0)),
  });
  const refresh = () => ["scrim-requests", "scrims", "dash"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const create = useMutation({
    mutationFn: () => api.post("/scrim-requests/", { ...form, team, preferred_start: new Date(form.preferred_start).toISOString() }),
    onSuccess: () => { toast.success("Richiesta creata"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const find = useMutation({
    mutationFn: (id) => api.post(`/scrim-requests/${id}/find-matches/`).then((r) => r.data.candidates),
    onSuccess: setCandidates,
    onError: (e) => toast.error(errMsg(e)),
  });
  const auto = useMutation({
    mutationFn: (id) => api.post(`/scrim-requests/${id}/auto-match/`).then((r) => r.data),
    onSuccess: (s) => { toast.success(`Scrim creata vs ${s.team_b.name} (${s.match.score}/100)`); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const cancel = useMutation({
    mutationFn: (id) => api.patch(`/scrim-requests/${id}/`, { status: "CANCELLED" }),
    onSuccess: refresh,
  });

  if (teams.isPending) return <Loading />;
  if (!teams.data.length) return <Empty>Serve un team che gestisci per organizzare scrim.</Empty>;

  return (
    <div className="space-y-4">
      <PageHeader title="Scrim" subtitle="Matchmaking automatico per compatibilità di orari, rank, regione e varietà">
        <div className="w-56"><Select value={team} onChange={setTeam} options={teams.data.map((t) => [t.id, t.name])} /></div>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Nuova richiesta">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Formato"><Select value={form.format} onChange={(v) => setForm({ ...form, format: v })} options={["BO1", "BO2", "BO3", "BO5"]} /></Field>
              <Field label="Tier desiderato"><Select value={form.desired_tier} onChange={(v) => setForm({ ...form, desired_tier: v })} options={TIERS.map((t) => [t, label(t)])} placeholder="Stesso tier" /></Field>
            </div>
            <Field label="Inizio preferito"><input type="datetime-local" className="input" value={form.preferred_start} onChange={(e) => setForm({ ...form, preferred_start: e.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rank min"><Select value={form.min_rank_score} onChange={(v) => setForm({ ...form, min_rank_score: +v })} options={RANK_OPTIONS} /></Field>
              <Field label="Rank max"><Select value={form.max_rank_score} onChange={(v) => setForm({ ...form, max_rank_score: +v })} options={RANK_OPTIONS} /></Field>
            </div>
            <button className="btn-primary w-full" disabled={create.isPending}>Pubblica richiesta</button>
          </form>
        </Card>
        <Card title="Le tue richieste" className="lg:col-span-2">
          <QueryState query={requests}>
            {(list) => list.length ? (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/60 p-3 text-sm">
                    <span>
                      <b>{r.format}</b> · {fmtDate(r.preferred_start)} {r.desired_tier && `· ${label(r.desired_tier)}`}
                      <span className="ml-2"><Badge color={r.status === "OPEN" ? "green" : r.status === "MATCHED" ? "hex" : "slate"}>{label(r.status)}</Badge></span>
                    </span>
                    {r.status === "OPEN" && (
                      <span className="flex gap-2">
                        <button className="btn-gold" onClick={() => find.mutate(r.id)} disabled={find.isPending}><Search className="h-4 w-4" /> Trova avversario</button>
                        <button className="btn-primary" onClick={() => auto.mutate(r.id)} disabled={auto.isPending}><Wand2 className="h-4 w-4" /> Auto-match</button>
                        <button className="btn-ghost" onClick={() => cancel.mutate(r.id)}>Annulla</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : <Empty>Nessuna richiesta: pubblicane una.</Empty>}
          </QueryState>
        </Card>
      </div>
      <QueryState query={scrims}>
        {(list) => (
          <>
            <WeekCalendar scrims={list} />
            <Card title="Scrim del team">
              {list.length ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400">
                    <tr><th className="py-1">Data</th><th>Match</th><th>Formato</th><th>Stato</th><th>Risultato</th></tr>
                  </thead>
                  <tbody>
                    {list.map((s) => (
                      <tr key={s.id} className="border-t border-slate-700/60">
                        <td className="py-2">{fmtDate(s.scheduled_at)}</td>
                        <td>{s.team_a.name} vs {s.team_b.name}</td>
                        <td>{s.format}</td>
                        <td><Badge color={s.status === "SCHEDULED" ? "hex" : "slate"}>{label(s.status)}</Badge></td>
                        <td>{s.status === "PLAYED" ? `${s.score_a} - ${s.score_b}` : s.status === "SCHEDULED" ? <ResultForm scrim={s} onSaved={refresh} /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty>Nessuna scrim.</Empty>}
            </Card>
          </>
        )}
      </QueryState>
      <Modal open={!!candidates} onClose={() => setCandidates(null)} title="Avversari compatibili" wide>
        {candidates && <Candidates data={candidates} />}
      </Modal>
    </div>
  );
}
