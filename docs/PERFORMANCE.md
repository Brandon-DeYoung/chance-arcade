# Performance report

Measurements were taken before and after the refactor on the same local machine on July 14, 2026. Both physics runs used Node.js 26.5.0 because that was the installed test runtime; the repository pins Node.js 22.13.0 for supported use. Browser timings came from the same headless Chromium session against a local production server.

## Results

| Measurement | Before | After | Change |
|---|---:|---:|---:|
| 100 marbles, 30 simulated seconds, median of 5 | 1,043.3 ms | 744.5 ms | **28.6% faster** |
| Bundler-reported production build | ~977 ms | 115 ms | **88.2% faster** |
| JavaScript transfer | 2,670,590 B | 83,342 B | **96.9% smaller** |
| CSS transfer | 64,945 B | 9,506 B | **85.4% smaller** |
| Page resource transfer, excluding HTML | 2,890,947 B | 92,848 B | **96.8% smaller** |
| Page resource requests, excluding HTML | 88 | 2 | **86 fewer** |
| Local navigation total | 67 ms | 40 ms | **40.3% faster** |
| Local TTFB | 46 ms | 7 ms | **84.8% faster** |
| Installed dependency directory | 778 MB | 157 MB | **79.8% smaller** |
| Bundled public portraits | 2.1 MB private photos | 40 KB total public assets | Private data removed |

Browser transfer values reflect compressed HTTP transfer reported by the Performance API. Build timing uses the bundler’s own output, not shell startup overhead. Local navigation numbers are useful for regression comparison, not predictions of hosted internet performance.

## Reproduce the physics measurement

```bash
npm ci
npm run benchmark
```

The benchmark creates 100 deterministic marbles on Tool Booth Classic, releases them, advances 3,600 fixed physics steps, repeats five times, and prints every run plus the median.

## Reproduce the build and startup checks

```bash
npm run lint
npm test
```

Verified final output:

- ESLint: pass with no warnings.
- TypeScript: pass with strict checking.
- Production build: pass, 39 modules transformed.
- Automated tests: 33 passed, 0 failed.
- Production startup: Vite preview served HTTP 200 from localhost.
- Browser QA: no console errors on lobby, roster editor, wheel spin and celebration, live marble race, winner continuation, presentation mode, or level editor.
- Layout QA at 1366×768: document `scrollHeight` equaled `clientHeight` on the lobby, wheel, and race screens.

## What changed

- Replaced the server/Worker build chain with a static Vite React build.
- Added spatial indexes for static collisions and marble pairs.
- Cached waiting-ring layouts, portrait crop dimensions, and the marble shine texture.
- Batched image-load state updates.
- Moved standings sorting to the existing 140 ms HUD interval instead of every animation frame.
- Culled off-camera track objects and marbles during drawing.
- Removed unused dependencies, generated output, private images, and obsolete styles.

## Regression budget

For comparable local runs, investigate changes that increase the physics median by more than 10%, JavaScript gzip size above 100 KB, or production resource count above five without a user-facing reason.
