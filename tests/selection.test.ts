import assert from "node:assert/strict";
import test from "node:test";
import { selectRandomIndex } from "../app/selection";

test("wheel selection is deterministic with an injected random source", () => {
  assert.equal(selectRandomIndex(10, () => 0), 0);
  assert.equal(selectRandomIndex(10, () => .42), 4);
  assert.equal(selectRandomIndex(10, () => .999999), 9);
});

test("wheel selection gives every participant an equal interval", () => {
  const counts = Array.from({ length: 10 }, () => 0);
  for (let index = 0; index < 10_000; index += 1) counts[selectRandomIndex(10, () => (index + .5) / 10_000)] += 1;
  assert.deepEqual(counts, Array.from({ length: 10 }, () => 1_000));
});

test("wheel selection rejects an empty eligible roster", () => {
  assert.throws(() => selectRandomIndex(0, () => .5), /at least one/i);
});
