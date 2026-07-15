# Architecture

Chance Arcade is a static React application built by Vite. It has no server data, accounts, database, telemetry, or runtime network dependency. The browser owns game state, canvas animation, local persistence, and JSON import/export.

## Data flow

```text
default-roster.json ─┐
browser localStorage ├─> page.tsx ─> eligible roster ─┬─> Decision Wheel
roster import/export ┘                                └─> Marble Pursuit

default-level.json ─────> page.tsx ─> Level Editor ─────> Race physics
ui-text.json ───────────> page.tsx ─> in-app text editor ─> Menu + wheel
```

`app/page.tsx` is the shared state boundary. Both games receive the same eligible member list. The level editor works on a cloned level draft, and test races can add neutral marbles without mutating the roster.

## Runtime modules

- `members.ts` validates roster JSON, enforces 100-member limits and unique names, preserves eligibility, and exports a portable versioned document.
- `selection.ts` maps one uniform random sample to one eligible wheel index. Tests inject a deterministic random source.
- `wheel-game.tsx` draws the wheel on canvas, preselects a slice, applies a continuous quadratic slowdown, and simulates peg/flapper contact without a final correction.
- `physics.ts` advances marbles at 120 Hz with gravity, low-friction rails, pinball bumpers, rotating arms, cannons, marble collisions, and finish detection.
- `race-game.tsx` uses a fixed-step accumulator inside `requestAnimationFrame`, follows the leading unfinished marble, throttles React standings updates, and lets every marble finish.
- `track-drawing.ts` renders only track objects and marbles near the camera and caches portrait sizing plus the marble shine texture.
- `level-types.ts` treats imported files as untrusted input and validates every collection before replacing the current level.

## Performance design

Physics and rendering stay separate:

```text
requestAnimationFrame
  ├─ run zero or more fixed 1/120 s physics steps
  ├─ update standings at most every 140 ms
  └─ render one camera frame
```

Static rails and pegs are indexed into 256-pixel grid cells. Marble-pair checks use neighboring 96-pixel cells and retain original participant-index order, so distant pairs are skipped without changing seeded ordering. Waiting-ring layouts are cached by count and chamber geometry.

The canvas caps device-pixel scaling at 1.6 during races, skips off-camera track objects and finished marbles, batches portrait load completion into one React update, and pre-renders the repeated marble shine.

## Fairness and determinism

The wheel assigns equal-size intervals in `[0, 1)` to every eligible member. Its final result is read from the visible flapper tip, so the announcement matches the wheel display.

Marble Pursuit is a real physics race. `createBalls` randomly assigns release slots; tests pass a seeded random generator to reproduce simulations. The 120 Hz step is independent of display frame rate. Spatial candidates are processed in ascending original index order to preserve deterministic collision ordering.

## Persistence and failure behavior

Roster and wording changes use guarded local-storage helpers. If storage is blocked or full, the current session continues and the app shows an export warning. Missing portraits fall back to initials. Roster and level imports validate before mutating state. Unsupported full-screen APIs leave presentation mode active and show a nonfatal message.

## Presentation mode

Presentation mode is UI state, not a separate route. It removes roster, text, navigation, and level-editor entry points while retaining race controls and an unobtrusive exit button. Full screen is requested only from a user click; `P` toggles the mode without depending on browser full-screen support.

## Removed dependencies and dead code

The previous build used a server-oriented stack for a fully local client application. The refactor removed these direct dependencies:

| Removed | Reason |
|---|---|
| `next`, `vinext`, `react-server-dom-webpack`, `@vitejs/plugin-rsc` | No routing, server rendering, or server components are needed |
| `@cloudflare/vite-plugin`, `wrangler` | No Worker, D1, R2, or deployment binding is used |
| `drizzle-orm`, `drizzle-kit` | The app has no database |
| `tailwindcss`, `@tailwindcss/postcss` | The interface already uses authored CSS and no utility classes |
| `eslint-config-next` | Replaced with framework-neutral TypeScript, hooks, and accessibility lint rules |

Removed files and assets include the Worker entry point, database schema, migrations, hosting adapter, ChatGPT auth helper, Next layout/configuration, PostCSS configuration, generated Vinext/Wrangler output, 50 private portraits, the private default roster, and obsolete Plinko, claw, pinball, old winner-manager, and old wheel-modal styles.

## Trade-offs

The Vite output is a client-side application, so the initial HTML does not contain the game menu before JavaScript runs. That is acceptable for a local meeting tool and removes the server runtime entirely.

Canvas provides consistent physics visuals and high throughput but exposes less semantic detail than DOM elements. Controls, live winner announcements, standings, labels, and dialog content remain accessible DOM elements around the canvas.
