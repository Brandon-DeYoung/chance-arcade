import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultRosterDocument } from "../app/default-roster";
import { buildRaceRoster, createRandomMember, parseRoster, parseRosterDocument, PLACEHOLDER_PORTRAITS, RANDOM_NAME_PARTS, serializeRoster } from "../app/members";

test("default roster contains fictional sample people and local placeholders", () => {
  const roster = createDefaultRosterDocument();
  assert.equal(roster.members.length, 12);
  assert.equal(roster.excluded.size, 0);
  assert.ok(roster.members.every((member) => member.name));
  assert.ok(roster.members.filter((member) => member.image).every((member) => member.image?.startsWith("/portraits/avatar-")));
});

test("roster import accepts names, nicknames, images, eligibility, and simple arrays", () => {
  const imported = parseRosterDocument('{"version":1,"members":[{"name":"Alex Example","nickname":"Alex","image":"/portraits/alex.jpg","eligible":false}]}');
  assert.deepEqual(imported.members, [{ name: "Alex Example", nickname: "Alex", image: "/portraits/alex.jpg" }]);
  assert.deepEqual([...imported.excluded], ["Alex Example"]);
  assert.deepEqual(parseRoster('["Alex","Jordan"]'), [{ name: "Alex" }, { name: "Jordan" }]);
});

test("roster editing round-trips removals, nicknames, portraits, and eligibility", () => {
  const members = [{ name: "Alex Example", nickname: "Alex", image: "/portraits/alex.jpg" }, { name: "Jordan Example" }];
  const exported = serializeRoster(members.slice(0, 1), new Set(["Alex Example"]));
  const imported = parseRosterDocument(exported);
  assert.deepEqual(imported.members, members.slice(0, 1));
  assert.deepEqual([...imported.excluded], ["Alex Example"]);
});

test("roster import rejects malformed, empty, duplicate, oversized, and unsupported files", () => {
  assert.throws(() => parseRoster("{"), /valid JSON/i);
  assert.throws(() => parseRoster("[]"), /at least one/i);
  assert.throws(() => parseRoster('[{"name":"Alex"},{"name":"alex"}]'), /duplicate/i);
  assert.throws(() => parseRoster('{"version":2,"members":["Alex"]}'), /unsupported/i);
  assert.throws(() => parseRoster(JSON.stringify(Array.from({ length: 101 }, (_, index) => `Person ${index}`))), /up to 100/i);
});

test("course tests can expand a smaller roster to 100 neutral marbles", () => {
  const racers = buildRaceRoster([{ name: "Sample Person" }], 100);
  assert.equal(racers.length, 100);
  assert.equal(racers[0].name, "Sample Person");
  assert.equal(racers[99].name, "Test Marble 100");
  assert.equal(buildRaceRoster([{ name: "Sample Person" }], 150).length, 100);
});

test("random people use two different supplied name parts and a bundled portrait", () => {
  const first = createRandomMember([], () => 0);
  assert.equal(first.name, "Abbott Avery");
  assert.equal(first.image, PLACEHOLDER_PORTRAITS[0]);
  const [given, family] = first.name.split(" ");
  assert.ok(RANDOM_NAME_PARTS.includes(given as never));
  assert.ok(RANDOM_NAME_PARTS.includes(family as never));
  assert.notEqual(given, family);
});

test("random people never duplicate an existing generated name", () => {
  const existing = [{ name: "Abbott Avery" }];
  assert.equal(createRandomMember(existing, () => 0).name, "Abbott Bailey");
});
