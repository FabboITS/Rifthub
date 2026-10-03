import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import ChampionIcon from "../components/ChampionIcon";
import SwipeDeck from "../components/SwipeDeck";
import { Button, Icon, IconButton, Tag } from "../components/ds";
import { Badge, Card, Empty, Loading, PageHeader, QueryState, Script } from "../components/ui";
import { ROLES } from "../lib/format";
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
    <Card title={<><Icon name="sparkles" size={16} color="var(--gold-500)" />Player che ti piacciono</>} delay={240}>
      <QueryState query={liked} cards={1}>
        {(list) => list.length ? (
          <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
            {list.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(12,9,8,.45)", animation: `rhToastIn calc(var(--rh-k) * 420ms) var(--ease-out) calc(var(--rh-k) * ${Math.min(i, 8) * 60}ms) both` }}>
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-magenta-light text-sm font-black" style={{ background: "var(--grad-tint-magenta)" }}>{c.nickname[0]}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 truncate text-sm font-bold">{c.nickname} {c.liked_back && <Badge color="green">Match</Badge>}</span>
                  <span className="text-xs text-slate-400">{c.role} · {prettyRank(c.rank)} · {c.region}</span>
                  <div className="mt-1 flex gap-1">{c.champion_pool.slice(0, 4).map((ch) => <ChampionIcon key={ch} name={ch} size={20} />)}</div>
                </div>
                <IconButton icon="message-square-more" size={32} label={c.match_id ? "Apri chat" : "Chatta"} onClick={() => chat.mutate(c)} disabled={chat.isPending} />
              </div>
            ))}
          </div>
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
  const [role, setRole] = useState("");
  const navigate = useNavigate();
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
    const remaining = (deck.data?.results || []).filter((c) => c.id !== card.id && !seen.includes(c.id) && (!role || c.role === role));
    if (!remaining.length) setTimeout(() => { setSeen([]); qc.invalidateQueries({ queryKey: ["deck"] }); }, 400);
  };

  return (
    <div>
      <PageHeader eyebrow="Scouting" tone="magenta" title={<>Scopri <Script>il</Script> talento</>}
        subtitle="Trascina la card a destra per i player che ti interessano, a sinistra per scartarli. LIKE reciproco = match e chat.">
        {teams.data.length > 1 && teams.data.map((t) => <Tag key={t.id} selected={t.id === team} onClick={() => { setTeam(t.id); setSeen([]); }}>{t.tag}</Tag>)}
        <Button size="sm" variant="outline" onClick={() => navigate("/scouting/browse")}>Sfoglia</Button>
        <Button size="sm" onClick={() => navigate("/scouting/matches")}>Match</Button>
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-1.5" style={{ animation: "rhUp calc(var(--rh-k) * 560ms) var(--ease-out) calc(var(--rh-k) * 180ms) both" }}>
        {[["", "Tutti"], ...ROLES.map((r) => [r, r])].map(([v, l]) => <Tag key={l} selected={role === v} onClick={() => setRole(v)}>{l}</Tag>)}
      </div>
      <QueryState query={deck}>
        {(d) => (
          <>
            {d.missing_roles.length > 0 && (
              <p className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
                Ruoli scoperti nel roster: {d.missing_roles.map((r) => <Badge key={r} color="amber">{r}</Badge>)}
              </p>
            )}
            <div className="grid items-start gap-6" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))" }}>
              <div style={{ animation: "rhUp calc(var(--rh-k) * 600ms) var(--ease-out) calc(var(--rh-k) * 160ms) both" }}>
                <SwipeDeck cards={d.results.filter((c) => !seen.includes(c.id) && (!role || c.role === role))} onSwipe={onSwipe} />
              </div>
              <LikedPlayers team={team} />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
