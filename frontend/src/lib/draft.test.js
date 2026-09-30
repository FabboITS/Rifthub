import { expect, it } from "vitest";
import { DRAFT_ORDER, boardOf, unavailable, winsNeeded } from "./draft";

it("follows the tournament order: 5 bans and 5 picks per side", () => {
  const board = boardOf(DRAFT_ORDER.map((_, i) => `C${i}`));
  for (const side of ["BLUE", "RED"]) {
    expect(board[side].BAN).toHaveLength(5);
    expect(board[side].PICK).toHaveLength(5);
  }
  expect(board.BLUE.PICK[0]).toBe("C6"); // first pick after 6 bans
  expect(board.RED.PICK.slice(0, 2)).toEqual(["C7", "C8"]); // red double pick
});

it("fearless locks every pick of previous games, bans only for the current one", () => {
  const games = [{ picks: { BLUE: ["Ahri"], RED: ["Jinx"] }, bans: { BLUE: ["Zed"], RED: [] } }];
  expect([...unavailable(["Lulu", null], games, true)].sort()).toEqual(["Ahri", "Jinx", "Lulu"]);
  expect([...unavailable(["Lulu"], games, false)]).toEqual(["Lulu"]);
  expect([1, 3, 5].map(winsNeeded)).toEqual([1, 2, 3]);
});
