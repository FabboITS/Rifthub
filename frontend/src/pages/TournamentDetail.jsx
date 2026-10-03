import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import Bracket from "../components/Bracket";
import { Button, Icon } from "../components/ds";
import { Badge, Card, Confirm, Empty, Modal, PageHeader, QueryState, ResultPicker } from "../components/ui";
import { STATUS } from "./Tournaments";
import { label } from "../lib/format";
import { useList } from "../lib/hooks";

// Tournament matches carry no series format: offer BO1 and BO3 scores.
const SCORES = [[1, 0], [2, 0], [2, 1], [1, 2], [0, 2], [0, 1]];

function ResultModal({ match, tour, onClose, onSaved }) {
  const save = useMutation({
    mutationFn: (score) => api.post(`/tournament-matches/${match.id}/report-result/`, score),
    onSuccess: (_, sc) => {
      const winner = sc.score_a > sc.score_b ? match.team_a.name : match.team_b.name;
      toast.success(match.next_match ? `Risultato salvato · ${winner} passa il turno` : `${winner} campione!`, match.next_match ? {} : { icon: "🏆" });
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal open onClose={onClose} eyebrow={tour.name} title={`${match.team_a.tag} vs ${match.team_b.tag}`}>
      <ResultPicker a={match.team_a.name} b={match.team_b.name} options={SCORES} onPick={save.mutate} disabled={save.isPending} />
    </Modal>
  );
}

function Standings({ query }) {
  return (
    <QueryState query={query}>
      {(rows) => (
        <table className="w-full text-sm">
          <thead className="text-left text-[13px] font-semibold text-slate-400">
            <tr><th className="py-1">#</th><th>Team</th><th>G</th><th>V</th><th>P</th><th>Diff</th><th>Punti</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id} className="border-t border-white/5">
                <td className="rh-mono py-1.5 text-gold">{i + 1}</td><td>{r.team.name}</td><td>{r.played}</td>
                <td>{r.wins}</td><td>{r.losses}</td><td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td><td className="font-bold">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </QueryState>
  );
}

/** Every team from the Teams page: registered ones are marked, the others can be signed up. */
function Registration({ tour, onChanged }) {
  const teams = useList("teams", "/teams/", { page_size: 200 });
  const registered = new Set(tour.entries.map((e) => e.team.id));
  const full = tour.entries.length >= tour.max_teams;
  const register = useMutation({
    mutationFn: (team) => api.post(`/tournaments/${tour.id}/register/`, { team }),
    onSuccess: () => { toast.success("Team iscritto"); onChanged(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <QueryState query={teams}>
      {(list) => (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 text-sm">
          {list.map((t) => {
            const canRegister = tour.can_edit || t.can_edit;
            return (
              <li key={t.id} className="rh-row !py-2 !text-sm">
                <span className="truncate">{t.name} <span className="text-xs text-slate-500">{t.tag} · {t.region}</span></span>
                {registered.has(t.id) ? <Badge color="green">Iscritto</Badge>
                  : canRegister ? (
                    <Button size="sm" variant="outline" disabled={full || register.isPending}
                      onClick={() => register.mutate(t.id)}>Iscrivi</Button>
                  ) : <Badge>Non iscritto</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </QueryState>
  );
}

function winnerOf(tour, matches, standings) {
  if (tour.status !== "FINISHED") return null;
  if (tour.format === "SINGLE_ELIM") {
    const final = matches.reduce((a, m) => (m.round > (a?.round ?? 0) ? m : a), null);
    return final?.winner?.name;
  }
  return standings?.[0]?.team.name;
}

function RoundRobin({ matches, onMatchClick }) {
  const rounds = [...new Set(matches.map((m) => m.round))];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rounds.map((r) => (
        <div key={r} className="rounded-xl p-3" style={{ background: "rgba(12,9,8,.45)" }}>
          <p className="mb-2 text-[13px] font-semibold text-gold">Giornata {r}</p>
          {matches.filter((m) => m.round === r).map((m) => (
            <button key={m.id} type="button" disabled={!!m.winner || !onMatchClick} onClick={() => onMatchClick?.(m)}
              className="mb-1 flex w-full justify-between rounded-lg px-2 py-1 text-left text-sm transition enabled:cursor-pointer enabled:hover:bg-white/5">
              <span>{m.team_a?.tag} – {m.team_b?.tag}</span>
              <span className={`rh-mono ${m.winner ? "text-[var(--gold-300)]" : "text-slate-500"}`}>{m.winner ? `${m.score_a}-${m.score_b}` : "da giocare"}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const t = useQuery({ queryKey: ["tournament", id], queryFn: () => api.get(`/tournaments/${id}/`).then((r) => r.data) });
  const bracket = useQuery({ queryKey: ["bracket", id], queryFn: () => api.get(`/tournaments/${id}/bracket/`).then((r) => r.data) });
  const standings = useQuery({ queryKey: ["standings", id], queryFn: () => api.get(`/tournaments/${id}/standings/`).then((r) => r.data) });
  const [editing, setEditing] = useState(null);
  const [ask, setAsk] = useState(null);
  const refresh = () => ["tournament", "bracket", "standings", "tournaments"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const generate = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/generate-bracket/`),
    onSuccess: () => { toast.success("Bracket generato"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <QueryState query={t}>
      {(tour) => {
        const winner = winnerOf(tour, bracket.data || [], standings.data);
        const [tone, txt] = STATUS[tour.status] || ["slate", label(tour.status)];
        const pct = Math.min(100, (tour.entries.length / tour.max_teams) * 100);
        return (
        <div className="flex flex-col gap-5">
          <Link to="/tournaments" className="flex items-center gap-1.5 self-start text-[13px] font-semibold !text-slate-400 transition hover:-translate-x-1 hover:!text-white">
            <Icon name="chevron-left" size={14} />Tornei
          </Link>
          <PageHeader eyebrow={txt} tone={{ green: "success", slate: "neutral" }[tone] || tone} title={tour.name} subtitle={tour.description}>
            <Badge color="hex">{tour.format === "SINGLE_ELIM" ? "Eliminazione diretta" : "Round robin"}</Badge>
            {winner && <div style={{ animation: "rhPop calc(var(--rh-k) * 420ms) var(--ease-out) both" }}><Badge color="gold" dot>Campione · {winner}</Badge></div>}
            {tour.can_edit && tour.status !== "FINISHED" && (
              <Button size="sm" onClick={() => {
                if (!bracket.data?.length) generate.mutate();
                else setAsk({ title: "Rigenerare il bracket?", body: "Tutti i risultati inseriti finora verranno persi.", label: "Rigenera", danger: true, run: () => generate.mutate() });
              }} disabled={generate.isPending}>{bracket.data?.length ? "Rigenera bracket" : "Genera bracket"}</Button>
            )}
          </PageHeader>
          <Confirm ask={ask} onClose={() => setAsk(null)} />
          {tour.status === "FINISHED" && (
            <div className="card flex flex-wrap items-center justify-between gap-3 !border-gold/60" style={{ background: "linear-gradient(135deg,rgba(255,181,71,.14),var(--surface-glass))", animation: "rhScale calc(var(--rh-k) * 420ms) var(--ease-out) both" }}>
              <p className="m-0 flex items-center gap-2 text-lg font-display font-extrabold text-[19px] text-[var(--gold-300)]">
                <Icon name="trophy" size={24} color="var(--gold-500)" /> Torneo concluso{winner ? ` — vince ${winner}!` : ""}
              </p>
            </div>
          )}
          {tour.status === "REGISTRATION" && (
            <div className="flex max-w-[520px] flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400">{tour.entries.length}/{tour.max_teams} team iscritti</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: "var(--grad-cta)", boxShadow: "0 0 12px rgba(255,107,26,.6)" }} />
              </div>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={`Iscritti (${tour.entries.length}/${tour.max_teams})`}>
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {tour.entries.map((e) => <li key={e.id} className="rh-row !py-2"><span><span className="rh-mono mr-2 text-gold">#{e.seed}</span>{e.team.name}</span></li>)}
              </ol>
              {tour.status === "REGISTRATION" && (
                <div>
                  <p className="label">Team presenti su RiftHub</p>
                  <Registration tour={tour} onChanged={refresh} />
                </div>
              )}
            </Card>
            <Card title={tour.format === "SINGLE_ELIM" ? "Bracket" : "Calendario"} className="lg:col-span-2" delay={140}>
              <QueryState query={bracket}>
                {(matches) => !matches.length ? <Empty>Bracket non ancora generato.</Empty>
                  : tour.format === "SINGLE_ELIM"
                    ? <Bracket matches={matches} onMatchClick={tour.can_edit ? setEditing : null} />
                    : <RoundRobin matches={matches} onMatchClick={tour.can_edit ? setEditing : null} />}
              </QueryState>
              {tour.can_edit && bracket.data?.length > 0 && tour.status !== "FINISHED" && <p className="m-0 text-[13px] text-slate-400">I match con bordo pulsante sono pronti: tocca per inserire il risultato.</p>}
            </Card>
          </div>
          {bracket.data?.length > 0 && <Card title="Classifica"><Standings query={standings} /></Card>}
          {editing && <ResultModal match={editing} tour={tour} onClose={() => setEditing(null)} onSaved={refresh} />}
        </div>
        );
      }}
    </QueryState>
  );
}
