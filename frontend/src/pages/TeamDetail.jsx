import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Button, Icon, IconButton, Input, Tag } from "../components/ds";
import { Badge, Card, PageHeader, QueryState, up } from "../components/ui";
import { TEAM_ROLES, WEEKDAYS, label } from "../lib/format";
import { useList } from "../lib/hooks";

const HOURS = [18, 19, 20, 21, 22, 23];
const TZ = "Europe/Rome";
const mins = (t) => { const [h, m] = t.split(":"); return +h * 60 + +m; };
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// An end at or before the start wraps past midnight (e.g. 20:00–00:00), like the seed data.
const endMins = (s) => { const e = mins(s.end_time); return e <= mins(s.start_time) ? e + 1440 : e; };
/** The slot fully covering hour h of a weekday, if any. */
export const slotAt = (slots, day, h) => slots.find((s) => +s.weekday === day && mins(s.start_time) <= h * 60 && endMins(s) >= (h + 1) * 60);

function AvailabilityGrid({ teamId, slots, editable }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async ({ day, h }) => {
      const s = slotAt(slots, day, h);
      if (!s) return api.post("/availability/", { team: teamId, weekday: day, start_time: hhmm(h * 60), end_time: hhmm((h + 1) * 60), timezone: TZ });
      // Remove just this hour: drop the slot and recreate what was left on either side.
      await api.delete(`/availability/${s.id}/`);
      const parts = [[mins(s.start_time), h * 60], [(h + 1) * 60, endMins(s)]].filter(([a, b]) => b > a);
      for (const [a, b] of parts) await api.post("/availability/", { team: teamId, weekday: day, start_time: hhmm(a), end_time: hhmm(b), timezone: s.timezone });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["availability"] }),
    onError: (e) => toast.error(errMsg(e)),
  });
  const hours = WEEKDAYS.reduce((n, _, d) => n + HOURS.filter((h) => slotAt(slots, d, h)).length, 0);
  const cols = { gridTemplateColumns: "44px repeat(6,minmax(0,1fr))" };

  return (
    <Card title="Disponibilità settimanale" action={<span className="rh-mono text-xs font-semibold text-hex">{hours} h</span>} delay={220}>
      <p className="m-0 text-[13px] text-slate-400">
        {editable ? "Tocca una cella per segnare l'ora disponibile. " : ""}Il matchmaking delle scrim usa questi orari.
      </p>
      <div className="grid gap-1.5" style={cols}>
        <span />
        {HOURS.map((h) => <span key={h} className="rh-mono text-center text-[11px] font-semibold text-slate-500">{h}</span>)}
      </div>
      <div className="flex flex-col gap-1.5">
        {WEEKDAYS.map((dn, d) => (
          <div key={dn} className="grid items-center gap-1.5" style={cols}>
            <span className="text-[11px] font-extrabold uppercase tracking-[.1em] text-slate-400">{dn}</span>
            {HOURS.map((h) => {
              const on = !!slotAt(slots, d, h);
              return (
                <button key={h} type="button" aria-label={`${dn} ${h}:00`} aria-pressed={on} disabled={!editable || toggle.isPending}
                  onClick={() => toggle.mutate({ day: d, h })}
                  className="h-[30px] rounded-lg border transition-all duration-[260ms] enabled:cursor-pointer enabled:hover:border-hex/70 enabled:active:scale-90"
                  style={{ background: on ? "linear-gradient(135deg,#1f8fc4,#6fd6f6)" : "rgba(255,255,255,.04)", borderColor: on ? "rgba(191,255,254,.6)" : "var(--border-subtle)", boxShadow: on ? "0 0 14px rgba(61,191,235,.45)" : "none", transform: on ? "none" : "scale(.92)" }} />
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["teams", id], queryFn: () => api.get(`/teams/${id}/`).then((r) => r.data) });
  const slots = useList("availability", "/availability/", { team: id, page_size: 200 });
  const [member, setMember] = useState({ email: "", role_in_team: "SUB" });

  const mutate = (fn, ok) => ({ mutationFn: fn, onSuccess: () => { toast.success(ok); qc.invalidateQueries({ queryKey: ["teams"] }); }, onError: (e) => toast.error(errMsg(e)) });
  const addMember = useMutation({ ...mutate(() => api.post(`/teams/${id}/members/`, member), "Membro aggiunto"), onSettled: () => setMember({ email: "", role_in_team: "SUB" }) });
  const removeMember = useMutation(mutate((uid) => api.delete(`/teams/${id}/members/`, { params: { user_id: uid } }), "Membro rimosso"));

  return (
    <QueryState query={team}>
      {(t) => (
        <div className="flex flex-col gap-5">
          <Link to="/teams" className="flex items-center gap-1.5 self-start text-[11px] font-extrabold uppercase tracking-[.14em] !text-slate-400 transition hover:-translate-x-1 hover:!text-white">
            <Icon name="chevron-left" size={14} />Team
          </Link>
          <PageHeader eyebrow={null} title={<>{t.name} <span className="text-hex" style={{ textShadow: "var(--text-glow)" }}>[{t.tag}]</span></>} subtitle={t.description}>
            <Badge color="hex">{t.region}</Badge>
            <Badge color="gold">{label(t.tier)}</Badge>
          </PageHeader>
          <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))" }}>
            <Card title="Roster" delay={140}>
              <div className="flex flex-col">
                {t.members.map((m, i) => (
                  <div key={m.id} className="flex items-center justify-between gap-2.5 border-b border-white/5 px-1 py-2.5" style={up(160 + i * 50, 420)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-8 w-8 flex-none place-items-center rounded-full border border-white/15 text-[13px] font-extrabold" style={{ background: "var(--grad-tint-violet)" }}>
                        {(m.user.display_name || m.user.email)[0].toUpperCase()}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-bold">{m.user.display_name || m.user.email}</span>
                        <span className="truncate text-xs text-slate-500">{m.user.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge color="hex">{m.role_in_team}</Badge>
                      {t.can_edit && m.user.id !== t.owner.id && (
                        <IconButton icon="trash-2" size={32} variant="ghost" label="Rimuovi" onClick={() => removeMember.mutate(m.user.id)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {t.can_edit && (
                <form className="flex flex-col gap-2.5 pt-1" onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }}>
                  <Input label="Aggiungi membro" icon="mail" type="email" placeholder="email utente" required value={member.email}
                    onChange={(e) => setMember({ ...member, email: e.target.value })} />
                  <div className="flex flex-wrap gap-1.5">
                    {TEAM_ROLES.map((r) => <Tag key={r} selected={member.role_in_team === r} onClick={() => setMember({ ...member, role_in_team: r })}>{r}</Tag>)}
                  </div>
                  <div><Button type="submit" size="sm" disabled={addMember.isPending}>Aggiungi</Button></div>
                </form>
              )}
            </Card>
            <QueryState query={slots} cards={1}>
              {(list) => <AvailabilityGrid teamId={id} slots={list} editable={t.can_edit} />}
            </QueryState>
          </div>
        </div>
      )}
    </QueryState>
  );
}
