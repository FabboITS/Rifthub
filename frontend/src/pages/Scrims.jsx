import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, format, isSameDay, startOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api, { errMsg } from "../api/client";
import { Button, IconButton, Tag } from "../components/ds";
import { Badge, Card, ChipGroup, Empty, Field, Loading, Modal, PageHeader, QueryState, ResultPicker, ScoreBar, Select, up } from "../components/ui";
import { RANK_OPTIONS, TIERS, fmtDate, label, resultOptions } from "../lib/format";
import { useList, useManagedTeams } from "../lib/hooks";

const FORMATS = ["BO1", "BO2", "BO3", "BO5"];
const TIMES = ["19:00", "20:00", "21:00", "22:00"];
const REQ = { OPEN: ["green", "Aperta"], MATCHED: ["hex", "Abbinata"], CANCELLED: ["slate", "Annullata"] };
const BARS = [["availability", "Disponibilità", 40], ["rank", "Rank", 30], ["region_tier", "Regione/tier", 15], ["variety", "Varietà", 15]];
const dayLabel = (d) => format(d, "EEE d MMM", { locale: it });

function Candidates({ data }) {
  if (!data.length) return <Empty>Nessun avversario compatibile (servono altre richieste aperte).</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {data.map((c, i) => (
        <div key={c.team_id} className="flex flex-col gap-3 rounded-[14px] border border-white/10 p-4 transition hover:border-hex/50"
          style={{ background: "rgba(12,9,8,.5)", ...up(120 + i * 110, 480) }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-display font-extrabold text-[19px]">{c.team_name}</span>
            <span className="rh-mono text-[26px] font-bold text-hex" style={{ textShadow: "var(--text-glow)" }}>{c.score}<span className="text-xs text-slate-500">/100</span></span>
          </div>
          <ScoreBar value={c.score} delay={120 + i * 110} />
          <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
            {BARS.map(([k, l, max], j) => (
              <div key={k} className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-400"><span>{l}</span><span className="rh-mono">{c.breakdown[k]}/{max}</span></div>
                <ScoreBar value={c.breakdown[k]} max={max} thin delay={260 + i * 110 + j * 60} />
              </div>
            ))}
          </div>
          <ul className="m-0 pl-[18px] text-[13px] leading-relaxed text-slate-300">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

function WeekCalendar({ scrims }) {
  const [week, setWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  return (
    <Card delay={260} title={`Settimana del ${format(week, "d MMMM", { locale: it })}`} action={
      <div className="flex gap-1.5">
        <IconButton icon="chevron-left" size={32} label="Settimana precedente" onClick={() => setWeek(addWeeks(week, -1))} />
        <IconButton icon="chevron-right" size={32} label="Settimana successiva" onClick={() => setWeek(addWeeks(week, 1))} />
      </div>
    }>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))" }}>
        {days.map((d, n) => {
          const today = isSameDay(d, new Date());
          return (
            <div key={d.toISOString()} className="flex min-h-24 flex-col gap-1.5 rounded-xl border p-2.5 transition-colors duration-300"
              style={{ borderColor: today ? "rgba(255,150,80,.6)" : "var(--border-subtle)", boxShadow: today ? "0 0 18px rgba(255,107,26,.2)" : "none" }}>
              <span className="text-[13px] font-semibold text-slate-400">{dayLabel(d)}</span>
              {scrims.filter((s) => isSameDay(new Date(s.scheduled_at), d)).map((s, j) => (
                <span key={s.id} className="rounded-lg px-2 py-1 text-[11px] font-semibold"
                  style={{ background: s.status === "PLAYED" ? "rgba(255,255,255,.07)" : "rgba(255,107,26,.16)", color: s.status === "PLAYED" ? "var(--ink-300)" : "var(--cyan-200)", animation: `rhPop calc(var(--rh-k) * 360ms) var(--ease-out) calc(var(--rh-k) * ${120 + n * 40 + j * 40}ms) both` }}>
                  {format(new Date(s.scheduled_at), "HH:mm")} {s.team_a.tag} v {s.team_b.tag}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
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
  const [scoring, setScoring] = useState(null);
  const nextDays = Array.from({ length: 6 }, (_, i) => addDays(new Date(), i + 1));
  const [form, setForm] = useState({ format: "BO3", desired_tier: "", min_rank_score: 1600, max_rank_score: 3000, day: format(nextDays[1], "yyyy-MM-dd"), time: "20:00" });
  const setF = (k, v) => setForm({ ...form, [k]: v });
  const refresh = () => ["scrim-requests", "scrims", "dash"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const fail = (e) => toast.error(errMsg(e));

  const create = useMutation({
    mutationFn: () => {
      const { day, time, ...rest } = form;
      return api.post("/scrim-requests/", { ...rest, team, preferred_start: new Date(`${day}T${time}`).toISOString() });
    },
    onSuccess: () => { toast.success(`Richiesta creata · ${form.format} · ${dayLabel(new Date(`${form.day}T12:00`))} · ${form.time}`); refresh(); },
    onError: fail,
  });
  const find = useMutation({
    mutationFn: (r) => api.post(`/scrim-requests/${r.id}/find-matches/`).then((res) => ({ req: r, list: res.data.candidates })),
    onSuccess: setCandidates,
    onError: fail,
  });
  const auto = useMutation({
    mutationFn: (id) => api.post(`/scrim-requests/${id}/auto-match/`).then((r) => r.data),
    onSuccess: (s) => { toast.success(`Scrim creata vs ${s.team_b.name} (${s.match.score}/100)`); refresh(); },
    onError: fail,
  });
  const cancel = useMutation({
    mutationFn: (id) => api.patch(`/scrim-requests/${id}/`, { status: "CANCELLED" }),
    onSuccess: () => { toast("Richiesta annullata"); refresh(); },
    onError: fail,
  });
  const report = useMutation({
    mutationFn: (score) => api.post(`/scrims/${scoring.id}/report-result/`, score),
    onSuccess: () => { toast.success("Risultato salvato"); setScoring(null); refresh(); },
    onError: fail,
  });

  if (teams.isPending) return <Loading />;
  if (!teams.data.length) return <Empty>Serve un team che gestisci per organizzare scrim.</Empty>;
  const teamName = teams.data.find((t) => t.id === team)?.name;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow={teamName || "Scrim"} title="Scrim" subtitle="Matchmaking automatico per compatibilità di orari, rank, regione e varietà">
        {teams.data.length > 1 && teams.data.map((t) => <Tag key={t.id} selected={t.id === team} onClick={() => setTeam(t.id)}>{t.tag}</Tag>)}
      </PageHeader>
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))" }}>
        <Card title="Nuova richiesta" delay={140}>
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <ChipGroup label="Formato">{FORMATS.map((f) => <Tag key={f} selected={form.format === f} onClick={() => setF("format", f)}>{f}</Tag>)}</ChipGroup>
            <ChipGroup label="Giorno">
              {nextDays.map((d) => { const iso = format(d, "yyyy-MM-dd"); return <Tag key={iso} selected={form.day === iso} onClick={() => setF("day", iso)}>{dayLabel(d)}</Tag>; })}
            </ChipGroup>
            <ChipGroup label="Orario">{TIMES.map((t) => <Tag key={t} selected={form.time === t} onClick={() => setF("time", t)}>{t}</Tag>)}</ChipGroup>
            <ChipGroup label="Tier avversario">
              {[["", "Stesso tier"], ...TIERS.map((t) => [t, label(t)])].map(([v, l]) => <Tag key={l} selected={form.desired_tier === v} onClick={() => setF("desired_tier", v)}>{l}</Tag>)}
            </ChipGroup>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rank min"><Select value={form.min_rank_score} onChange={(v) => setF("min_rank_score", +v)} options={RANK_OPTIONS} /></Field>
              <Field label="Rank max"><Select value={form.max_rank_score} onChange={(v) => setF("max_rank_score", +v)} options={RANK_OPTIONS} /></Field>
            </div>
            <Button type="submit" fullWidth disabled={create.isPending || !team}>Pubblica richiesta</Button>
          </form>
        </Card>
        <Card title="Le tue richieste" delay={200}>
          <QueryState query={requests} cards={1}>
            {(list) => list.length ? (
              <div className="flex flex-col gap-2">
                {list.map((r, i) => {
                  const [tone, txt] = REQ[r.status] || ["slate", label(r.status)];
                  return (
                    <div key={r.id} className="flex flex-col gap-2.5 rounded-[14px] px-3.5 py-3" style={{ background: "rgba(12,9,8,.45)", ...up(160 + i * 60, 460) }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold"><b>{r.format}</b> · {fmtDate(r.preferred_start)} · {r.desired_tier ? label(r.desired_tier) : "Stesso tier"}</span>
                        <Badge color={tone} dot>{txt}</Badge>
                      </div>
                      {r.status === "OPEN" && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" trailingIcon="search" onClick={() => find.mutate(r)} disabled={find.isPending}>Trova avversario</Button>
                          <Button size="sm" onClick={() => auto.mutate(r.id)} disabled={auto.isPending}>Auto-match</Button>
                          <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>Annulla</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <Empty>Nessuna richiesta: pubblicane una.</Empty>}
          </QueryState>
        </Card>
      </div>
      <QueryState query={scrims} cards={2}>
        {(list) => (
          <>
            <WeekCalendar scrims={list} />
            <Card title="Scrim del team" delay={320}>
              {list.length ? (
                <div className="flex flex-col">
                  {list.map((s, i) => {
                    const mineA = s.team_a.id === team;
                    const won = mineA ? s.score_a > s.score_b : s.score_b > s.score_a;
                    return (
                      <div key={s.id} className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/5 px-1 py-2.5" style={up(200 + Math.min(i, 10) * 50, 420)}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">{s.team_a.name} <span className="text-slate-500">vs</span> {s.team_b.name}</span>
                          <span className="text-xs text-slate-400">{fmtDate(s.scheduled_at)} · {s.format}</span>
                        </div>
                        {s.status === "PLAYED" && (
                          <div style={{ animation: "rhPop calc(var(--rh-k) * 320ms) var(--ease-out) both" }}>
                            <Badge color={s.score_a === s.score_b ? "slate" : won ? "green" : "red"}>
                              {s.score_a === s.score_b ? "Pareggio" : won ? "Vittoria" : "Sconfitta"} {s.score_a}–{s.score_b}
                            </Badge>
                          </div>
                        )}
                        {s.status === "SCHEDULED" && <Button size="sm" variant="outline" onClick={() => setScoring(s)}>Risultato</Button>}
                        {s.status === "CANCELLED" && <Badge>Annullata</Badge>}
                      </div>
                    );
                  })}
                </div>
              ) : <Empty>Nessuna scrim.</Empty>}
            </Card>
          </>
        )}
      </QueryState>
      <Modal open={!!candidates} onClose={() => setCandidates(null)} wide title="Avversari compatibili"
        eyebrow={candidates && `${candidates.req.format} · ${fmtDate(candidates.req.preferred_start)}`}>
        {candidates && <Candidates data={candidates.list} />}
      </Modal>
      <Modal open={!!scoring} onClose={() => setScoring(null)} title={scoring ? `${scoring.team_a.tag} vs ${scoring.team_b.tag}` : ""} eyebrow={scoring?.format}>
        {scoring && <ResultPicker a={scoring.team_a.name} b={scoring.team_b.name} options={resultOptions(scoring.format)} onPick={report.mutate} disabled={report.isPending} />}
      </Modal>
    </div>
  );
}
