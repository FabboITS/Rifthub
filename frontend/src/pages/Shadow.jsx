import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import BoardEditor from "../components/BoardEditor";
import { Badge, PageHeader, QueryState } from "../components/ui";
import { fmtDate } from "../lib/format";

const POLL_MS = 2000;

export default function Shadow() {
  const { sessionId } = useParams();
  const qc = useQueryClient();
  const state = useQuery({
    queryKey: ["shadow-state", sessionId],
    queryFn: () => api.get(`/shadow-sessions/${sessionId}/state/`).then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.role === "player" ? POLL_MS : false),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["shadow-state", sessionId] });
  const setFrame = useMutation({
    mutationFn: (frame) => api.post(`/shadow-sessions/${sessionId}/set-frame/`, { frame }),
    onSuccess: refresh,
    onError: (e) => toast.error(errMsg(e)),
  });
  const close = useMutation({
    mutationFn: () => api.patch(`/shadow-sessions/${sessionId}/`, { status: "CLOSED" }),
    onSuccess: () => { toast.success("Sessione chiusa"); refresh(); },
  });

  return (
    <QueryState query={state}>
      {(s) => {
        const coach = s.role === "coach";
        return (
          <div>
            <PageHeader title={`Shadow: ${s.board.title}`}
              subtitle={coach ? `Stai guidando ${s.session.player_name}. Ogni frame che selezioni appare al player.`
                : `Modalità shadow con ${s.session.coach_name}: la vista si aggiorna ogni 2 secondi.`}>
              <Badge color={s.session.status === "OPEN" ? "red" : "slate"}>
                <Radio className="mr-1 h-3 w-3" /> {s.session.status === "OPEN" ? "LIVE" : "Chiusa"}
              </Badge>
              <Badge color="gold">{coach ? "Coach" : "Player (sola lettura)"}</Badge>
              {coach && s.session.status === "OPEN" && <button className="btn-ghost" onClick={() => close.mutate()}>Chiudi sessione</button>}
            </PageHeader>
            <BoardEditor
              board={s.board}
              readOnly={!coach}
              frameIndex={s.current_frame}
              onFrameIndexChange={coach ? (i) => setFrame.mutate(i) : () => {}}
              onChanged={refresh}
            />
            <p className="mt-3 text-xs text-slate-500">Ultimo aggiornamento: {fmtDate(s.version, "HH:mm:ss")}</p>
          </div>
        );
      }}
    </QueryState>
  );
}
