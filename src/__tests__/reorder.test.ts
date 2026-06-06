import { describe, it, expect } from "vitest";
import {
  reorder,
  getDropIndex,
  normalizeInsertIndex,
  moveBetween,
} from "../reorder";

describe("reorder", () => {
  it("moves an item forward", () => {
    expect(reorder(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item backward", () => {
    expect(reorder(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("is a no-op when from === to", () => {
    const input = ["a", "b", "c"];
    expect(reorder(input, 1, 1)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the original array", () => {
    const input = ["a", "b", "c"];
    const out = reorder(input, 0, 2);
    expect(input).toEqual(["a", "b", "c"]);
    expect(out).not.toBe(input);
  });

  it("clamps out-of-range indices", () => {
    expect(reorder(["a", "b", "c"], -5, 99)).toEqual(["b", "c", "a"]);
    expect(reorder(["a", "b", "c"], 99, -5)).toEqual(["c", "a", "b"]);
  });

  it("handles an empty list", () => {
    expect(reorder([], 0, 1)).toEqual([]);
  });

  it("works with object items by reference identity", () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const c = { id: 3 };
    const out = reorder([a, b, c], 2, 0);
    expect(out).toEqual([c, a, b]);
    expect(out[0]).toBe(c);
  });
});

describe("getDropIndex", () => {
  // Three items: tops 0, 100, 200; each 100 tall (midpoints 50, 150, 250).
  const tops = [0, 100, 200];
  const heights = [100, 100, 100];

  it("returns 0 above the first midpoint", () => {
    expect(getDropIndex(tops, heights, 10)).toBe(0);
  });

  it("returns 1 between first and second midpoints", () => {
    expect(getDropIndex(tops, heights, 120)).toBe(1);
  });

  it("returns 2 between second and third midpoints", () => {
    expect(getDropIndex(tops, heights, 220)).toBe(2);
  });

  it("returns the end index past the last midpoint", () => {
    expect(getDropIndex(tops, heights, 999)).toBe(3);
  });
});

describe("normalizeInsertIndex", () => {
  it("shifts the insert index when dropping after the source", () => {
    expect(normalizeInsertIndex(1, 3)).toBe(2);
  });

  it("leaves the insert index when dropping before the source", () => {
    expect(normalizeInsertIndex(3, 1)).toBe(1);
  });

  it("leaves the insert index when equal", () => {
    expect(normalizeInsertIndex(2, 2)).toBe(2);
  });
});

describe("moveBetween", () => {
  it("moves an item from source into destination", () => {
    const out = moveBetween(["a", "b"], ["x"], 0, 1);
    expect(out.source).toEqual(["b"]);
    expect(out.destination).toEqual(["x", "a"]);
  });

  it("inserts at the requested destination index", () => {
    const out = moveBetween(["a", "b", "c"], ["x", "y"], 1, 0);
    expect(out.source).toEqual(["a", "c"]);
    expect(out.destination).toEqual(["b", "x", "y"]);
  });

  it("inserts at the end when toIndex equals destination length", () => {
    const out = moveBetween(["a"], ["x", "y"], 0, 2);
    expect(out.destination).toEqual(["x", "y", "a"]);
  });

  it("does not mutate either input array", () => {
    const src = ["a", "b"];
    const dest = ["x"];
    moveBetween(src, dest, 0, 1);
    expect(src).toEqual(["a", "b"]);
    expect(dest).toEqual(["x"]);
  });

  it("clamps an out-of-range source index", () => {
    const out = moveBetween(["a", "b", "c"], [], 99, 0);
    expect(out.source).toEqual(["a", "b"]);
    expect(out.destination).toEqual(["c"]);
  });

  it("clamps an out-of-range destination index", () => {
    const out = moveBetween(["a"], ["x"], 0, 99);
    expect(out.destination).toEqual(["x", "a"]);
  });

  it("returns inputs unchanged when the source is empty", () => {
    const out = moveBetween<string>([], ["x"], 0, 0);
    expect(out.source).toEqual([]);
    expect(out.destination).toEqual(["x"]);
  });

  it("moves into an empty destination", () => {
    const out = moveBetween(["a", "b"], [], 1, 0);
    expect(out.source).toEqual(["a"]);
    expect(out.destination).toEqual(["b"]);
  });

  it("preserves object identity when moving", () => {
    const a = { id: 1 };
    const out = moveBetween([a], [], 0, 0);
    expect(out.destination[0]).toBe(a);
  });
});
