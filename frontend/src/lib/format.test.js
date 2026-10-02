import { describe, expect, it } from "vitest";
import { resultOptions } from "./format";

describe("resultOptions", () => {
  it("lists every final score of a series", () => {
    expect(resultOptions("BO1")).toEqual([[1, 0], [0, 1]]);
    expect(resultOptions("BO3")).toEqual([[2, 0], [2, 1], [1, 2], [0, 2]]);
    expect(resultOptions("BO2")).toEqual([[2, 0], [1, 1], [0, 2]]);
    expect(resultOptions("BO5")).toHaveLength(6);
  });
});
