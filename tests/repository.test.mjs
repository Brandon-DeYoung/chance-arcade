import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("production build is a portable browser application", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /<title>Random Selector Game Room<\/title>/i);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /assets\/index-.*\.js/);
  assert.match(html, /assets\/index-.*\.css/);
});

test("the public repository contains only safe sample portraits", async () => {
  const portraits = await readdir(new URL("../public/portraits/", import.meta.url));
  assert.ok(portraits.length >= 6);
  assert.ok(portraits.every((name) => name.startsWith("avatar-") && name.endsWith(".svg")));
  assert.ok(portraits.every((name) => !name.endsWith(".jpg") && !name.endsWith(".jpeg")));
});

test("legacy hosting, database, and old game remnants are absent", async () => {
  const [packageSource, css] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(packageSource, /cloudflare|drizzle|next|tailwind|vinext|wrangler/i);
  assert.doesNotMatch(css, /plinko|mini-claw|mini-pinball|wheel-winner-card/);
});

test("presentation mode hides editing entry points", async () => {
  const [page, lobby, wheel, race] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/game-lobby.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/wheel-game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/race-game.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(page, /is-presenting/);
  assert.match(lobby, /!presentation/);
  assert.match(wheel, /!presentation/);
  assert.match(race, /!presentation && <button onClick=\{onEdit\}/);
});

test("wheel keeps the no-lunge motion and 116 pixel default flapper", async () => {
  const wheel = await readFile(new URL("../app/wheel-game.tsx", import.meta.url), "utf8");
  assert.match(wheel, /DEFAULT_FLAPPER_LENGTH = 116/);
  assert.match(wheel, /quadratic ease-out/);
  assert.doesNotMatch(wheel, /velocity \+= remaining|inDetent/);
});
