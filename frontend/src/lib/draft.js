/** Tournament draft (LoL esports): 3 bans each, 3 picks each, 2 bans each, 2 picks each. */
export const DRAFT_ORDER = [
  ["BLUE", "BAN"], ["RED", "BAN"], ["BLUE", "BAN"], ["RED", "BAN"], ["BLUE", "BAN"], ["RED", "BAN"],
  ["BLUE", "PICK"], ["RED", "PICK"], ["RED", "PICK"], ["BLUE", "PICK"], ["BLUE", "PICK"], ["RED", "PICK"],
  ["RED", "BAN"], ["BLUE", "BAN"], ["RED", "BAN"], ["BLUE", "BAN"],
  ["RED", "PICK"], ["BLUE", "PICK"], ["BLUE", "PICK"], ["RED", "PICK"],
];

/** actions[i] is the champion chosen at step i (null = skipped ban) → { BLUE: {BAN, PICK}, RED: {BAN, PICK} }. */
export function boardOf(actions) {
  const board = { BLUE: { BAN: [], PICK: [] }, RED: { BAN: [], PICK: [] } };
  actions.forEach((champ, i) => board[DRAFT_ORDER[i][0]][DRAFT_ORDER[i][1]].push(champ));
  return board;
}

/** Champions that can't be chosen now: already used in this game, plus (fearless) every pick of earlier games. */
export function unavailable(actions, games, fearless) {
  const taken = new Set(actions.filter(Boolean));
  if (fearless) games.forEach((g) => [...g.picks.BLUE, ...g.picks.RED].forEach((c) => taken.add(c)));
  return taken;
}

export const winsNeeded = (bestOf) => Math.floor(bestOf / 2) + 1;
