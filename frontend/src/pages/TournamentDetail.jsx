import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import Bracket from "../components/Bracket";
import { Badge, Card, Empty, Modal, PageHeader, QueryState } from "../components/ui";
import { label } from "../lib/format";
import { useList } from "../lib/hooks";

function ResultModal({ match, onClose, onSaved }) {
  const [score, setScore] = useState({ score_a: 2, score_b: 0 });
  const save = useMutation({
    mutationFn: () => api.post(`/tournament-matches/${match.id}/report-result/`, score),
    onSuccess: () => { toast.success("Risultato registrato"); onSaved(); onClose(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Modal open onClose={onClose} title="Inserisci risultato">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {[["score_a", match.team_a], ["score_b", match.team_b]].map(([k, t]) => (
          <label key={k} className="flex items-center justify-between gap-3">
            <span>{t.name}</span>
            <input type="number" min={0} className="input w-20" value={score[k]} onChange={(e) => setScore({ ...score, [k]: +e.target.value })} />
          </label>
        ))}
        <button className="btn-primary w-full" disabled={save.isPending}>Salva e fai avanzare il vincitore</button>
      </form>
    </Modal>
  );
}

function Standings({ query }) {
  return (
    <QueryState query={query}>
      {(rows) => (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="py-1">#</th><th>Team</th><th>G</th><th>V</th><th>P</th><th>Diff</th><th>Punti</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id} className="border-t border-slate-700/60">
                <td className="py-1.5 text-gold">{i + 1}</td><td>{r.team.name}</td><td>{r.played}</td>
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
              <li key={t.id} className="flex items-center justify-between gap-2 rounded bg-slate-900/50 px-2 py-1.5">
                <span className="truncate">{t.name} <span className="text-xs text-slate-500">{t.tag} · {t.region}</span></span>
                {registered.has(t.id) ? <Badge color="green">Iscritto</Badge>
                  : canRegister ? (
                    <button className="btn-gold px-2 py-1 text-xs" disabled={full || register.isPending}
                      onClick={() => register.mutate(t.id)}>Iscrivi</button>
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
        <div key={r} className="rounded-lg bg-slate-900/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-gold">Giornata {r}</p>
          {matches.filter((m) => m.round === r).map((m) => (
            <button key={m.id} type="button" disabled={!!m.winner || !onMatchClick} onClick={() => onMatchClick?.(m)}
              className="mb-1 flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-slate-800 disabled:hover:bg-transparent">
              <span>{m.team_a?.tag} – {m.team_b?.tag}</span>
              <span className={m.winner ? "text-gold-light" : "text-slate-500"}>{m.winner ? `${m.score_a}-${m.score_b}` : "da giocare"}</span>
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
        return (
        <div className="space-y-4">
          <Link to="/tournaments" className="btn-ghost -ml-3"><ArrowLeft className="h-4 w-4" /> Tutti i tornei</Link>
          <PageHeader title={tour.name} subtitle={tour.description}>
            <Badge color="gold">{label(tour.status)}</Badge>
            <Badge color="hex">{tour.format === "SINGLE_ELIM" ? "Eliminazione diretta" : "Round robin"}</Badge>
            {tour.can_edit && tour.status !== "FINISHED" && (
              <button className="btn-primary" onClick={() => {
                if (!bracket.data?.length || window.confirm("Rigenerare il bracket? I risultati verranno persi.")) generate.mutate();
              }} disabled={generate.isPending}>{bracket.data?.length ? "Rigenera bracket" : "Genera bracket"}</button>
            )}
          </PageHeader>
          {tour.status === "FINISHED" && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-gold/60 bg-gold/10">
              <p className="flex items-center gap-2 text-lg font-semibold text-gold-light">
                <Trophy className="h-6 w-6 text-gold" /> Torneo concluso{winner ? ` — vince ${winner}!` : ""}
              </p>
              <Link to="/tournaments" className="btn-gold"><ArrowLeft className="h-4 w-4" /> Torna a tutti i tornei</Link>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={`Iscritti (${tour.entries.length}/${tour.max_teams})`}>
              <ol className="space-y-1 text-sm">
                {tour.entries.map((e) => <li key={e.id}><span className="mr-2 text-gold">#{e.seed}</span>{e.team.name}</li>)}
              </ol>
              {tour.status === "REGISTRATION" && (
                <div className="mt-4">
                  <p className="label">Team presenti su RiftHub</p>
                  <Registration tour={tour} onChanged={refresh} />
                </div>
              )}
            </Card>
            <Card title={tour.format === "SINGLE_ELIM" ? "Bracket" : "Calendario"} className="lg:col-span-2">
              <QueryState query={bracket}>
                {(matches) => !matches.length ? <Empty>Bracket non ancora generato.</Empty>
                  : tour.format === "SINGLE_ELIM"
                    ? <Bracket matches={matches} onMatchClick={tour.can_edit ? setEditing : null} />
                    : <RoundRobin matches={matches} onMatchClick={tour.can_edit ? setEditing : null} />}
              </QueryState>
              {tour.can_edit && bracket.data?.length > 0 && tour.status !== "FINISHED" && <p className="mt-2 text-xs text-slate-500">Clicca un match da giocare per inserire il risultato.</p>}
            </Card>
          </div>
          {bracket.data?.length > 0 && <Card title="Classifica"><Standings query={standings} /></Card>}
          {editing && <ResultModal match={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
        </div>
        );
      }}
    </QueryState>
  );
}
