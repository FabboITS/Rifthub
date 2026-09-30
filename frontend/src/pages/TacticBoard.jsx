import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../api/client";
import BoardEditor from "../components/BoardEditor";
import { PageHeader, QueryState } from "../components/ui";
import { useMyTeams } from "../lib/hooks";

export default function TacticBoardPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const board = useQuery({ queryKey: ["board", id], queryFn: () => api.get(`/tactic-boards/${id}/`).then((r) => r.data) });
  const teams = useMyTeams();
  const canEdit = (teams.data || []).some((t) => t.id === board.data?.team && t.can_edit);
  return (
    <QueryState query={board}>
      {(b) => (
        <div>
          <PageHeader title={b.title} subtitle={`${b.team_name} · ${b.description || "Lavagna tattica"}`} />
          <BoardEditor board={b} readOnly={!canEdit} onChanged={() => qc.invalidateQueries({ queryKey: ["board", id] })} />
        </div>
      )}
    </QueryState>
  );
}
