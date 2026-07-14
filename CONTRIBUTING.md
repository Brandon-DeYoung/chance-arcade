# Contributing

Thanks for improving Random Selector Game Room. Keep changes local-first, dependency-light, and safe to share publicly.

## Development setup

Use Node.js 22.13.0, matching `.nvmrc` and `.node-version`:

```bash
npm ci
npm run dev
```

Vite prints the local development URL. Source changes reload automatically.

## Quality gates

Run the complete local gate before opening a pull request:

```bash
npm run check
```

This runs ESLint, TypeScript, the production build, unit and integration tests, and a production HTTP startup test. The startup test needs permission to bind a temporary localhost port.

To measure the fixed physics workload:

```bash
npm run benchmark
```

Compare the median with [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md). Run benchmarks on the same machine and Node version before drawing conclusions.

## Behavioral invariants

Changes must preserve these unless a pull request explicitly proposes a product change:

- Wheel selection remains uniform across the current eligible roster and matches the visibly selected slice.
- The wheel does not add a corrective lunge at the end of a programmed spin.
- Marble simulation uses a fixed 120 Hz physics step. Seeded test runs remain deterministic.
- Finished marbles do not pause the remaining race.
- The position board shows six active racers before a finish, then the podium plus the next three approaching, including the final-place edge cases.
- Roster exclusions apply to both games and survive export/import.
- Tool Booth Classic remains the checked-in default course.
- Normal gameplay remains contained to one browser viewport at common presentation sizes.

## Project structure

| Path | Purpose |
|---|---|
| `app/page.tsx` | Top-level screens, shared roster, text, presentation state, and local persistence |
| `app/wheel-game.tsx` | Canvas wheel, drag/spin motion, flapper collisions, and winner celebration |
| `app/race-game.tsx` | Race lifecycle, fixed-step animation loop, camera, standings, and results |
| `app/physics.ts` | Marble, rail, peg, spinner, cannon, and spatial-index physics |
| `app/level-editor.tsx` | Visual course editor and level/roster import/export |
| `app/members.ts` | Portable roster parsing, validation, eligibility, and serialization |
| `app/ui-text.json` | All intentionally customizable menu and wheel copy |
| `tests/` | Node test runner coverage, including production startup |

See [Architecture](docs/ARCHITECTURE.md) for data flow and design trade-offs.

## Adding tests

Use the built-in Node test runner. TypeScript tests run through `tsx`:

```bash
node --import tsx --test tests/selection.test.ts
```

Prefer behavior tests for parsers, selection, standings, and physics. Small source assertions are acceptable for presentation or accessibility wiring that would otherwise require a large browser-testing dependency.

## Privacy and public assets

- Never commit a real company roster, private portrait, credential, analytics identifier, or machine-specific absolute path.
- Use fictional names and geometric placeholders in examples.
- Keep local exports outside the repository or in the ignored `exports/` folder.
- Run `rg '/Users/|C:\\Users\\|BEGIN.*PRIVATE KEY|api[_-]?key|password'` before publishing a branch that changes examples or docs.

## Pull request checklist

- [ ] `npm run check` passes.
- [ ] `npm run benchmark` shows no unexplained regression for physics changes.
- [ ] Wheel and marble gameplay were checked at 1366×768.
- [ ] Presentation mode hides editing controls.
- [ ] Keyboard focus and reduced motion still work.
- [ ] No private names, portraits, paths, secrets, build output, or dependency folders are included.
- [ ] README or reference docs were updated for user-visible changes.
