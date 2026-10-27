import { describe, expect, it } from "vitest";
import { niceTicks } from "../ticks";

describe("niceTicks", () => {
  it("covers the maximum with round steps", () => {
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(1234)).toEqual([0, 500, 1000, 1500]);
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
  });

  it("never steps below one, since the counts are whole", () => {
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(1)).toEqual([0, 1]);
  });

  it("gives an empty chart an axis", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
