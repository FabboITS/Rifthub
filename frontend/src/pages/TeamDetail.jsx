import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { Badge, Card, Empty, PageHeader, QueryState, Select } from "../components/ui";
import { TEAM_ROLES, WEEKDAYS, label } from "../lib/format";
import { useList } from "../lib/hooks";

export default function TeamDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const team = useQuery({ queryKey: ["teams", id], queryFn: () => api.get(`/teams/${id}/`).then((r) => r.data) });
  const slots = useList("availability", "/availability/", { team: id, page_size: 100 });
  const [member, setMember] = useState({ email: "", role_in_team: "SUB" });
  const [slot, setSlot] = useState({ weekday: "0", start_time: "19:00", end_time: "22:00", timezone: "Europe/Rome" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["teams"] });
    qc.invalidateQueries({ queryKey: ["availability"] });
  };
  const mutate = (fn, ok) => ({ mutationFn: fn, onSuccess: () => { toast.success(ok); refresh(); }, onError: (e) => toast.error(errMsg(e)) });
  const addMember = useMutation(mutate(() => api.post(`/teams/${id}/members/`, member), "Membro aggiunto"));
  const removeMember = useMutation(mutate((uid) => api.delete(`/teams/${id}/members/`, { params: { user_id: uid } }), "Membro rimosso"));
  const addSlot = useMutation(mutate(() => api.post("/availability/", { ...slot, team: id }), "Disponibilità aggiunta"));
  const removeSlot = useMutation(mutate((sid) => api.delete(`/availability/${sid}/`), "Disponibilità rimossa"));

  return (
    <QueryState query={team}>
      {(t) => (
        <div>
          <PageHeader title={`${t.name} [${t.tag}]`} subtitle={t.description}>
            <Badge color="hex">{t.region}</Badge>
            <Badge color="gold">{label(t.tier)}</Badge>
          </PageHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Roster">
              <ul className="divide-y divide-slate-700/60">
                {t.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{m.user.display_name || m.user.email} <span className="text-xs text-slate-500">{m.user.email}</span></span>
                    <span className="flex items-center gap-2">
                      <Badge color="hex">{m.role_in_team}</Badge>
                      {t.can_edit && m.user.id !== t.owner.id && (
                        <button className="btn-ghost p-1" aria-label="Rimuovi" onClick={() => removeMember.mutate(m.user.id)}>
                          <Trash2 className="h-4 w-4 text-rose-400" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {t.can_edit && (
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }}>
                  <input className="input" type="email" placeholder="email utente" value={member.email}
                    onChange={(e) => setMember({ ...member, email: e.target.value })} required />
                  <div className="w-36"><Select value={member.role_in_team} onChange={(v) => setMember({ ...member, role_in_team: v })} options={TEAM_ROLES} /></div>
                  <button className="btn-primary">Aggiungi</button>
                </form>
              )}
            </Card>
            <Card title="Disponibilità settimanale">
              <QueryState query={slots}>
                {(list) => list.length ? (
                  <ul className="space-y-1 text-sm">
                    {list.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded bg-slate-900/50 px-3 py-1.5">
                        <span>{WEEKDAYS[s.weekday]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} <span className="text-xs text-slate-500">{s.timezone}</span></span>
                        {t.can_edit && (
                          <button className="btn-ghost p-1" aria-label="Rimuovi slot" onClick={() => removeSlot.mutate(s.id)}>
                            <Trash2 className="h-4 w-4 text-rose-400" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <Empty>Nessuna disponibilità.</Empty>}
              </QueryState>
              {t.can_edit && (
                <form className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" onSubmit={(e) => { e.preventDefault(); addSlot.mutate(); }}>
                  <Select value={slot.weekday} onChange={(v) => setSlot({ ...slot, weekday: v })} options={WEEKDAYS.map((d, i) => [String(i), d])} />
                  <input className="input" type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} />
                  <input className="input" type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} />
                  <input className="input" value={slot.timezone} onChange={(e) => setSlot({ ...slot, timezone: e.target.value })} />
                  <button className="btn-primary">Aggiungi</button>
                </form>
              )}
            </Card>
          </div>
        </div>
      )}
    </QueryState>
  );
}
