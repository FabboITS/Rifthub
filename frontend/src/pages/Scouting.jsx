import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid3x3, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api/client";
import SwipeDeck from "../components/SwipeDeck";
import { Badge, Empty, PageHeader, QueryState, Select } from "../components/ui";
import { useManagedTeams } from "../lib/hooks";

export default function Scouting() {
  const qc = useQueryClient();
  const teams = useManagedTeams();
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
    },
    onError: (e, { card }) => {
      toast.error(errMsg(e));
      setSeen((s) => s.filter((id) => id !== card.id));
    },
  });

  if (teams.isLoading) return null;
  if (!teams.data.length) {
    return <Empty>Lo swipe è per i team: accedi come manager/coach. Puoi comunque <Link className="text-hex" to="/scouting/browse">sfogliare i player</Link>.</Empty>;
  }
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
            <SwipeDeck cards={d.results.filter((c) => !seen.includes(c.id))} onSwipe={onSwipe} />
          </>
        )}
      </QueryState>
    </div>
  );
}
