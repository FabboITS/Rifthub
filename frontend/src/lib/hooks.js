import { useQuery } from "@tanstack/react-query";
import api, { results } from "../api/client";

export function useMyTeams() {
  return useQuery({ queryKey: ["teams", "mine"], queryFn: () => api.get("/teams/mine/").then((r) => r.data) });
}

/** Teams the user can manage (owner/manager/coach). */
export function useManagedTeams() {
  const q = useMyTeams();
  return { ...q, data: (q.data || []).filter((t) => t.can_edit) };
}

export function useList(key, url, params, options = {}) {
  return useQuery({
    queryKey: [key, url, params],
    queryFn: () => api.get(url, { params }).then((r) => results(r.data)),
    ...options,
  });
}

export function useChampions() {
  return useQuery({
    queryKey: ["champions"],
    queryFn: () => api.get("/riot/champions/").then((r) => r.data),
    staleTime: Infinity,
  });
}
