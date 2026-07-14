import assert from "node:assert/strict";
import test from "node:test";
import { mergeUiText } from "../app/page";

test("partial text customization preserves every unspecified default", () => {
  const merged = mergeUiText({ mainMenu: { titleFirstLine: "Pick a person" } } as never);
  assert.equal(merged.mainMenu.titleFirstLine, "Pick a person");
  assert.equal(merged.mainMenu.wheel.name, "Decision Wheel");
  assert.equal(merged.wheelScreen.spinButton, "SPIN THE WHEEL");
});

test("former defaults migrate without replacing custom wording", () => {
  const migrated = mergeUiText({
    mainMenu: { titleFirstLine: "Who’s up next?", wheel: { name: "Wheel of Deals" } },
    wheelScreen: { wheelLabel: "Random name Wheel of Deals picker", promptFirstLine: "Custom prompt" },
  } as never);
  assert.equal(migrated.mainMenu.titleFirstLine, "Up next!");
  assert.equal(migrated.mainMenu.wheel.name, "Decision Wheel");
  assert.equal(migrated.wheelScreen.wheelLabel, "Random name Decision Wheel picker");
  assert.equal(migrated.wheelScreen.promptFirstLine, "Custom prompt");
});
