import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { WINNER_TOAST_EXIT_MS, WINNER_TOAST_HOLD_MS } from "../app/race-game";

test("marble winner card waits five seconds before sliding away", () => {
  assert.equal(WINNER_TOAST_HOLD_MS, 5_000);
  assert.equal(WINNER_TOAST_EXIT_MS, 450);
  const source = readFileSync(new URL("../app/race-game.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(source, /winnerToastExiting \? "is-exiting"/);
  assert.match(css, /\.winner-toast\.is-exiting\{[^}]*translate\(calc\(-100% - 2rem\),-50%\)/);
});

test("marble course card omits the old pixel, spinner, and refresh-rate line", () => {
  const source = readFileSync(new URL("../app/race-game.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /level\.height\.toLocaleString\(\).*SPINNERS.*120HZ/);
});
