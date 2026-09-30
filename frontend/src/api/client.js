import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL: API_URL });

export const tokens = {
  get access() { return localStorage.getItem("access"); },
  get refresh() { return localStorage.getItem("refresh"); },
  set({ access, refresh }) {
    if (access) localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  },
  clear() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  },
};

api.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

// One in-flight refresh shared by all requests that got a 401.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");
    if (error.response?.status === 401 && tokens.refresh && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing ??= axios
          .post(`${API_URL}/auth/refresh/`, { refresh: tokens.refresh })
          .finally(() => { refreshing = null; });
        const { data } = await refreshing;
        tokens.set(data);
        return api(original);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  },
);

/** List endpoints are paginated: return the array either way. */
export const results = (data) => data?.results ?? data ?? [];

/** Human readable error from a DRF response. */
export function errMsg(error) {
  const data = error?.response?.data;
  if (!data) return error?.message || "Errore di rete";
  if (typeof data === "string") return data.slice(0, 200);
  if (data.detail) return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return "Errore";
  const [field, msg] = first;
  const text = Array.isArray(msg) ? msg[0] : typeof msg === "string" ? msg : JSON.stringify(msg);
  return field === "non_field_errors" ? text : `${field}: ${text}`;
}

export default api;
