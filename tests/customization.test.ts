import assert from "node:assert/strict";
import test from "node:test";
import { mergeUiText } from "../app/page";

test("partial text customization preserves every unspecified default", () => {
  const merged = mergeUiText({ mainMenu: { titleFirstLine: "Pick a person" } } as never);
  assert.equal(merged.mainMenu.titleFirstLine, "Pick a person");
  assert.equal(merged.mainMenu.wheel.name, "Decision Wheel");
  assert.equal(merged.wheelScreen.spinButton, "SPIN THE WHEEL");
});
