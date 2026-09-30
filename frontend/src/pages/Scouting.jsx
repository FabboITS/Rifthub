import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ChampionIcon from "../components/ChampionIcon";
import SwipeDeck from "../components/SwipeDeck";
import { Badge, Card, Empty, Loading, PageHeader, QueryState, Select } from "../components/ui";
import { prettyRank } from "../lib/format";
import { useStaffTeams } from "../lib/hooks";

/** Players the team liked: open (or resume) a chat with any of them, no mutual like needed. */
function LikedPlayers({ team }) {
  const navigate = useNavigate();
  const liked = useQuery({
    queryKey: ["liked", team],
    queryFn: () => api.get("/scouting/liked/", { params: { team } }).then((r) => r.data),
  });
  const chat = useMutation({
    mutationFn: (card) => (card.match_id ? { id: card.match_id } : api.post("/scouting/liked/", { team, player: card.id }).then((r) => r.data)),
    onSuccess: (m) => navigate(`/scouting/matches?m=${m.id}`),
    onError: (e) => toast.error(errMsg(e)),
  });
  return (
    <Card title="Player che ti piacciono">
      <QueryState query={liked}>
        {(list) => list.length ? (
          <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg bg-slate-900/50 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nickname} {c.liked_back && <Badge color="green">Match</Badge>}</p>
                  <p className="text-xs text-slate-400">{c.role} · {prettyRank(c.rank)} · {c.region}</p>
                  <div className="mt-1 flex gap-1">{c.champion_pool.slice(0, 4).map((ch) => <ChampionIcon key={ch} name={ch} size={20} />)}</div>
                </div>
                <button className="btn-gold py-1 text-xs" onClick={() => chat.mutate(c)} disabled={chat.isPending}>
                  <MessageCircle className="h-3 w-3" /> {c.match_id ? "Apri chat" : "Chatta"}
                </button>
              </li>
            ))}
          </ul>
        ) : <Empty>Metti like a un player per vederlo qui.</Empty>}
      </QueryState>
    </Card>
  );
}

export default function Scouting() {
  const qc = useQueryClient();
  const teams = useStaffTeams();
  const [team, setTeam] = useState("");
  const [seen, setSeen] = useState([]);
  useEffect(() => { if (!team && teams.data.length) setTeam(teams.data[0].id); }, [team, teams.data]);
  const deck = useQuery({
    queryKey: ["deck", team],
    queryFn: () => api.get("/scouting/deck/", { params: { team } }).then((r) => r.data),
    enabled: !!team,
  });
  const swipe = useMutation({
    mutationFn: ({ card, direction }) => api.post("/scouting/swipe/", { team, player: card.id, direction }).then((r) => r.data),
    onSuccess: (res, { card }) => {
      if (res.matched && res.new_match) {
        toast.success(`È un match con ${card.nickname}! La chat è aperta.`, { icon: "💘", duration: 5000 });
        qc.invalidateQueries({ queryKey: ["scout-matches"] });
      }
      qc.invalidateQueries({ queryKey: ["liked"] });
    },
    onError: (e, { card }) => {
      toast.error(errMsg(e));
      setSeen((s) => s.filter((id) => id !== card.id));
    },
  });

  if (teams.isPending) return <Loading />;
  // Scouting is for COACH/ANALYST of a team; everyone else gets the player marketplace.
  if (!teams.data.length) return <Navigate to="/scouting/browse" replace />;
  const onSwipe = (card, direction) => {
    setSeen((s) => [...s, card.id]);
    swipe.mutate({ card, direction });
    const remaining = (deck.data?.results || []).filter((c) => c.id !== card.id && !seen.includes(c.id));
    if (!remaining.length) setTimeout(() => { setSeen([]); qc.invalidateQueries({ queryKey: ["deck"] }); }, 400);
  };

  return (
    <div>
      <PageHeader title="Scouting" subtitle="Scorri i player: LIKE reciproco = match e chat">
        <div className="w-52"><Select value={team} onChange={(v) => { setTeam(v); setSeen([]); }} options={teams.data.map((t) => [t.id, t.name])} /></div>
        <Link to="/scouting/browse" className="btn-ghost"><Grid3x3 className="h-4 w-4" /> Sfoglia</Link>
        <Link to="/scouting/matches" className="btn-gold"><MessageCircle className="h-4 w-4" /> Match</Link>
      </PageHeader>
      <QueryState query={deck}>
        {(d) => (
          <>
            {d.missing_roles.length > 0 && (
              <p className="mb-4 text-center text-sm text-slate-400">
                Ruoli scoperti nel roster: {d.missing_roles.map((r) => <Badge key={r} color="amber">{r}</Badge>)}
              </p>
            )}
            <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
              <SwipeDeck cards={d.results.filter((c) => !seen.includes(c.id))} onSwipe={onSwipe} />
              <LikedPlayers team={team} />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
