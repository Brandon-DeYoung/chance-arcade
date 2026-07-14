import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceFlapper,
  circleIntersectsPolygon,
  collidingPegIndices,
  flapperPolygon,
  resolveFlapperAngle,
  segmentIndexAtFlapperTip,
} from "../app/flapper-physics.mjs";

const geometry = {
  pivot: { x: 500, y: 0 },
  flapperWidth: 70,
  flapperHeight: 188,
  wheelCenter: { x: 500, y: 690 },
  pegOrbit: 515,
  pegRadius: 7,
  pegCount: 50,
};

test("resolves the complete triangle outside the complete circular peg", () => {
  assert.ok(collidingPegIndices(0, 0, geometry).length > 0, "fixture begins with a visible overlap");
  const resolved = resolveFlapperAngle(0, 0, geometry);
  assert.equal(resolved.contact, true);
  assert.ok(resolved.angle < 0);
  assert.deepEqual(collidingPegIndices(resolved.angle, 0, geometry), []);
});

test("circle collision includes the outline and polygon edges", () => {
  const polygon = flapperPolygon(0, geometry);
  const tip = polygon[4];
  assert.equal(circleIntersectsPolygon({ x: tip.x, y: tip.y + 6.9 }, 7, polygon), true);
  assert.equal(circleIntersectsPolygon({ x: tip.x, y: tip.y + 7.1 }, 7, polygon), false);
});

test("substepped motion never allows a peg to tunnel through the flapper", () => {
  let state = { angle: 0, velocity: 0 };
  let sawContact = false;
  for (let rotation = -4; rotation <= 4; rotation += 0.15) {
    state = advanceFlapper(state, rotation, 90, 1 / 600, geometry, 330, 22);
    sawContact ||= state.contact;
    assert.deepEqual(collidingPegIndices(state.angle, rotation, geometry), [], `overlap at wheel rotation ${rotation.toFixed(2)}`);
  }
  assert.equal(sawContact, true);
});

test("winner follows the visible flapper tip when it deflects into a neighboring slice", () => {
  const selectedIndex = 23;
  const slice = 360 / geometry.pegCount;
  const centeredRotation = 360 - (selectedIndex * slice + slice / 2);

  assert.equal(segmentIndexAtFlapperTip(0, centeredRotation, geometry), selectedIndex);
  assert.equal(segmentIndexAtFlapperTip(-20, centeredRotation, geometry), selectedIndex + 1);
});
