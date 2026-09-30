import { ArrowLeftRight, Ban, Lock, RotateCcw, Search, Undo2 } from "lucide-react";
import { useState } from "react";
import { findChampion } from "../components/ChampionIcon";
import { Badge, Card, Field, PageHeader, QueryState, Select } from "../components/ui";
import { DRAFT_ORDER, boardOf, unavailable, winsNeeded } from "../lib/draft";
import { useChampions } from "../lib/hooks";

const CLASSES = [["", "Tutte"], ["Fighter", "Fighter"], ["Tank", "Tank"], ["Mage", "Mage"], ["Assassin", "Assassin"], ["Marksman", "Marksman"], ["Support", "Support"]];
const SIDE = {
  BLUE: { text: "text-sky-300", ring: "ring-sky-400", bg: "bg-sky-500/10" },
  RED: { text: "text-rose-300", ring: "ring-rose-400", bg: "bg-rose-500/10" },
};

function Slot({ champ, champions, active, side }) {
  const c = champ && findChampion(champions, champ);
  return (
    <div className={`flex h-16 items-center gap-3 rounded-lg px-2 ${SIDE[side].bg} ${active ? `ring-2 ${SIDE[side].ring} animate-pulse` : ""}`}>
      {c ? <img src={c.icon} alt="" className="h-12 w-12 rounded" draggable={false} /> : <div className="h-12 w-12 rounded bg-slate-800" />}
      <span className="truncate font-semibold">{c?.name || (active ? "Sta scegliendo..." : "")}</span>
    </div>
  );
}

function BanRow({ bans, champions, activeIndex }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => {
        const c = bans[i] && findChampion(champions, bans[i]);
        return (
          <div key={i} className={`relative h-9 w-9 overflow-hidden rounded bg-slate-800 ${activeIndex === i ? "ring-2 ring-gold" : ""}`} title={c?.name}>
            {c && <img src={c.icon} alt={c.name} className="h-full w-full grayscale" draggable={false} />}
            {i < bans.length && <Ban className="absolute inset-1 h-7 w-7 text-rose-500/80" />}
          </div>
        );
      })}
    </div>
  );
}

function TeamColumn({ side, name, board, step, champions, wins }) {
  const [curSide, curType] = DRAFT_ORDER[step] || [];
  const mine = curSide === side;
  return (
    <div className="space-y-2">
      <h2 className={`flex items-center justify-between font-display text-lg font-bold ${SIDE[side].text}`}>
        {name} <Badge color={side === "BLUE" ? "hex" : "red"}>{wins} W</Badge>
      </h2>
      <BanRow bans={board[side].BAN} champions={champions} activeIndex={mine && curType === "BAN" ? board[side].BAN.length : -1} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Slot key={i} side={side} champions={champions} champ={board[side].PICK[i]}
          active={mine && curType === "PICK" && board[side].PICK.length === i} />
      ))}
    </div>
  );
}

/** Tournament champion select (drafter.lol style): single screen, Bo1/Bo3/Bo5, optional fearless. */
export default function Draft() {
  const champs = useChampions();
  const [setup, setSetup] = useState({ blue: "Team Blu", red: "Team Rosso", bestOf: 3, fearless: true });
  const [games, setGames] = useState([]); // finished games: { blue, red, picks, bans, winner }
  const [actions, setActions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState({ text: "", tag: "" });

  const step = actions.length;
  const done = step === DRAFT_ORDER.length;
  const [curSide, curType] = DRAFT_ORDER[step] || [];
  const board = boardOf(actions);
  const taken = unavailable(actions, games, setup.fearless);
  const wins = (name) => games.filter((g) => g.winner === name).length;
  const seriesOver = [setup.blue, setup.red].some((n) => wins(n) >= winsNeeded(setup.bestOf));
  const started = step > 0 || games.length > 0;

  const lock = (champ) => { setActions([...actions, champ]); setSelected(null); };
  const finishGame = (winner) => {
    setGames([...games, { blue: setup.blue, red: setup.red, picks: { BLUE: board.BLUE.PICK, RED: board.RED.PICK }, bans: { BLUE: board.BLUE.BAN, RED: board.RED.BAN }, winner }]);
    setActions([]);
  };
  const reset = () => { setGames([]); setActions([]); setSelected(null); };
  const set = (k) => (v) => setSetup({ ...setup, [k]: v });

  return (
    <div className="space-y-4">
      <PageHeader title="Draft" subtitle="Champion select da torneo: ban/pick alternati, serie Bo1/Bo3/Bo5 e modalità fearless">
        <button className="btn-ghost" onClick={() => setActions(actions.slice(0, -1))} disabled={!step}><Undo2 className="h-4 w-4" /> Annulla</button>
        <button className="btn-ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Nuova serie</button>
      </PageHeader>

      <Card>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Lato blu"><input className="input" value={setup.blue} onChange={(e) => set("blue")(e.target.value)} disabled={started} /></Field>
          <Field label="Lato rosso"><input className="input" value={setup.red} onChange={(e) => set("red")(e.target.value)} disabled={started} /></Field>
          <Field label="Serie"><Select value={setup.bestOf} onChange={(v) => set("bestOf")(+v)} options={[[1, "Bo1"], [3, "Bo3"], [5, "Bo5"]]} disabled={started} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={setup.fearless} onChange={(e) => set("fearless")(e.target.checked)} disabled={started} />
            Fearless <span className="text-xs text-slate-400">(i campioni pickati non tornano nella serie)</span>
          </label>
          <div className="flex items-end pb-1">
            <button className="btn-ghost w-full" disabled={step > 0} onClick={() => setSetup({ ...setup, blue: setup.red, red: setup.blue })}>
              <ArrowLeftRight className="h-4 w-4" /> Scambia lati
            </button>
          </div>
        </div>
      </Card>

      <QueryState query={champs}>
        {(data) => {
          const champions = data.champions;
          const list = champions.filter((c) =>
            (!q.tag || c.tags.includes(q.tag)) && c.name.toLowerCase().includes(q.text.toLowerCase()));
          return (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr_240px]">
              <TeamColumn side="BLUE" name={setup.blue} board={board} step={step} champions={champions} wins={wins(setup.blue)} />
              <div className="card space-y-3">
                <p className="text-center font-display text-lg">
                  {seriesOver ? "Serie conclusa" : done ? "Draft completato: chi ha vinto?" : (
                    <>Partita {games.length + 1} · <span className={SIDE[curSide].text}>{curSide === "BLUE" ? setup.blue : setup.red}</span> {curType === "BAN" ? "banna" : "sceglie"} ({step + 1}/20)</>
                  )}
                </p>
                {done && !seriesOver && (
                  <div className="flex justify-center gap-2">
                    <button className="btn-primary" onClick={() => finishGame(setup.blue)}>Vince {setup.blue}</button>
                    <button className="btn-gold" onClick={() => finishGame(setup.red)}>Vince {setup.red}</button>
                  </div>
                )}
                {!done && !seriesOver && (
                  <>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                        <input className="input pl-8" placeholder="Cerca campione" value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} />
                      </div>
                      <div className="w-36"><Select value={q.tag} onChange={(tag) => setQ({ ...q, tag })} options={CLASSES} /></div>
                    </div>
                    <div className="grid max-h-[460px] grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2 overflow-y-auto pr-1">
                      {list.map((c) => {
                        const off = taken.has(c.id);
                        return (
                          <button key={c.id} disabled={off} onClick={() => setSelected(c.id)} title={c.name}
                            className={`rounded p-1 text-center text-[10px] transition ${selected === c.id ? "bg-gold/20 ring-2 ring-gold" : "hover:bg-slate-700/60"} ${off ? "cursor-not-allowed opacity-25 grayscale" : ""}`}>
                            <img src={c.icon} alt="" loading="lazy" className="mx-auto h-12 w-12 rounded" draggable={false} />
                            <span className="block truncate">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-primary flex-1" disabled={!selected} onClick={() => lock(selected)}>
                        <Lock className="h-4 w-4" /> {curType === "BAN" ? "Banna" : "Blocca"} {selected ? findChampion(champions, selected)?.name : ""}
                      </button>
                      {curType === "BAN" && <button className="btn-ghost" onClick={() => lock(null)}>Nessun ban</button>}
                    </div>
                  </>
                )}
                {games.length > 0 && (
                  <div className="space-y-1 border-t border-slate-700 pt-2 text-xs">
                    <p className="label">Partite della serie {setup.fearless && "· bloccati in fearless"}</p>
                    {games.map((g, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-1">
                        <span className="w-20 text-slate-400">G{i + 1} · {g.winner}</span>
                        {[...g.picks.BLUE, ...g.picks.RED].map((c) => {
                          const ch = findChampion(champions, c);
                          return ch && <img key={c} src={ch.icon} alt={ch.name} title={ch.name} className="h-6 w-6 rounded" />;
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <TeamColumn side="RED" name={setup.red} board={board} step={step} champions={champions} wins={wins(setup.red)} />
            </div>
          );
        }}
      </QueryState>
    </div>
  );
}
