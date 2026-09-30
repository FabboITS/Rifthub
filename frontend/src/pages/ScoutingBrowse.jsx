import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Heart, IdCard, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ChampionIcon from "../components/ChampionIcon";
import { CompareRadar, MiniRadar } from "../components/Radar";
import { Badge, Card, Empty, Field, Loading, Modal, PageHeader, QueryState, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { RANK_OPTIONS, REGIONS, ROLES, prettyRank } from "../lib/format";
import { useChampions, useList } from "../lib/hooks";

const RANKS = [
  ...["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"].flatMap((t) => [4, 3, 2, 1].map((d) => `${t}_${d}`)),
  "MASTER", "GRANDMASTER", "CHALLENGER",
].map((r) => [r, prettyRank(r)]);

/** The user's own "identity card": what coaches and analysts scroll through when scouting. */
function MyCardModal({ card, onClose }) {
  const qc = useQueryClient();
  const champs = useChampions();
  const [f, setF] = useState(card || {
    nickname: "", real_name: "", age: "", role: "MID", region: "EUW", rank: "GOLD_4", champion_pool: [], bio: "", looking_for_team: true,
  });
  const [champ, setChamp] = useState("");
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, age: f.age || null };
      return card ? api.patch(`/scouting/cards/${card.id}/`, body) : api.post("/scouting/cards/", body);
    },
    onSuccess: () => {
      toast.success("Carta salvata: ora i team possono trovarti");
      qc.invalidateQueries({ queryKey: ["my-card"] });
      qc.invalidateQueries({ queryKey: ["cards"] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const addChamp = () => { if (champ && !f.champion_pool.includes(champ) && f.champion_pool.length < 5) set("champion_pool")([...f.champion_pool, champ]); };
  return (
    <Modal open onClose={onClose} title={card ? "La mia carta" : "Crea la tua carta"}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nickname"><input className="input" value={f.nickname} onChange={(e) => set("nickname")(e.target.value)} required /></Field>
          <Field label="Nome reale"><input className="input" value={f.real_name} onChange={(e) => set("real_name")(e.target.value)} /></Field>
          <Field label="Ruolo"><Select value={f.role} onChange={set("role")} options={ROLES} /></Field>
          <Field label="Rank"><Select value={f.rank} onChange={set("rank")} options={RANKS} /></Field>
          <Field label="Regione"><Select value={f.region} onChange={set("region")} options={REGIONS} /></Field>
          <Field label="Età"><input className="input" type="number" min={10} max={99} value={f.age ?? ""} onChange={(e) => set("age")(e.target.value)} /></Field>
        </div>
        <Field label="Champion pool (max 5)">
          <div className="flex gap-2">
            <Select value={champ} onChange={setChamp} options={(champs.data?.champions || []).map((c) => [c.id, c.name])} placeholder="Campione" />
            <button type="button" className="btn-ghost" onClick={addChamp}>+</button>
          </div>
        </Field>
        <div className="flex flex-wrap gap-1">
          {f.champion_pool.map((c) => (
            <button type="button" key={c} title="Rimuovi" onClick={() => set("champion_pool")(f.champion_pool.filter((x) => x !== c))}><ChampionIcon name={c} size={32} /></button>
          ))}
        </div>
        <Field label="Bio"><textarea className="input" rows={3} value={f.bio} onChange={(e) => set("bio")(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.looking_for_team} onChange={(e) => set("looking_for_team")(e.target.checked)} /> Sto cercando un team
        </label>
        <button className="btn-primary w-full" disabled={save.isPending}>Salva</button>
      </form>
    </Modal>
  );
}

const ORDERING = [
  ["-rank_score", "Rank"], ["-stats__winrate", "Winrate"], ["-stats__kda", "KDA"], ["-stats__cs_per_min", "CS/min"],
  ["-stats__damage_share", "Danni %"], ["-stats__vision_score_per_min", "Visione"], ["age", "Età"],
];

function PlayerModal({ card, onClose }) {
  const qc = useQueryClient();
  const [summary, setSummary] = useState(null);
  const importRiot = useMutation({
    mutationFn: () => api.post(`/scouting/cards/${card.id}/import-riot/`).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(d.source === "riot" ? "Statistiche importate da Riot API" : "Statistiche generate (mock, nessuna chiave Riot)");
      qc.invalidateQueries({ queryKey: ["cards"] });
      onClose();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const ai = useMutation({
    mutationFn: () => api.post("/ai/scout-summary/", { player_card_id: card.id }).then((r) => r.data),
    onSuccess: (d) => setSummary(d.output),
    onError: (e) => toast.error(errMsg(e)),
  });
  const s = card.stats || {};
  return (
    <Modal open onClose={onClose} title={`${card.nickname} · ${card.role} · ${prettyRank(card.rank)}`} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <MiniRadar data={card.radar} height={220} />
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            {[["Partite", s.games], ["Winrate", `${s.winrate}%`], ["KDA", s.kda], ["CS/min", s.cs_per_min], ["Oro/min", s.gold_per_min],
              ["Danni", `${s.damage_share}%`], ["Visione/min", s.vision_score_per_min], ["KP", `${s.kill_participation}%`], ["First blood", `${s.first_blood_rate}%`]]
              .map(([k, v]) => <div key={k} className="rounded bg-slate-900/60 p-2"><dt className="text-slate-400">{k}</dt><dd className="font-semibold">{v ?? "—"}</dd></div>)}
          </dl>
        </div>
        <div className="space-y-3">
          <div className="flex gap-1">{card.champion_pool.map((c) => <ChampionIcon key={c} name={c} size={36} />)}</div>
          <p className="text-sm text-slate-300">{card.bio}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-gold" onClick={() => importRiot.mutate()} disabled={importRiot.isPending}><Download className="h-4 w-4" /> Importa da Riot</button>
            <button className="btn-primary" onClick={() => ai.mutate()} disabled={ai.isPending}><Sparkles className="h-4 w-4" /> Profilo AI</button>
          </div>
          {ai.isPending && <Loading label="L'AI sta analizzando il giocatore..." />}
          {summary && <div className="whitespace-pre-wrap rounded-lg bg-slate-900/70 p-3 text-sm">{summary}</div>}
        </div>
      </div>
    </Modal>
  );
}

export default function ScoutingBrowse() {
  const { user } = useAuth();
  const myCard = useQuery({
    queryKey: ["my-card"],
    queryFn: () => api.get("/scouting/cards/mine/").then((r) => r.data, (e) => (e.response?.status === 404 ? null : Promise.reject(e))),
  });
  const [editCard, setEditCard] = useState(false);
  const [f, setF] = useState({ role: "", region: "", rank_min: "", rank_max: "", looking_for_team: "", champion: "", ordering: "-rank_score" });
  const cards = useList("cards", "/scouting/cards/", { ...f, page_size: 60 });
  const [compare, setCompare] = useState([]);
  const [open, setOpen] = useState(null);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const cmp = useQuery({
    queryKey: ["compare", ...compare],
    queryFn: () => api.get(`/scouting/cards/${compare[0]}/compare/`, { params: { with: compare[1] } }).then((r) => r.data),
    enabled: compare.length === 2,
  });
  const toggle = (id) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c.slice(-1), id]));

  return (
    <div className="space-y-4">
      <PageHeader title="Marketplace player" subtitle="Filtri avanzati e confronto statistiche">
        <button className="btn-primary" onClick={() => setEditCard(true)} disabled={myCard.isPending}>
          <IdCard className="h-4 w-4" /> {myCard.data ? "La mia carta" : "Crea la tua carta"}
        </button>
        {user.is_staff && <Link to="/scouting" className="btn-ghost"><Heart className="h-4 w-4" /> Swipe</Link>}
        {(user.is_staff || myCard.data) && <Link to="/scouting/matches" className="btn-gold"><MessageCircle className="h-4 w-4" /> Chat</Link>}
      </PageHeader>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <Select value={f.role} onChange={set("role")} options={ROLES} placeholder="Ruolo" />
        <Select value={f.region} onChange={set("region")} options={REGIONS} placeholder="Regione" />
        <Select value={f.rank_min} onChange={set("rank_min")} options={RANK_OPTIONS} placeholder="Rank min" />
        <Select value={f.rank_max} onChange={set("rank_max")} options={RANK_OPTIONS.map(([v, l]) => [v + 399, l])} placeholder="Rank max" />
        <Select value={f.looking_for_team} onChange={set("looking_for_team")} options={[["true", "Cerca team"], ["false", "Sotto contratto"]]} placeholder="Stato" />
        <input className="input" placeholder="Campione (es. Ahri)" value={f.champion} onChange={(e) => set("champion")(e.target.value)} />
        <Select value={f.ordering} onChange={set("ordering")} options={ORDERING} />
      </div>
      {compare.length === 2 && (
        <Card title="Confronto" action={<button className="btn-ghost text-xs" onClick={() => setCompare([])}>Chiudi</button>}>
          <QueryState query={cmp}>
            {(d) => (
              <div className="grid gap-4 md:grid-cols-2">
                <CompareRadar metrics={d.metrics} nameA={d.a.nickname} nameB={d.b.nickname} />
                <table className="w-full self-center text-sm">
                  <thead className="text-xs uppercase text-slate-400"><tr><th className="text-left">Metrica</th><th className="text-hex">{d.a.nickname}</th><th className="text-gold">{d.b.nickname}</th></tr></thead>
                  <tbody>
                    {d.metrics.map((m) => (
                      <tr key={m.key} className="border-t border-slate-700/60 text-center">
                        <td className="py-1 text-left">{m.metric}</td>
                        <td className={m.a_raw > m.b_raw ? "font-bold text-hex" : ""}>{m.a_raw}</td>
                        <td className={m.b_raw > m.a_raw ? "font-bold text-gold" : ""}>{m.b_raw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </QueryState>
        </Card>
      )}
      <p className="text-xs text-slate-500">Seleziona due player con “Confronta” per il radar comparativo.</p>
      <QueryState query={cards}>
        {(list) => list.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((c) => (
              <div key={c.id} className={`card cursor-pointer transition hover:border-hex/60 ${compare.includes(c.id) ? "border-gold" : ""}`} onClick={() => setOpen(c)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{c.nickname}</h3>
                  <Badge color="gold">{prettyRank(c.rank)}</Badge>
                </div>
                <div className="mt-1 flex gap-1 text-xs"><Badge color="hex">{c.role}</Badge><Badge>{c.region}</Badge>{c.looking_for_team && <Badge color="green">LFT</Badge>}</div>
                <p className="mt-2 text-xs text-slate-400">WR {c.stats?.winrate ?? "—"}% · KDA {c.stats?.kda ?? "—"} · CS {c.stats?.cs_per_min ?? "—"}</p>
                <div className="mt-2 flex gap-1">{c.champion_pool.map((ch) => <ChampionIcon key={ch} name={ch} size={24} />)}</div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={compare.includes(c.id)} onChange={() => toggle(c.id)} /> Confronta
                </label>
              </div>
            ))}
          </div>
        ) : <Empty>Nessun player con questi filtri.</Empty>}
      </QueryState>
      {open && <PlayerModal card={open} onClose={() => setOpen(null)} />}
      {editCard && <MyCardModal card={myCard.data} onClose={() => setEditCard(false)} />}
    </div>
  );
}
