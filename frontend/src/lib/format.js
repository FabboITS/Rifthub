import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export const ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
export const TEAM_ROLES = [...ROLES, "COACH", "ANALYST", "SUB"];
export const REGIONS = ["EUW", "EUNE", "NA", "KR", "BR", "LAN", "LAS", "OCE", "TR", "JP"];
export const TIERS = ["ACADEMY", "AMATEUR", "SEMI_PRO", "PRO"];
export const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const RANK_OPTIONS = [
  [0, "Iron"], [400, "Bronze"], [800, "Silver"], [1200, "Gold"], [1600, "Platinum"],
  [2000, "Emerald"], [2400, "Diamond"], [2800, "Master"], [2900, "Grandmaster"], [3000, "Challenger"],
];
export const VOD_CATEGORIES = ["MACRO", "MICRO", "LANING", "VISION", "TEAMFIGHT", "DRAFT", "MENTAL"];
export const SEVERITIES = ["INFO", "WARNING", "CRITICAL"];
export const SEVERITY_COLOR = { INFO: "hex", WARNING: "amber", CRITICAL: "red" };

export const fmtDate = (d, pattern = "EEE d MMM, HH:mm") => (d ? format(new Date(d), pattern, { locale: it }) : "—");
export const fromNow = (d) => formatDistanceToNow(new Date(d), { locale: it, addSuffix: true });
export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const prettyRank = (r = "") => r.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export const label = (s = "") => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

/** "2026-01-05T20:00" for <input type="datetime-local"> */
export const toLocalInput = (d) => format(new Date(d), "yyyy-MM-dd'T'HH:mm");

export function youtubeId(url = "") {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Possible final scores of a best-of series, team A wins first: "BO3" → [[2,0],[2,1],[1,2],[0,2]]. */
export function resultOptions(fmt) {
  const n = Number(String(fmt).replace(/\D/g, "")) || 3;
  if (n % 2 === 0) return Array.from({ length: n + 1 }, (_, k) => [n - k, k]);
  const w = Math.ceil(n / 2);
  const range = [...Array(w).keys()];
  return [...range.map((k) => [w, k]), ...range.reverse().map((k) => [k, w])];
}
